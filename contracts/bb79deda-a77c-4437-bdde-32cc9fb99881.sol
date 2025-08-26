// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract test is ERC20, Ownable {
    constructor() ERC20("test", "test") Ownable(msg.sender) {
        _mint(msg.sender, 999999999999999 * 10 ** decimals());
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
}

// Contract will be deployed to Monad Testnet
// Network: Monad Testnet (Chain ID: 10143)
// RPC: https://testnet-rpc.monad.xyz/
// Explorer: https://testnet.monadexplorer.com/