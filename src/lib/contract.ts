import { createWalletClient, http, publicActions, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// Use Base Sepolia for MVP/testing
const chain = baseSepolia;

// Relayer wallet for gasless minting
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY as `0x${string}` || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const account = privateKeyToAccount(RELAYER_PRIVATE_KEY);

const client = createWalletClient({
  account,
  chain,
  transport: http(process.env.BASE_RPC_URL || 'https://sepolia.base.org')
}).extend(publicActions);

const INFT_CONTRACT_ADDRESS = process.env.INFT_CONTRACT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000';

const abi = parseAbi([
  'function mintAgent(address to, string calldata cid) external returns (uint256)',
]);

export async function mintAgentNFT(userAddress: `0x${string}`, cid: string): Promise<{ txHash: string, tokenId: number }> {
  console.log(`[Contract] Minting iNFT to ${userAddress} with CID ${cid}...`);
  
  if (!process.env.INFT_CONTRACT_ADDRESS || INFT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.warn('INFT_CONTRACT_ADDRESS is not set. Returning mock transaction.');
    return {
      txHash: '0x' + Math.random().toString(16).slice(2, 66).padEnd(64, '0'),
      tokenId: Math.floor(Math.random() * 10000)
    };
  }

  try {
    const { request } = await client.simulateContract({
      address: INFT_CONTRACT_ADDRESS,
      abi,
      functionName: 'mintAgent',
      args: [userAddress, cid],
    });

    const txHash = await client.writeContract(request);
    
    // Wait for receipt
    await client.waitForTransactionReceipt({ hash: txHash });
    
    const tokenId = 1; // mocked for now

    console.log(`[Contract] Mint successful! Tx: ${txHash}`);
    return { txHash, tokenId };
  } catch (error) {
    console.error('Error minting agent iNFT:', error);
    throw new Error('Failed to mint iNFT');
  }
}
