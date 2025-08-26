
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function WalletConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("0");
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<string>("");
  const { toast } = useToast();

  // Monad Testnet configuration
  const MONAD_TESTNET = {
    chainId: '0x279f', // 10143 in hex
    chainName: 'Monad Testnet',
    rpcUrls: ['https://testnet-rpc.monad.xyz/'],
    nativeCurrency: {
      name: 'MON',
      symbol: 'MON',
      decimals: 18,
    },
    blockExplorerUrls: ['https://testnet.monadexplorer.com/'],
  };

  useEffect(() => {
    checkConnection();
    setupEventListeners();
  }, []);

  const checkConnection = async () => {
    if (!window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        await getBalance(accounts[0]);
        await getCurrentChain();
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const setupEventListeners = () => {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', (accounts: string[]) => {
      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        getBalance(accounts[0]);
      } else {
        disconnect();
      }
    });

    window.ethereum.on('chainChanged', (chainId: string) => {
      setChainId(chainId);
      window.location.reload();
    });
  };

  const getCurrentChain = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(chainId);
    } catch (error) {
      console.error('Error getting chain:', error);
    }
  };

  const getBalance = async (address: string) => {
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      // Convert from wei to MON
      const balanceInMON = parseInt(balance, 16) / Math.pow(10, 18);
      setBalance(balanceInMON.toFixed(4));
    } catch (error) {
      console.error('Error getting balance:', error);
      setBalance('0');
    }
  };

  const addMonadNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [MONAD_TESTNET],
      });
    } catch (error) {
      console.error('Error adding Monad network:', error);
      throw error;
    }
  };

  const switchToMonad = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_TESTNET.chainId }],
      });
    } catch (error: any) {
      // Network doesn't exist, add it
      if (error.code === 4902) {
        await addMonadNetwork();
      } else {
        throw error;
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast({
        title: "Wallet Not Found",
        description: "Please install MetaMask or compatible wallet",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      // First check if we're on Monad Testnet
      const currentChain = await window.ethereum.request({ method: 'eth_chainId' });
      if (currentChain !== MONAD_TESTNET.chainId) {
        await switchToMonad();
      }

      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        await getBalance(accounts[0]);
        await getCurrentChain();
        
        toast({
          title: "Wallet Connected",
          description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
        });
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setIsConnected(false);
    setAddress("");
    setBalance("0");
    setChainId("");
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    toast({
      title: "Address Copied",
      description: "Wallet address copied to clipboard",
    });
  };

  const isOnMonadTestnet = chainId === MONAD_TESTNET.chainId;

  if (!isConnected) {
    return (
      <Button
        onClick={connectWallet}
        disabled={isConnecting}
        data-testid="button-connect-wallet"
        className="bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed"
      >
        <Wallet className="w-4 h-4 mr-2" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      {!isOnMonadTestnet && (
        <div className="flex items-center space-x-2 px-3 py-1 bg-orange-500/20 text-orange-500 rounded-full text-sm">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          <span>Wrong Network</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={switchToMonad}
            className="text-orange-500 hover:text-orange-600 h-auto p-1"
          >
            Switch
          </Button>
        </div>
      )}
      
      <div className="flex items-center space-x-2 bg-surface border border-border rounded-lg px-3 py-2">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-secondary rounded-full" />
          <span className="text-sm font-medium">{balance} MON</span>
        </div>
        
        <div className="h-4 w-px bg-border" />
        
        <div className="flex items-center space-x-2">
          <span className="text-sm font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={copyAddress}
              data-testid="button-copy-address"
              className="h-auto p-1 hover:bg-muted"
            >
              <Copy className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              asChild
              className="h-auto p-1 hover:bg-muted"
            >
              <a
                href={`https://testnet.monadexplorer.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-explorer"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={disconnect}
              data-testid="button-disconnect"
              className="h-auto p-1 hover:bg-destructive/20 hover:text-destructive"
            >
              <LogOut className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
