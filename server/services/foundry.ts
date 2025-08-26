import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";
import Web3 from "web3";
import solc from "solc";

const execAsync = promisify(exec);

export interface DeploymentResult {
  address: string;
  transactionHash: string;
  bytecode: string;
}

// Initialize Web3 with Monad Testnet RPC
const web3 = new Web3('https://testnet-rpc.monad.xyz/');

export async function verifySignature(signature: string, message: string, deployerAddress: string): Promise<boolean> {
  try {
    const recoveredAddress = web3.eth.accounts.recover(message, signature);
    return recoveredAddress.toLowerCase() === deployerAddress.toLowerCase();
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

export async function compileContract(contractCode: string): Promise<{ bytecode: string; abi: any[] }> {
  try {
    // Extract contract name
    const contractNameMatch = contractCode.match(/contract\s+(\w+)/);
    const contractName = contractNameMatch ? contractNameMatch[1] : "Contract";
    
    // Prepare compilation input
    const input = {
      language: 'Solidity',
      sources: {
        [`${contractName}.sol`]: {
          content: contractCode,
        },
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['*'],
          },
        },
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    };

    // Import resolver for OpenZeppelin contracts
    function findImports(path: string) {
      try {
        if (path.startsWith('@openzeppelin/')) {
          const openzeppelinPath = join(process.cwd(), 'node_modules', path);
          if (existsSync(openzeppelinPath)) {
            return {
              contents: readFileSync(openzeppelinPath, 'utf8')
            };
          }
        }
        return { error: 'File not found' };
      } catch (error) {
        return { error: 'File not found' };
      }
    }

    // Compile the contract
    const compiledContract = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

    if (compiledContract.errors) {
      const errors = compiledContract.errors.filter((error: any) => error.severity === 'error');
      if (errors.length > 0) {
        throw new Error(`Compilation errors: ${errors.map((e: any) => e.message).join(', ')}`);
      }
    }

    const contract = compiledContract.contracts[`${contractName}.sol`][contractName];
    
    if (!contract) {
      throw new Error(`Contract ${contractName} not found in compilation output`);
    }

    return {
      bytecode: `0x${contract.evm.bytecode.object}`,
      abi: contract.abi,
    };

  } catch (error: any) {
    console.error("Compilation error:", error);
    throw new Error(`Compilation failed: ${error?.message || 'Unknown error'}`);
  }
}
