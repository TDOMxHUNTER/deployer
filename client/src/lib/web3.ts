
import Web3 from "web3";

let web3Instance: Web3 | null = null;

export async function initializeWeb3(): Promise<Web3> {
  if (web3Instance) {
    return web3Instance;
  }

  if (window.ethereum) {
    web3Instance = new Web3(window.ethereum);
    return web3Instance;
  } else {
    // Fallback to Monad Testnet RPC
    web3Instance = new Web3('https://testnet-rpc.monad.xyz/');
    return web3Instance;
  }
}

export async function deployContract(
  bytecode: string,
  abi: any[],
  constructorArgs: any[] = []
): Promise<{ address: string; transactionHash: string }> {
  const web3 = await initializeWeb3();
  
  if (!window.ethereum) {
    throw new Error("MetaMask not available");
  }

  const accounts = await web3.eth.getAccounts();
  if (accounts.length === 0) {
    throw new Error("No wallet connected");
  }

  const contract = new web3.eth.Contract(abi);
  const deployTx = contract.deploy({
    data: bytecode,
    arguments: constructorArgs,
  });

  const gasEstimate = await deployTx.estimateGas({ from: accounts[0] });
  
  const deployed = await deployTx.send({
    from: accounts[0],
    gas: Math.floor(Number(gasEstimate) * 1.2), // Add 20% buffer
  });

  return {
    address: deployed.options.address || '',
    transactionHash: deployed.transactionHash || '',
  };
}

export async function sendTransaction(
  to: string,
  value: string,
  data?: string
): Promise<{ transactionHash: string }> {
  const web3 = await initializeWeb3();
  
  if (!window.ethereum) {
    throw new Error("MetaMask not available");
  }

  const accounts = await web3.eth.getAccounts();
  if (accounts.length === 0) {
    throw new Error("No wallet connected");
  }

  // Validate address
  if (!web3.utils.isAddress(to)) {
    throw new Error(`Invalid recipient address: ${to}`);
  }

  // Validate value
  const valueNum = parseFloat(value);
  if (isNaN(valueNum) || valueNum <= 0) {
    throw new Error(`Invalid amount: ${value}`);
  }

  try {
    const txParams: any = {
      from: accounts[0],
      to: to,
      value: web3.utils.toWei(value, 'ether'),
    };

    if (data) {
      txParams.data = data;
    }

    const gasEstimate = await web3.eth.estimateGas(txParams);
    txParams.gas = Math.floor(Number(gasEstimate) * 1.3); // 30% buffer

    const receipt = await web3.eth.sendTransaction(txParams);
    return { transactionHash: receipt.transactionHash };
  } catch (error: any) {
    console.error('Transaction error:', error);
    
    if (error.code === 4001) {
      throw new Error("Transaction was rejected by user");
    } else if (error.code === -32603) {
      throw new Error("Transaction failed - insufficient funds or gas");
    } else if (error.message?.includes("insufficient funds")) {
      throw new Error("Insufficient funds for transaction");
    } else {
      throw new Error(`Transaction failed: ${error.message || 'Unknown error'}`);
    }
  }
}

export async function sendERC20Token(
  tokenAddress: string,
  to: string,
  amount: string,
  decimals: number = 18
): Promise<{ transactionHash: string }> {
  const web3 = await initializeWeb3();
  
  if (!window.ethereum) {
    throw new Error("MetaMask not available");
  }

  const accounts = await web3.eth.getAccounts();
  if (accounts.length === 0) {
    throw new Error("No wallet connected");
  }

  // Validate addresses
  if (!web3.utils.isAddress(tokenAddress)) {
    throw new Error(`Invalid token address: ${tokenAddress}`);
  }
  if (!web3.utils.isAddress(to)) {
    throw new Error(`Invalid recipient address: ${to}`);
  }

  // Validate amount
  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }

  const tokenABI = [
    {
      "constant": false,
      "inputs": [
        {"name": "_to", "type": "address"},
        {"name": "_value", "type": "uint256"}
      ],
      "name": "transfer",
      "outputs": [{"name": "", "type": "bool"}],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [{"name": "_owner", "type": "address"}],
      "name": "balanceOf",
      "outputs": [{"name": "balance", "type": "uint256"}],
      "type": "function"
    }
  ];

  try {
    const tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
    const amountInWei = web3.utils.toWei(amount, 'ether');

    // Check balance before sending
    const balance = await tokenContract.methods.balanceOf(accounts[0]).call();
    if (web3.utils.toBN(balance).lt(web3.utils.toBN(amountInWei))) {
      throw new Error("Insufficient token balance");
    }

    const tx = await tokenContract.methods.transfer(to, amountInWei).send({
      from: accounts[0],
    });

    return { transactionHash: tx.transactionHash };
  } catch (error: any) {
    console.error('ERC20 transfer error:', error);
    
    if (error.code === 4001) {
      throw new Error("Transaction was rejected by user");
    } else if (error.message?.includes("insufficient")) {
      throw new Error("Insufficient token balance or gas");
    } else if (error.message?.includes("transfer amount exceeds balance")) {
      throw new Error("Insufficient token balance");
    } else {
      throw new Error(`Token transfer failed: ${error.message || 'Unknown error'}`);
    }
  }
}
