import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const deployments = pgTable("deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractType: text("contract_type").notNull(), // 'erc20' | 'erc721' | 'erc1155'
  contractName: text("contract_name").notNull(),
  contractSymbol: text("contract_symbol").notNull(),
  totalSupply: text("total_supply"), // For ERC-20
  baseUri: text("base_uri"), // For ERC-721/1155
  tokenImage: text("token_image"), // Image URL or IPFS link
  ipfsHash: text("ipfs_hash"), // IPFS metadata hash
  contractAddress: text("contract_address"),
  transactionHash: text("transaction_hash"),
  deployerAddress: text("deployer_address").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'deployed' | 'failed'
  constructorArgs: jsonb("constructor_args"),
  compiledBytecode: text("compiled_bytecode"),
  abi: jsonb("abi"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const multisendTransactions = pgTable("multisend_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderAddress: text("sender_address").notNull(),
  recipients: jsonb("recipients").notNull(), // Array of {address: string, amount: string}
  totalAmount: text("total_amount").notNull(),
  tokenType: text("token_type").default("native"), // 'native' | 'erc20'
  tokenAddress: text("token_address"), // For ERC-20 tokens
  tokenSymbol: text("token_symbol").default("MON"),
  transactionHash: text("transaction_hash"),
  transactionHashes: jsonb("transaction_hashes"), // Array of transaction hashes
  failedAddresses: jsonb("failed_addresses"), // Array of failed addresses
  status: text("status").notNull().default("pending"), // 'pending' | 'confirmed' | 'failed' | 'partially_failed'
  gasUsed: text("gas_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDeploymentSchema = createInsertSchema(deployments).omit({
  id: true,
  createdAt: true,
});

export const insertMultisendSchema = createInsertSchema(multisendTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;

export type InsertMultisend = z.infer<typeof insertMultisendSchema>;
export type MultisendTransaction = typeof multisendTransactions.$inferSelect;

export const contractTypes = ['erc20', 'erc721', 'erc1155'] as const;
export type ContractType = typeof contractTypes[number];

export const deploymentStatuses = ['pending', 'deployed', 'failed'] as const;
export type DeploymentStatus = typeof deploymentStatuses[number];
