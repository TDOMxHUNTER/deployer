import { useState } from "react";
import { Hammer, Send } from "lucide-react";
import WalletConnect from "@/components/wallet-connect";
import ContractDeployer from "@/components/contract-deployer";
import Multisender from "@/components/multisender";

type TabType = "deployer" | "multisender";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("deployer");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Hammer className="text-primary text-xl" />
                <h1 className="text-xl font-bold">Foundry Deployer</h1>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                <span>Monad Testnet</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-sm">
                <span className="text-muted-foreground">Network:</span>
                <span className="text-secondary font-medium">Monad Testnet (10143)</span>
              </div>
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("deployer")}
              data-testid="tab-deployer"
              className={`tab-button border-b-2 pb-4 px-1 font-medium transition-colors flex items-center space-x-2 ${
                activeTab === "deployer"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Hammer className="w-4 h-4" />
              <span>Contract Deployer</span>
            </button>
            <button
              onClick={() => setActiveTab("multisender")}
              data-testid="tab-multisender"
              className={`tab-button border-b-2 pb-4 px-1 font-medium transition-colors flex items-center space-x-2 ${
                activeTab === "multisender"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Multisender</span>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "deployer" && <ContractDeployer />}
        {activeTab === "multisender" && <Multisender />}
      </div>
    </div>
  );
}
