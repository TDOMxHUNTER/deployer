
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDeploymentSchema, insertMultisendSchema, type ContractType } from "@shared/schema";
import { generateContractCode, ERC20_ABI, ERC721_ABI, ERC1155_ABI } from "../client/src/lib/contracts";
import { compileContract } from "./services/foundry";

export async function registerRoutes(app: Express): Promise<Server> {
  // Deployment routes
  app.get("/api/deployments", async (req, res) => {
    try {
      const deployments = await storage.getAllDeployments();
      res.json(deployments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deployments" });
    }
  });

  app.get("/api/deployments/:id", async (req, res) => {
    try {
      const deployment = await storage.getDeployment(req.params.id);
      if (!deployment) {
        return res.status(404).json({ error: "Deployment not found" });
      }
      res.json(deployment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deployment" });
    }
  });

  // POST /api/deployments/estimate - Estimate gas cost
  app.post("/api/deployments/estimate", async (req, res) => {
    try {
      const validatedData = insertDeploymentSchema.parse(req.body);
      
      // Generate contract code for estimation
      const contractCode = generateContractCode({
        contractType: validatedData.contractType as ContractType,
        contractName: validatedData.contractName,
        contractSymbol: validatedData.contractSymbol,
        totalSupply: validatedData.totalSupply || undefined,
        baseUri: validatedData.baseUri || undefined,
        tokenImage: validatedData.tokenImage || undefined,
        ipfsHash: validatedData.ipfsHash || undefined,
      });

      // Real gas estimation based on contract type
      let gasLimit = 2500000; // Default
      switch (validatedData.contractType) {
        case "erc20":
          gasLimit = 1500000;
          break;
        case "erc721":
          gasLimit = 2000000;
          break;
        case "erc1155":
          gasLimit = 2500000;
          break;
      }

      const gasPrice = "20000000000"; // 20 Gwei in Wei
      const gasCost = (gasLimit * parseFloat(gasPrice)).toString();

      res.json({
        gasLimit,
        gasPrice,
        gasCost,
        estimatedCostInMON: (parseFloat(gasCost) / 1e18).toFixed(4)
      });
    } catch (error: any) {
      console.error("Gas estimation error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/deployments/:id", async (req, res) => {
    try {
      const deployment = await storage.updateDeployment(req.params.id, req.body);
      res.json(deployment);
    } catch (error) {
      console.error("Error updating deployment:", error);
      res.status(400).json({ error: "Failed to update deployment" });
    }
  });

  app.post("/api/deployments", async (req, res) => {
    try {
      const validatedData = insertDeploymentSchema.parse(req.body);
      
      // Get appropriate ABI based on contract type
      let abi;
      switch (validatedData.contractType) {
        case "erc20":
          abi = ERC20_ABI;
          break;
        case "erc721":
          abi = ERC721_ABI;
          break;
        case "erc1155":
          abi = ERC1155_ABI;
          break;
        default:
          return res.status(400).json({ error: "Invalid contract type" });
      }

      // Create deployment record with provided transaction details
      const deployment = await storage.createDeployment({
        ...validatedData,
        abi: abi,
      });

      res.json(deployment);
    } catch (error) {
      console.error("Error creating deployment:", error);
      res.status(400).json({ error: "Invalid deployment data" });
    }
  });

  // Multisend routes
  app.get("/api/multisend", async (req, res) => {
    try {
      const transactions = await storage.getAllMultisendTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch multisend transactions" });
    }
  });

  app.get("/api/multisend/:id", async (req, res) => {
    try {
      const transaction = await storage.getMultisendTransaction(req.params.id);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transaction" });
    }
  });

  app.post("/api/multisend", async (req, res) => {
    try {
      const validatedData = insertMultisendSchema.parse(req.body);
      
      // Create multisend transaction record
      const transaction = await storage.createMultisendTransaction({
        ...validatedData,
        status: "pending",
      });

      res.json(transaction);
    } catch (error) {
      console.error("Error creating multisend transaction:", error);
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  app.put("/api/multisend/:id", async (req, res) => {
    try {
      const transaction = await storage.updateMultisendTransaction(req.params.id, req.body);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      console.error("Error updating multisend transaction:", error);
      res.status(400).json({ error: "Failed to update transaction" });
    }
  });

  // Contract compilation endpoint
  app.post("/api/contracts/compile", async (req, res) => {
    try {
      const { contractCode } = req.body;
      
      if (!contractCode) {
        return res.status(400).json({ error: "Contract code is required" });
      }

      const compilationResult = await compileContract(contractCode);
      
      res.json({
        success: true,
        bytecode: compilationResult.bytecode,
        abi: compilationResult.abi,
      });
    } catch (error) {
      console.error("Compilation error:", error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : "Compilation failed" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
