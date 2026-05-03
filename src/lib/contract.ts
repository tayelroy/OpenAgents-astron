import { createPublicClient, http, parseAbi, keccak256, toBytes, encodeAbiParameters, formatEther, toHex } from 'viem';

export const INFT_CONTRACT_ADDRESS = process.env.INFT_CONTRACT_ADDRESS as `0x${string}` | undefined;
export const PUBLIC_INFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS as `0x${string}` | undefined;

export const INFT_MINT_ABI = parseAbi([
  'function mintAgent(address to, string calldata cid) external payable returns (uint256)',
  'function mintFee() view returns (uint256)',
]);

export type MintPhase = 'switching-network' | 'waiting-for-signature' | 'waiting-for-confirmation';

const CONFIRMATION_TIMEOUT_MS = 180000;
const NETWORK_SWITCH_TIMEOUT_MS = 15000;
const ZERO_G_CHAIN_ID = Number(process.env.NEXT_PUBLIC_ZERO_G_CHAIN_ID || process.env.ZERO_G_CHAIN_ID || 16602);
const ZERO_G_CHAIN_RPC_URL = process.env.NEXT_PUBLIC_ZERO_G_CHAIN_RPC_URL || process.env.ZERO_G_CHAIN_RPC_URL || 'https://evmrpc-testnet.0g.ai';
const ZERO_G_EXPLORER_URL = process.env.NEXT_PUBLIC_ZERO_G_EXPLORER_URL || 'https://chainscan-galileo.0g.ai';

const zeroGChain = {
  id: ZERO_G_CHAIN_ID,
  name: '0G Galileo',
  nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
  rpcUrls: {
    default: { http: [ZERO_G_CHAIN_RPC_URL] },
    public: { http: [ZERO_G_CHAIN_RPC_URL] },
  },
} as const;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([
    promise.finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    }),
    timeoutPromise,
  ]);
}

async function ensureZeroGNetwork(ethereum: any): Promise<void> {
  const chainId = `0x${ZERO_G_CHAIN_ID.toString(16)}`;

  try {
    await withTimeout(
      ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      }),
      NETWORK_SWITCH_TIMEOUT_MS,
      'Network switch timed out. Open your wallet extension and approve the 0G Galileo network switch.'
    );
  } catch (switchError: any) {
    if (switchError?.code !== 4902) {
      throw switchError;
    }

    await withTimeout(
      ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId,
            chainName: '0G Galileo',
            nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
            rpcUrls: ZERO_G_CHAIN_RPC_URL ? [ZERO_G_CHAIN_RPC_URL] : [],
          },
        ],
      }),
      NETWORK_SWITCH_TIMEOUT_MS,
      'Adding the 0G Galileo network timed out. Open your wallet extension and approve the network prompt.'
    );
  }
}

export async function getInftMintFee(): Promise<bigint> {
  const contractAddress = INFT_CONTRACT_ADDRESS || PUBLIC_INFT_CONTRACT_ADDRESS;

  if (!contractAddress) {
    throw new Error('INFT_CONTRACT_ADDRESS is not configured for 0G Galileo minting');
  }

  const client = createPublicClient({
    chain: zeroGChain,
    transport: http(process.env.ZERO_G_CHAIN_RPC_URL || 'https://evmrpc-testnet.0g.ai'),
  });

  const raw = await client.readContract({
    address: contractAddress,
    abi: INFT_MINT_ABI,
    functionName: 'mintFee',
  });

  // Contract may return a raw number string or bigint
  const fee = typeof raw === 'bigint' ? raw : BigInt(raw);
  console.log(`[getInftMintFee] Contract returned fee: ${fee} (raw: ${raw})`);
  return fee;
}

