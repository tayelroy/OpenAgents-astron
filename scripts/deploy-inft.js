const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });
const { ethers } = require('ethers');
const solc = require('solc');

function findImport(importPath) {
  const nodeModulePath = path.join(process.cwd(), 'node_modules', importPath);
  if (fs.existsSync(nodeModulePath)) {
    return { contents: fs.readFileSync(nodeModulePath, 'utf8') };
  }

  const relativePath = path.join(process.cwd(), importPath);
  if (fs.existsSync(relativePath)) {
    return { contents: fs.readFileSync(relativePath, 'utf8') };
  }

  return { error: `File not found: ${importPath}` };
}

function compile() {
  const contractPath = path.join(process.cwd(), 'contracts', 'INFT.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'INFT.sol': { content: source },
    },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));
  if (output.errors) {
    const fatal = output.errors.filter((e) => e.severity === 'error');
    output.errors.forEach((err) => console.error(err.formattedMessage));
    if (fatal.length > 0) {
      throw new Error('Solidity compilation failed');
    }
  }

  return output.contracts['INFT.sol'].INFT;
}

async function main() {
  const rpcUrl = process.env.ZERO_G_CHAIN_RPC_URL;
  const privateKey = process.env.RELAYER_PRIVATE_KEY;
  const initialMintFee = process.env.INFT_MINT_FEE_WEI || '0';

  if (!rpcUrl) throw new Error('ZERO_G_CHAIN_RPC_URL is required');
  if (!privateKey) throw new Error('RELAYER_PRIVATE_KEY is required');

  const [deployer] = [new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(rpcUrl))];
  console.log('Deploying INFT with:', await deployer.getAddress());

  const contract = compile();
  const factory = new ethers.ContractFactory(contract.abi, contract.evm.bytecode.object, deployer);
  const inft = await factory.deploy(await deployer.getAddress(), initialMintFee);
  await inft.waitForDeployment();

  const address = await inft.getAddress();
  console.log('INFT deployed to:', address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});