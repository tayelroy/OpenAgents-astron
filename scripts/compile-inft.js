const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.join(process.cwd(), 'contracts', 'INFT.sol');

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
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImport }));

if (output.errors) {
  const fatal = output.errors.filter((e) => e.severity === 'error');
  output.errors.forEach((err) => console.error(err.formattedMessage));
  if (fatal.length > 0) process.exit(1);
}

const contract = output.contracts['INFT.sol'].INFT;

const artifact = {
  abi: contract.abi,
  bytecode: contract.evm.bytecode.object,
};

const outDir = path.join(process.cwd(), 'artifacts');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'INFT.json'), JSON.stringify(artifact, null, 2));

console.log('Wrote artifacts/INFT.json');