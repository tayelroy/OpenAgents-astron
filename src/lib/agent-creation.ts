import { scrapeTweets } from './twitter';
import { synthesizePersona } from './persona';
import { uploadTo0G } from './storage';
import { saveAgent } from './agent-records';
import { saveScrapeArtifact } from './scrape-artifacts';
import { buildAgentEnsName, mintAgentEnsSubdomain } from './ens';
import type { StyleProfile } from './style-profile';

const ZERO_G_EXPLORER_URL = process.env.NEXT_PUBLIC_ZERO_G_EXPLORER_URL ?? 'https://chainscan-galileo.0g.ai';

export function buildBrainPackage(params: {
  handle: string;
  persona: Awaited<ReturnType<typeof synthesizePersona>>;
  tweets: { text: string }[];
  styleProfile?: StyleProfile;
  ens: string;
  ownerAddress: string;
}) {
  const { handle, persona, tweets, styleProfile, ens, ownerAddress } = params;

  return {
    manifest: {
      version: '1.1',
      kind: 'astron.brain-package',
      handle,
      ens,
      createdAt: new Date().toISOString(),
    },
    persona,
    /**
     * Structured style profile extracted from the author's full tweet set.
     * Stored alongside the persona so that agents created from a brain CID
     * automatically inherit voice/style guidance.
     */
    styleProfile,
    memory: {
      summary: persona.persona,
      recentTweets: tweets.slice(0, 25),
      totalTweetsAnalyzed: tweets.length,
      knowledge: [],
    },
    metadata: {
      ownerAddress,
      handle,
      source: 'twitter-api',
      references: {
        persona: 'inline',
        memory: 'inline',
        tweets: 'inline',
        styleProfile: styleProfile ? 'inline' : 'none',
      },
    },
  };
}

export type CreateAgentPipelineInput = {
  handle?: string;
  userAddress?: string;
};

export async function createAgentPipeline(input: CreateAgentPipelineInput) {
  const { handle, userAddress } = input;

  if (!handle || typeof handle !== 'string' || handle.trim().length === 0) {
    throw new Error('Missing or invalid handle');
  }

  const cleanHandle = handle.trim().replace(/^@/, '');

  console.log(`[create-agent] Step 1 — scraping tweets for @${cleanHandle}`);
  const { tweets, verification } = await scrapeTweets(cleanHandle, 1);
  saveScrapeArtifact({
    handle: cleanHandle,
    tweets,
    verification,
    createdAt: new Date().toISOString(),
  });

  if (!tweets || tweets.length === 0) {
    throw new Error(`No public tweets found for @${cleanHandle}. Cannot synthesize a persona.`);
  }

  const computeModel = process.env.ZERO_G_COMPUTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4-mini';
  console.log(`[create-agent] Step 2 — synthesizing persona with compute model="${computeModel}" from ${tweets.length} tweet(s)`);

  const persona = await synthesizePersona(cleanHandle, tweets);
  console.log(`[create-agent] Step 2 — persona synthesized (${(JSON.stringify(persona).length / 1024).toFixed(1)} KB)`);

  if (!userAddress || typeof userAddress !== 'string' || !userAddress.startsWith('0x')) {
    throw new Error('A valid wallet address is required to mint the iNFT onchain');
  }

  const ens = buildAgentEnsName(cleanHandle);
  const resolverAddress = process.env.ENS_PUBLIC_RESOLVER_ADDRESS as `0x${string}` | undefined;
  const registryAddress = process.env.ENS_REGISTRY_ADDRESS as `0x${string}` | undefined;
  const rpcUrl = process.env.ENS_RPC_URL ?? process.env.ZERO_G_CHAIN_RPC_URL ?? '';
  const privateKey = process.env.ENS_PRIVATE_KEY ?? process.env.RELAYER_PRIVATE_KEY ?? '';

  if (!resolverAddress || !registryAddress) {
    throw new Error('ENS_PUBLIC_RESOLVER_ADDRESS and ENS_REGISTRY_ADDRESS must be configured to mint an ENS subdomain');
  }

  // Attach the style profile (if present) onto the persona before storing.
  const brainPackage = buildBrainPackage({
    handle: cleanHandle,
    persona,
    tweets,
    styleProfile: persona.styleProfile,
    ens,
    ownerAddress: userAddress,
  });

  console.log(`[create-agent] Step 3 — minting ENS subdomain ${ens}`);
  const ensResult = await mintAgentEnsSubdomain({
    handle: cleanHandle,
    ownerAddress: userAddress as `0x${string}`,
    resolverAddress,
    registryAddress,
    rpcUrl,
    privateKey,
  });

  const isSepolia = rpcUrl.includes('sepolia');
  const ensExplorerBaseUrl = isSepolia ? 'https://sepolia.etherscan.io' : ZERO_G_EXPLORER_URL;
  const registryTxLink = `${ensExplorerBaseUrl}/tx/${ensResult.registryTxHash}`;
  console.log(`[create-agent] Step 3 — ENS subdomain ${ens} registered.`);
  console.log(`[create-agent] Step 3 — 📝 Registry tx: ${ensResult.registryTxHash}`);
  console.log(`[create-agent] Step 3 — 🔗 View registry tx → ${registryTxLink}`);
  if (ensResult.resolverTxHash) {
    const resolverTxLink = `${ensExplorerBaseUrl}/tx/${ensResult.resolverTxHash}`;
    console.log(`[create-agent] Step 3 — 📝 Resolver tx: ${ensResult.resolverTxHash}`);
    console.log(`[create-agent] Step 3 — 🔗 View resolver tx → ${resolverTxLink}`);
  }

  console.log(`[create-agent] Step 4 — uploading brain JSON bundle to 0G Storage`);
  const cid = await uploadTo0G(brainPackage);
  const storageExplorerLink = `${ZERO_G_EXPLORER_URL}/api/contract/ipfs?dataId=${encodeURIComponent(cid)}`;
  console.log(`[create-agent] Step 4 — 0G Storage upload complete. CID: ${cid}`);
  console.log(`[create-agent] Step 4 — 📦 Storage preview → ${storageExplorerLink}`);

  console.log(`[create-agent] Step 5 — persisting agent record for @${cleanHandle}`);
  const now = new Date().toISOString();

  saveAgent({
    handle: cleanHandle,
    tokenId: 0,
    cid,
    ownerAddress: userAddress,
    txHash: ensResult.registryTxHash,
    persona,
    ens,
    createdAt: now,
    updatedAt: now,
    scrapeVerification: verification,
  });

  return {
    success: true,
    handle: cleanHandle,
    tokenId: 0,
    cid,
    txHash: ensResult.registryTxHash,
    ens,
    ensTxHash: ensResult.registryTxHash,
    persona,
    mintFeeRequired: true,
    references: {
      compute: process.env.ZERO_G_COMPUTE_MODEL || process.env.OPENAI_MODEL || 'gpt-5.4-mini',
      storageCid: cid,
      ensTxHash: ensResult.registryTxHash,
    },
    scrape: verification,
  };
}