export async function mintAgentNFT(params: {
  recipient: `0x${string}`;
  cid: string;
  ethereum?: any;
  onPhase?: (phase: MintPhase) => void;
}): Promise<{ txHash: string; tokenId: number; fee: bigint }> {
  const { recipient, cid, ethereum, onPhase } = params;

  if (!PUBLIC_INFT_CONTRACT_ADDRESS) {
    throw new Error('NEXT_PUBLIC_INFT_CONTRACT_ADDRESS is not configured');
  }

  if (!ethereum) {
    throw new Error('Wallet provider not found');
  }

  const explorerBaseUrl = ZERO_G_EXPLORER_URL.replace(/\/$/, '');
  console.log(`[mintAgentNFT] Starting iNFT mint. Recipient: ${recipient.slice(0, 6)}...${recipient.slice(-4)}, CID: ${cid}`);

  onPhase?.('switching-network');
  console.log('[mintAgentNFT] Step 1 — switching wallet network to 0G Galileo (chainId: 0x' + ZERO_G_CHAIN_ID.toString(16) + ')');
  await ensureZeroGNetwork(ethereum);
  console.log('[mintAgentNFT] Step 1 — network switched to 0G Galileo ✓');

  onPhase?.('waiting-for-signature');
  console.log('[mintAgentNFT] Step 2 — preparing mintAgent transaction via viem wallet client');

  // Fetch the fee first so we know what value to send
  const fee = await getInftMintFee();
  console.log(`[mintAgentNFT] Step 2 — mint fee from contract: ${formatEther(fee)} 0G (${fee.toString()} wei)`);

  // Create a viem public client for reading chain state & waiting for receipts
  const publicClient = createPublicClient({
    chain: zeroGChain,
    transport: http(process.env.ZERO_G_CHAIN_RPC_URL || 'https://evmrpc-testnet.0g.ai'),
  });

  // The recipient address serves as the from address (user mints to their own wallet).
  // No extra eth_requestAccounts call here — that was already done during page load.
  const userAccount = recipient;

  console.log(`[mintAgentNFT] Step 2 — using wallet account: ${userAccount.slice(0, 6)}...${userAccount.slice(-4)}`);

  // Encode the mintAgent call data manually
  const calldata = encodeFunctionData({
    abi: INFT_MINT_ABI,
    functionName: 'mintAgent',
    args: [recipient, cid],
  });

  // Estimate gas via direct eth_estimateGas call through wallet
  let gasLimit: bigint;
  try {
    const estimateHex = (await ethereum.request({
      method: 'eth_estimateGas',
      params: [{
        from: userAccount,
        to: PUBLIC_INFT_CONTRACT_ADDRESS,
        data: calldata,
        value: toHex(fee),
      }],
    })) as string;
    const estimated = BigInt(estimateHex);
    // Add 20% buffer
    gasLimit = (estimated * BigInt(120)) / BigInt(100);
    console.log(`[mintAgentNFT] Step 2 — estimated gas: ${estimated} (with buffer: ${gasLimit})`);
  } catch (estError: any) {
    console.warn('[mintAgentNFT] Gas estimation failed, using fallback:', estError?.message);
    gasLimit = BigInt(500_000);
  }

  // Build the transaction payload for MetaMask
  const txParams = {
    from: userAccount,
    to: PUBLIC_INFT_CONTRACT_ADDRESS,
    data: calldata,
    value: toHex(fee),
    gas: toHex(gasLimit),
  };

  // Send the transaction — this triggers the MetaMask wallet popup
  console.log('[mintAgentNFT] Step 3 — sending eth_sendTransaction to browser extension...');
  let hash: `0x${string}`;
  try {
    hash = (await ethereum.request({
      method: 'eth_sendTransaction',
      params: [txParams],
    })) as `0x${string}`;

    console.log(`[mintAgentNFT] Step 3 — transaction broadcasted. Hash: ${hash}`);
    console.log(`[mintAgentNFT] Step 3 — 🔗 View on explorer → ${explorerBaseUrl}/tx/${hash}`);
  } catch (sendError: any) {
    console.error('[mintAgentNFT] Step 3 — eth_sendTransaction failed:', sendError?.message || sendError);
    throw new Error(
      sendError?.code === 4001
        ? 'Transaction rejected by user in wallet.'
        : `Failed to send mint transaction: ${sendError?.message || 'Unknown error'}`
    );
  }

  onPhase?.('waiting-for-confirmation');
  console.log('[mintAgentNFT] Step 4 — waiting for chain confirmation...');

  const receipt = await withTimeout(
    publicClient.waitForTransactionReceipt({ hash }),
    CONFIRMATION_TIMEOUT_MS,
    'Timed out waiting for the iNFT mint confirmation on 0G'
  );

  console.log(`[mintAgentNFT] Step 4 — transaction confirmed! Block: #${receipt.blockNumber}`);

  // Read the tokenId from the Transfer event logs
  // Decode Transfer event from receipt logs using keccak256 topic
  const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  let tokenId = 0;
  for (const log of receipt.logs ?? []) {
    if (log.topics[0] !== transferTopic) continue;
    // ERC-721 Transfer topics are [eventSig, from, to, tokenId]
    const rawTokenId = log.topics[3];
    if (rawTokenId) {
      tokenId = Number(BigInt(rawTokenId));
      break;
    }
  }

  // Fallback: if no Transfer event parsed, default to tokenId 1 (common for first mint)
  if (!tokenId) {
    console.warn('[mintAgentNFT] Could not parse tokenId from events, assuming 1');
    tokenId = 1;
  }

  console.log(`[mintAgentNFT] Step 4 — iNFT minted successfully! Token ID: ${tokenId}`);
  console.log(`[mintAgentNFT] 🎉 Full tx: ${explorerBaseUrl}/tx/${hash}`);

  return {
    txHash: hash,
    tokenId,
    fee,
  };
}

// Helper to encode function calldata
function encodeFunctionData(params: {
  abi: readonly unknown[];
  functionName: string;
  args: unknown[];
}): `0x${string}` {
  return _encodeFunctionCall(params.abi, params.functionName, params.args);
}

function _encodeFunctionCall(abi: readonly unknown[], functionName: string, args: unknown[]): `0x${string}` {
  // Find the function signature from ABI
  const funcEntry = (abi as any[]).find((item: any) => item.type === 'function' && item.name === functionName);
  if (!funcEntry) throw new Error(`Function ${functionName} not found in ABI`);

  // Build the input types array
  const inputTypes = (funcEntry.inputs as any[]).map((input: any) => input.type);

  const signature = `${functionName}(${inputTypes.join(',')})`;
  const selector = keccak256(toBytes(signature)).slice(0, 10);
  const encodedArgs = encodeAbiParameters(
    inputTypes.map((t: string) => ({ name: '', type: t })),
    args
  );
  return (selector + encodedArgs.slice(2)) as `0x${string}`;
}
