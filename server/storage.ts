import { type Deployment, type InsertDeployment, type MultisendTransaction, type InsertMultisend } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Deployment methods
  getDeployment(id: string): Promise<Deployment | undefined>;
  getDeploymentsByAddress(deployerAddress: string): Promise<Deployment[]>;
  getAllDeployments(): Promise<Deployment[]>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeployment(id: string, updates: Partial<Deployment>): Promise<Deployment | undefined>;

  // Multisend methods
  getMultisendTransaction(id: string): Promise<MultisendTransaction | undefined>;
  getMultisendTransactionsByAddress(senderAddress: string): Promise<MultisendTransaction[]>;
  getAllMultisendTransactions(): Promise<MultisendTransaction[]>;
  createMultisendTransaction(transaction: InsertMultisend): Promise<MultisendTransaction>;
  updateMultisendTransaction(id: string, updates: Partial<MultisendTransaction>): Promise<MultisendTransaction | undefined>;
}

export class MemStorage implements IStorage {
  private deployments: Map<string, Deployment>;
  private multisendTransactions: Map<string, MultisendTransaction>;

  constructor() {
    this.deployments = new Map();
    this.multisendTransactions = new Map();
  }

  // Deployment methods
  async getDeployment(id: string): Promise<Deployment | undefined> {
    return this.deployments.get(id);
  }

  async getDeploymentsByAddress(deployerAddress: string): Promise<Deployment[]> {
    return Array.from(this.deployments.values()).filter(
      (deployment) => deployment.deployerAddress === deployerAddress
    );
  }

  async getAllDeployments(): Promise<Deployment[]> {
    return Array.from(this.deployments.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async createDeployment(insertDeployment: InsertDeployment): Promise<Deployment> {
    const id = randomUUID();
    const deployment: Deployment = {
      ...insertDeployment,
      totalSupply: insertDeployment.totalSupply || null,
      baseUri: insertDeployment.baseUri || null,
      tokenImage: insertDeployment.tokenImage || null,
      ipfsHash: insertDeployment.ipfsHash || null,
      contractAddress: null,
      transactionHash: null,
      constructorArgs: null,
      compiledBytecode: null,
      abi: null,
      id,
      status: "pending",
      createdAt: new Date(),
    };
    this.deployments.set(id, deployment);
    return deployment;
  }

  async updateDeployment(id: string, updates: Partial<Deployment>): Promise<Deployment | undefined> {
    const deployment = this.deployments.get(id);
    if (!deployment) return undefined;

    const updatedDeployment = { ...deployment, ...updates };
    this.deployments.set(id, updatedDeployment);
    return updatedDeployment;
  }

  // Multisend methods
  async getMultisendTransaction(id: string): Promise<MultisendTransaction | undefined> {
    return this.multisendTransactions.get(id);
  }

  async getMultisendTransactionsByAddress(senderAddress: string): Promise<MultisendTransaction[]> {
    return Array.from(this.multisendTransactions.values()).filter(
      (transaction) => transaction.senderAddress === senderAddress
    );
  }

  async getAllMultisendTransactions(): Promise<MultisendTransaction[]> {
    return Array.from(this.multisendTransactions.values()).sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async createMultisendTransaction(insertMultisend: InsertMultisend): Promise<MultisendTransaction> {
    const id = randomUUID();
    const transaction: MultisendTransaction = {
      ...insertMultisend,
      transactionHash: null,
      gasUsed: null,
      id,
      status: "pending",
      createdAt: new Date(),
    };
    this.multisendTransactions.set(id, transaction);
    return transaction;
  }

  async updateMultisendTransaction(id: string, updates: Partial<MultisendTransaction>): Promise<MultisendTransaction | undefined> {
    const transaction = this.multisendTransactions.get(id);
    if (!transaction) return undefined;

    const updatedTransaction = { ...transaction, ...updates };
    this.multisendTransactions.set(id, updatedTransaction);
    return updatedTransaction;
  }
}

export const storage = new MemStorage();