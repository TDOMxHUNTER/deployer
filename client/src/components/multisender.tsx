
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Calculator, Clock, Plus, Upload, Trash2, Send, Wallet, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { sendTransaction, sendERC20Token } from "@/lib/web3";
import type { MultisendTransaction, Deployment } from "@shared/schema";

interface Recipient {
  address: string;
  amount: string;
}

export default function Multisender() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [newAddress, setNewAddress] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [tokenType, setTokenType] = useState<"native" | "erc20">("native");
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("MON");
  
  const { toast } = useToast();

  // Fetch transaction history
  const { data: transactions, isLoading: transactionsLoading } = useQuery<MultisendTransaction[]>({
    queryKey: ["/api/multisend"],
  });

  // Fetch deployed contracts for token selection
  const { data: deployedContracts } = useQuery<Deployment[]>({
    queryKey: ["/api/deployments"],
  });

  // Filter for deployed ERC-20 contracts
  const erc20Contracts = deployedContracts?.filter(
    contract => contract.contractType === "erc20" && contract.status === "deployed" && contract.contractAddress
  ) || [];

  // Send to multiple addresses mutation
  const sendMutation = useMutation({
    mutationFn: async (multisendData: any) => {
      const { recipients, tokenType, tokenAddress, senderAddress } = multisendData;
      
      // Check wallet connection
      if (!window.ethereum) {
        throw new Error("MetaMask not available");
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts.length) {
        throw new Error("Wallet not connected");
      }

      // Check network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== '0x279f') {
        throw new Error("Please switch to Monad Testnet");
      }

      const transactionHashes: string[] = [];
      const failedTransactions: string[] = [];
      let totalGasUsed = '0';

      // Create initial record in backend
      const initialResponse = await apiRequest("POST", "/api/multisend", {
        ...multisendData,
        status: "pending",
        transactionHashes: [],
      });
      const multisendRecord = await initialResponse.json();

      try {
        // Send transactions one by one
        for (let i = 0; i < recipients.length; i++) {
          const recipient = recipients[i];
          try {
            let result;
            if (tokenType === "native") {
              result = await sendTransaction(recipient.address, recipient.amount);
            } else {
              result = await sendERC20Token(tokenAddress, recipient.address, recipient.amount);
            }
            transactionHashes.push(result.transactionHash);
            
            // Small delay between transactions to avoid nonce conflicts
            if (i < recipients.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } catch (error: any) {
            console.error(`Failed to send to ${recipient.address}:`, error);
            failedTransactions.push(recipient.address);
            
            // Continue with other transactions even if one fails
            continue;
          }
        }

        // Update record with final status
        const finalStatus = failedTransactions.length === 0 ? "confirmed" : 
                           failedTransactions.length === recipients.length ? "failed" : "partially_failed";

        const updateResponse = await apiRequest("PUT", `/api/multisend/${multisendRecord.id}`, {
          status: finalStatus,
          transactionHashes: transactionHashes,
          failedAddresses: failedTransactions,
          gasUsed: totalGasUsed,
        });

        return {
          ...multisendRecord,
          status: finalStatus,
          transactionHashes,
          failedTransactions,
        };
      } catch (error) {
        // Update record as failed
        await apiRequest("PUT", `/api/multisend/${multisendRecord.id}`, {
          status: "failed",
          transactionHashes: transactionHashes,
          failedAddresses: recipients.map(r => r.address),
        });
        throw error;
      }
    },
    onSuccess: (data) => {
      const { transactionHashes, failedTransactions } = data;
      const successCount = transactionHashes.length;
      const totalCount = recipients.length;
      
      if (failedTransactions.length === 0) {
        toast({
          title: "Multisend Completed!",
          description: `Successfully sent to all ${totalCount} recipients`,
        });
      } else {
        toast({
          title: "Multisend Partially Completed",
          description: `${successCount}/${totalCount} transactions successful`,
          variant: "destructive",
        });
      }
      
      setRecipients([]);
      queryClient.invalidateQueries({ queryKey: ["/api/multisend"] });
    },
    onError: (error) => {
      toast({
        title: "Multisend Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addRecipient = () => {
    if (!newAddress || !newAmount) {
      toast({
        title: "Missing Information",
        description: "Please enter both address and amount",
        variant: "destructive",
      });
      return;
    }

    // Basic address validation
    if (!newAddress.startsWith("0x") || newAddress.length !== 42) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(newAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate addresses
    if (recipients.some(r => r.address.toLowerCase() === newAddress.toLowerCase())) {
      toast({
        title: "Duplicate Address",
        description: "This address is already in the recipients list",
        variant: "destructive",
      });
      return;
    }

    setRecipients([...recipients, { address: newAddress, amount: newAmount }]);
    setNewAddress("");
    setNewAmount("");
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setRecipients([]);
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const newRecipients: Recipient[] = [];

      for (let i = 0; i < lines.length; i++) {
        const [address, amount] = lines[i].split(',').map(item => item.trim());
        
        if (address && amount) {
          // Basic validation
          if (address.startsWith("0x") && address.length === 42 && !isNaN(parseFloat(amount))) {
            newRecipients.push({ address, amount });
          }
        }
      }

      if (newRecipients.length > 0) {
        setRecipients([...recipients, ...newRecipients]);
        toast({
          title: "CSV Uploaded",
          description: `Added ${newRecipients.length} recipients from CSV`,
        });
      } else {
        toast({
          title: "Invalid CSV",
          description: "No valid recipients found in CSV file",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
  };

  const handleSendToMultiple = async () => {
    if (recipients.length === 0) {
      toast({
        title: "No Recipients",
        description: "Please add at least one recipient",
        variant: "destructive",
      });
      return;
    }

    if (tokenType === "erc20" && !tokenAddress) {
      toast({
        title: "Token Not Selected",
        description: "Please select an ERC-20 token to send",
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
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (!accounts.length) {
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your wallet first",
          variant: "destructive",
        });
        return;
      }

      const totalAmount = recipients.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const estimatedGasCost = recipients.length * 0.001; // Estimate gas per transaction
      
      const confirmed = confirm(
        `Multisend Summary:\n` +
        `Recipients: ${recipients.length}\n` +
        `Total Amount: ${totalAmount.toFixed(4)} ${tokenSymbol}\n` +
        `Estimated Gas Cost: ~${estimatedGasCost.toFixed(4)} MON\n\n` +
        `This will send ${recipients.length} separate transactions.\n` +
        `Continue with multisend?`
      );

      if (!confirmed) {
        return;
      }

      const multisendData = {
        recipients,
        totalAmount: totalAmount.toString(),
        tokenType,
        tokenAddress: tokenType === "erc20" ? tokenAddress : null,
        tokenSymbol,
        senderAddress: accounts[0],
      };

      sendMutation.mutate(multisendData);
    } catch (error) {
      toast({
        title: "Wallet Error",
        description: "Failed to connect to wallet",
        variant: "destructive",
      });
    }
  };

  const totalAmount = recipients.reduce((sum, r) => sum + parseFloat(r.amount || "0"), 0);
  const estimatedGas = recipients.length * 0.001; // Rough estimate

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column - Address Management */}
      <div className="space-y-6">
        {/* Recipients Management */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-primary" />
              <span>Recipients Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Token Selection */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-center space-x-2 mb-3">
                <Wallet className="w-4 h-4 text-primary" />
                <Label className="font-medium">Select Token to Send</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="token-type" className="text-sm">Token Type</Label>
                  <Select value={tokenType} onValueChange={(value: "native" | "erc20") => {
                    setTokenType(value);
                    if (value === "native") {
                      setTokenSymbol("MON");
                      setTokenAddress("");
                    }
                  }}>
                    <SelectTrigger className="bg-muted border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="native">
                        <div className="flex items-center space-x-2">
                          <Coins className="w-4 h-4" />
                          <span>Native MON</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="erc20">
                        <div className="flex items-center space-x-2">
                          <Coins className="w-4 h-4" />
                          <span>ERC-20 Token</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {tokenType === "erc20" && (
                  <div>
                    <Label htmlFor="token-select" className="text-sm">Select Token</Label>
                    <Select value={tokenAddress} onValueChange={(value) => {
                      setTokenAddress(value);
                      const contract = erc20Contracts.find(c => c.contractAddress === value);
                      if (contract) {
                        setTokenSymbol(contract.contractSymbol);
                      }
                    }}>
                      <SelectTrigger className="bg-muted border-border">
                        <SelectValue placeholder="Choose token" />
                      </SelectTrigger>
                      <SelectContent>
                        {erc20Contracts.length > 0 ? (
                          erc20Contracts.map((contract) => (
                            <SelectItem key={contract.id} value={contract.contractAddress!}>
                              <div className="flex items-center space-x-2">
                                <Coins className="w-4 h-4" />
                                <span>{contract.contractName} ({contract.contractSymbol})</span>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="" disabled>
                            No deployed ERC-20 tokens found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              {tokenType === "erc20" && !tokenAddress && (
                <div className="text-center p-3 bg-accent/10 rounded-lg border border-accent/20">
                  <p className="text-sm text-accent">Deploy an ERC-20 token first to use in multisender</p>
                </div>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Input
                placeholder="0x742d35Cc6639C0532fEb98b9e72b86636d3C92dE"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                data-testid="input-recipient-address"
                className="flex-1 bg-muted border-border font-mono text-sm"
              />
              <div className="flex items-center space-x-1">
                <Input
                  type="number"
                  placeholder="Amount"
                  step="0.001"
                  min="0"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  data-testid="input-recipient-amount"
                  className="w-24 bg-muted border-border"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">{tokenSymbol}</span>
              </div>
              <Button
                onClick={addRecipient}
                disabled={tokenType === "erc20" && !tokenAddress}
                data-testid="button-add-recipient"
                className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm mb-2">Or upload CSV file (address,amount)</p>
              <Input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                data-testid="input-csv-upload"
                className="hidden"
                id="csv-upload"
              />
              <Label htmlFor="csv-upload" className="bg-muted hover:bg-muted/80 px-4 py-2 rounded-lg cursor-pointer transition-colors inline-flex items-center space-x-2">
                <Upload className="w-4 h-4" />
                <span>Upload CSV</span>
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Recipients List */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <span>Recipients ({recipients.length})</span>
              </CardTitle>
              {recipients.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  data-testid="button-clear-all"
                  className="text-muted-foreground hover:text-destructive"
                >
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recipients.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recipients.map((recipient, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    data-testid={`recipient-${index}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono text-foreground truncate">
                        {recipient.address}
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium">{recipient.amount} {tokenSymbol}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRecipient(index)}
                        data-testid={`button-remove-${index}`}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recipients added</p>
                <p className="text-sm text-muted-foreground">Add addresses to start multisending</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Summary and Status */}
      <div className="space-y-6">
        {/* Transaction Summary */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-primary" />
              <span>Transaction Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Recipients:</span>
              <span className="font-medium" data-testid="text-total-recipients">{recipients.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Token:</span>
              <span className="font-medium text-primary">{tokenSymbol} {tokenType === "erc20" ? "(ERC-20)" : "(Native)"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-medium" data-testid="text-total-amount">{totalAmount.toFixed(3)} {tokenSymbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estimated Gas:</span>
              <span className="font-medium" data-testid="text-estimated-gas">{estimatedGas.toFixed(3)} MON</span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Total Cost:</span>
              <div className="text-right">
                <div className="font-semibold text-primary" data-testid="text-total-cost">{totalAmount.toFixed(3)} {tokenSymbol}</div>
                {tokenType === "erc20" && (
                  <div className="text-sm text-muted-foreground">+ {estimatedGas.toFixed(3)} MON (gas)</div>
                )}
              </div>
            </div>
            
            <Button
              onClick={handleSendToMultiple}
              disabled={recipients.length === 0 || sendMutation.isPending || (tokenType === "erc20" && !tokenAddress)}
              data-testid="button-send-to-multiple"
              className="w-full mt-6 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 mr-2" />
              {sendMutation.isPending ? "Sending..." : `Send ${tokenSymbol} to All Recipients`}
            </Button>
          </CardContent>
        </Card>

        {/* Transaction Status */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-primary" />
              <span>Recent Transactions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-muted-foreground mt-2">Loading transactions...</p>
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="p-3 bg-muted rounded-lg"
                    data-testid={`transaction-${transaction.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          transaction.status === "confirmed" ? "bg-secondary" :
                          transaction.status === "pending" ? "bg-accent animate-pulse" :
                          transaction.status === "partially_failed" ? "bg-orange-500" :
                          "bg-destructive"
                        }`} />
                        <div>
                          <p className="text-sm font-medium">
                            {Array.isArray(transaction.recipients) ? transaction.recipients.length : 0} recipients
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.totalAmount} {(transaction as any).tokenSymbol || "MON"} • {new Date(transaction.createdAt || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        transaction.status === "confirmed" ? "bg-secondary/20 text-secondary" :
                        transaction.status === "pending" ? "bg-accent/20 text-accent" :
                        transaction.status === "partially_failed" ? "bg-orange-500/20 text-orange-500" :
                        "bg-destructive/20 text-destructive"
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground">Your multisend transactions will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
