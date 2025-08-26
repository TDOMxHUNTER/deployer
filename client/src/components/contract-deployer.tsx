
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Rocket, Code, History, Coins, Image, Layers3, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CodePreview from "@/components/code-preview";
import { generateContractCode } from "@/lib/contracts";
import { deployContractClientSide } from "@/lib/web3-deploy";
import type { ContractType, Deployment } from "@shared/schema";

export default function ContractDeployer() {
  const [contractType, setContractType] = useState<ContractType>("erc20");
  const [contractName, setContractName] = useState("");
  const [contractSymbol, setContractSymbol] = useState("");
  const [totalSupply, setTotalSupply] = useState("");
  const [baseUri, setBaseUri] = useState("");
  const [tokenImage, setTokenImage] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");

  const { toast } = useToast();

  // Fetch recent deployments
  const { data: deployments, isLoading: deploymentsLoading } = useQuery<Deployment[]>({
    queryKey: ["/api/deployments"],
  });

  // Deploy contract mutation
  const deployMutation = useMutation({
    mutationFn: async (deploymentData: any) => {
      // First get the compiled bytecode and ABI from the backend
      const contractCode = generateContractCode(deploymentData);
      const compileResponse = await apiRequest("POST", "/api/contracts/compile", {
        contractCode: contractCode
      });
      const compileResult = await compileResponse.json();

      if (!compileResult.success) {
        throw new Error("Contract compilation failed");
      }

      // Estimate gas cost using the compiled bytecode
      const estimateResponse = await apiRequest("POST", "/api/deployments/estimate", deploymentData);
      const estimate = await estimateResponse.json();

      // Show gas cost to user (convert from Wei to MON)
      const gasCostInMON = (parseFloat(estimate.gasCost) / 1e18).toFixed(4);
      const gasPrice = (parseFloat(estimate.gasPrice) / 1e9).toFixed(2); // Convert to Gwei

      const confirmed = confirm(
        `Deployment Cost Estimate:\n` +
        `Gas Limit: ${estimate.gasLimit.toLocaleString()}\n` +
        `Gas Price: ${gasPrice} Gwei\n` +
        `Total Cost: ~${gasCostInMON} MON\n\n` +
        `Continue with deployment?`
      );

      if (!confirmed) {
        throw new Error("Deployment cancelled by user");
      }

      // Prepare constructor arguments
      const constructorArgs = [];
      if (contractType === "erc20") {
        constructorArgs.push(contractName);
        constructorArgs.push(contractSymbol);
        constructorArgs.push(totalSupply);
      } else if (contractType === "erc721") {
        constructorArgs.push(contractName);
        constructorArgs.push(contractSymbol);
        constructorArgs.push(baseUri || "");
      } else if (contractType === "erc1155") {
        constructorArgs.push(baseUri || "");
      }

      // Deploy using the compiled bytecode and ABI
      const deployResult = await deployContractClientSide(
        compileResult.bytecode,
        compileResult.abi,
        constructorArgs
      );

      // Submit deployment details to the backend
      const response = await apiRequest("POST", "/api/deployments", {
        ...deploymentData,
        contractAddress: deployResult.address,
        transactionHash: deployResult.transactionHash,
        status: "deployed",
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Contract Deployed Successfully!",
        description: `Contract deployed at: ${data.contractAddress}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/deployments"] });
      
      // Clear form
      setContractName("");
      setContractSymbol("");
      setTotalSupply("");
      setBaseUri("");
      setTokenImage("");
      setIpfsHash("");
    },
    onError: (error) => {
      toast({
        title: "Deployment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeploy = async () => {
    if (!contractName || !contractSymbol) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (contractType === "erc20" && !totalSupply) {
      toast({
        title: "Missing Total Supply",
        description: "Please enter total supply for ERC-20 token",
        variant: "destructive",
      });
      return;
    }

    // Check wallet connection
    if (!window.ethereum) {
      toast({
        title: "Wallet Not Found",
        description: "Please install MetaMask or compatible wallet",
        variant: "destructive",
      });
      return;
    }

    try {
      // Request account connection if not already connected
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts.length) {
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your wallet first",
          variant: "destructive",
        });
        return;
      }

      // Check network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0x279f') {
        toast({
          title: "Wrong Network",
          description: "Please switch to Monad Testnet to deploy contracts",
          variant: "destructive",
        });
        return;
      }

      const deploymentData = {
        contractType,
        contractName,
        contractSymbol,
        totalSupply: contractType === "erc20" ? totalSupply : null,
        baseUri: (contractType === "erc721" || contractType === "erc1155") ? baseUri : null,
        tokenImage,
        ipfsHash,
        deployerAddress: accounts[0],
      };

      deployMutation.mutate(deploymentData);
    } catch (error: any) {
      console.error("Wallet connection or deployment error:", error);
      toast({
        title: "Wallet Error",
        description: error.message || "An error occurred while interacting with your wallet.",
        variant: "destructive",
      });
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTokenImage(value);
  };

  const handleIpfsHashChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setIpfsHash(value);
    // Auto-generate metadata URI if IPFS hash is provided
    if (value && contractType === "erc1155") {
      setBaseUri(`https://ipfs.io/ipfs/${value}/{id}.json`);
    } else if (value && contractType === "erc721") {
      setBaseUri(`https://ipfs.io/ipfs/${value}/`);
    }
  };

  const contractTypes = [
    {
      value: "erc20" as ContractType,
      icon: Coins,
      title: "ERC-20 Token",
      description: "Fungible token standard",
      color: "text-accent",
    },
    {
      value: "erc721" as ContractType,
      icon: Image,
      title: "ERC-721 NFT",
      description: "Non-fungible token standard",
      color: "text-secondary",
    },
    {
      value: "erc1155" as ContractType,
      icon: Layers3,
      title: "ERC-1155 Multi-Token",
      description: "Multi-token standard",
      color: "text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column - Configuration */}
      <div className="lg:col-span-1 space-y-6">
        {/* Contract Type Selection */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Rocket className="w-5 h-5 text-primary" />
              <span>Select Contract Type</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={contractType} onValueChange={(value) => setContractType(value as ContractType)}>
              <div className="space-y-3">
                {contractTypes.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={type.value} id={type.value} data-testid={`radio-${type.value}`} />
                    <Label htmlFor={type.value} className="flex items-center space-x-3 cursor-pointer flex-1 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors">
                      <type.icon className={`w-5 h-5 ${type.color}`} />
                      <div>
                        <h3 className="font-medium">{type.title}</h3>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Contract Parameters */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Code className="w-5 h-5 text-primary" />
              <span>Contract Parameters</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="token-name">Token Name</Label>
              <Input
                id="token-name"
                placeholder="My Awesome Token"
                value={contractName}
                onChange={(e) => setContractName(e.target.value)}
                data-testid="input-token-name"
                className="bg-muted border-border"
              />
            </div>

            <div>
              <Label htmlFor="token-symbol">Token Symbol</Label>
              <Input
                id="token-symbol"
                placeholder="MAT"
                value={contractSymbol}
                onChange={(e) => setContractSymbol(e.target.value)}
                data-testid="input-token-symbol"
                className="bg-muted border-border"
              />
            </div>

            {contractType === "erc20" && (
              <div>
                <Label htmlFor="total-supply">Total Supply</Label>
                <Input
                  id="total-supply"
                  type="number"
                  placeholder="1000000"
                  value={totalSupply}
                  onChange={(e) => setTotalSupply(e.target.value)}
                  data-testid="input-total-supply"
                  className="bg-muted border-border"
                />
              </div>
            )}

            {(contractType === "erc721" || contractType === "erc1155") && (
              <div>
                <Label htmlFor="base-uri">Base URI</Label>
                <Input
                  id="base-uri"
                  type="url"
                  placeholder="https://api.example.com/metadata/"
                  value={baseUri}
                  onChange={(e) => setBaseUri(e.target.value)}
                  data-testid="input-base-uri"
                  className="bg-muted border-border"
                />
              </div>
            )}

            <div>
              <Label htmlFor="token-image">Token Image URL</Label>
              <Input
                id="token-image"
                type="url"
                placeholder="https://example.com/image.png or ipfs://QmHash"
                value={tokenImage}
                onChange={handleImageUpload}
                data-testid="input-token-image"
                className="bg-muted border-border"
              />
              <p className="text-xs text-muted-foreground mt-1">Enter direct image URL or IPFS link</p>
            </div>

            {(contractType === "erc721" || contractType === "erc1155") && (
              <div>
                <Label htmlFor="ipfs-hash">IPFS Metadata Hash</Label>
                <Input
                  id="ipfs-hash"
                  placeholder="QmYourMetadataHashHere"
                  value={ipfsHash}
                  onChange={handleIpfsHashChange}
                  data-testid="input-ipfs-hash"
                  className="bg-muted border-border font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {contractType === "erc1155"
                    ? "IPFS hash for metadata folder (will auto-generate {id}.json URI)"
                    : "IPFS hash for metadata folder (will auto-generate base URI)"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deploy Button */}
        <Card className="bg-surface border-border">
          <CardContent className="pt-6">
            <Button
              onClick={handleDeploy}
              disabled={deployMutation.isPending}
              data-testid="button-deploy-contract"
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed"
            >
              <Rocket className="w-4 h-4 mr-2" />
              {deployMutation.isPending ? "Deploying..." : "Deploy Contract"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Preview and History */}
      <div className="lg:col-span-2 space-y-6">
        {/* Code Preview */}
        <CodePreview
          contractType={contractType}
          contractName={contractName}
          contractSymbol={contractSymbol}
          totalSupply={totalSupply}
          baseUri={baseUri}
          tokenImage={tokenImage}
          ipfsHash={ipfsHash}
        />

        {/* Deployment History */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="w-5 h-5 text-primary" />
              <span>Recent Deployments</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deploymentsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-muted-foreground mt-2">Loading deployments...</p>
              </div>
            ) : deployments && deployments.length > 0 ? (
              <div className="space-y-3">
                {deployments.slice(0, 5).map((deployment) => (
                  <div
                    key={deployment.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                    data-testid={`deployment-${deployment.id}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        deployment.status === "deployed" ? "bg-secondary" :
                        deployment.status === "pending" ? "bg-accent animate-pulse" :
                        "bg-destructive"
                      }`} />
                      <div>
                        <h3 className="font-medium">
                          {deployment.contractName} ({deployment.contractSymbol})
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {deployment.contractType.toUpperCase()} • {new Date(deployment.createdAt || 0).toLocaleString()}
                        </p>
                        {deployment.contractAddress && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {deployment.contractAddress.slice(0, 10)}...{deployment.contractAddress.slice(-8)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        deployment.status === "deployed" ? "bg-secondary/20 text-secondary" :
                        deployment.status === "pending" ? "bg-accent/20 text-accent" :
                        "bg-destructive/20 text-destructive"
                      }`}>
                        {deployment.status}
                      </span>
                      {deployment.contractAddress && (
                        <Button variant="ghost" size="sm" asChild>
                          <a
                            href={`https://testnet.monadexplorer.com/address/${deployment.contractAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`link-explorer-${deployment.id}`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No deployments yet</p>
                <p className="text-sm text-muted-foreground">Your deployed contracts will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
