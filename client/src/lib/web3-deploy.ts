import { deployContract } from "./web3";

export interface ClientDeploymentResult {
  address: string;
  transactionHash: string;
  blockNumber: number;
}

export async function deployContractClientSide(
  bytecode: string,
  abi: any[],
  constructorArgs: any[] = []
): Promise<ClientDeploymentResult> {
  try {
    const result = await deployContract(bytecode, abi, constructorArgs);

    return {
      address: result.address,
      transactionHash: result.transactionHash,
      blockNumber: 0, // Will be filled by network confirmation
    };
  } catch (error: any) {
    console.error("Deployment error:", error);
    throw new Error(`Deployment failed: ${error.message}`);
  }
}