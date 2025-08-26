import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Code, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateContractCode } from "@/lib/contracts";
import type { ContractType } from "@shared/schema";

interface CodePreviewProps {
  contractType: ContractType;
  contractName: string;
  contractSymbol: string;
  totalSupply?: string;
  baseUri?: string;
  tokenImage?: string;
  ipfsHash?: string;
}

export default function CodePreview({
  contractType,
  contractName,
  contractSymbol,
  totalSupply,
  baseUri,
  tokenImage,
  ipfsHash,
}: CodePreviewProps) {
  const [generatedCode, setGeneratedCode] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const code = generateContractCode({
      contractType,
      contractName: contractName || "MyToken",
      contractSymbol: contractSymbol || "MTK",
      totalSupply,
      baseUri,
      tokenImage,
      ipfsHash,
    });
    setGeneratedCode(code);
  }, [contractType, contractName, contractSymbol, totalSupply, baseUri]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      toast({
        title: "Code Copied",
        description: "Contract code copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Failed to Copy",
        description: "Could not copy code to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="bg-surface border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Code className="w-5 h-5 text-primary" />
            <span>Live Contract Preview</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            data-testid="button-copy-code"
            className="text-muted-foreground hover:text-foreground"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="bg-muted rounded-lg p-4 text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto">
          <code data-testid="code-preview" className="text-foreground">
            {generatedCode}
          </code>
        </pre>
      </CardContent>
    </Card>
  );
}
