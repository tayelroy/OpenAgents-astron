import { ethers } from 'ethers';

const ENS_REGISTRY_ABI = [
  'function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)',
];

const ENS_PUBLIC_RESOLVER_ABI = ['function setAddr(bytes32 node, address addr)'];

function normalizeLabel(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function buildAgentEnsName(handle: string, parentName = 'astron.eth') {
  const cleanHandle = normalizeLabel(handle);

  if (!cleanHandle) {
    throw new Error('Cannot build ENS name from an empty handle');
  }

  return `${cleanHandle}.${parentName.toLowerCase()}`;
}

export async function mintAgentEnsSubdomain(params: {
  handle: string;
  ownerAddress: `0x${string}`;
  resolverAddress: `0x${string}`;
  registryAddress: `0x${string}`;
  rpcUrl: string;
  privateKey: string;
  parentName?: string;
}) {
  const { handle, ownerAddress, resolverAddress, registryAddress, rpcUrl, privateKey, parentName = 'astron.eth' } = params;

  if (!rpcUrl) {
    throw new Error('ENS_RPC_URL is required to mint an ENS subdomain');
  }

  if (!privateKey) {
    throw new Error('ENS_PRIVATE_KEY or RELAYER_PRIVATE_KEY is required to mint an ENS subdomain');
  }

  const ensName = buildAgentEnsName(handle, parentName);
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const registry = new ethers.Contract(registryAddress, ENS_REGISTRY_ABI, wallet);
  const resolver = new ethers.Contract(resolverAddress, ENS_PUBLIC_RESOLVER_ABI, wallet);

  const node = ethers.namehash(parentName);
  const label = ethers.id(normalizeLabel(handle));
  const subnode = ethers.namehash(ensName);

  const setSubnodeTx = await registry.setSubnodeRecord(node, label, ownerAddress, resolverAddress, 0);
  await setSubnodeTx.wait();

  const setAddrTx = await resolver.setAddr(subnode, ownerAddress);
  await setAddrTx.wait();

  return {
    ens: ensName,
    registryTxHash: setSubnodeTx.hash as string,
    resolverTxHash: setAddrTx.hash as string,
  };
}