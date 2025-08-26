// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract test is ERC20, Ownable {
    string private _tokenImageURI;
    
    constructor() ERC20("test", "test") Ownable(msg.sender) {
        _mint(msg.sender, 1000000000000000000000 * 10 ** decimals());
        _tokenImageURI = "https://via.placeholder.com/200";
    }
    
    function tokenImageURI() public view returns (string memory) {
        return _tokenImageURI;
    }
    
    function setTokenImageURI(string memory newImageURI) public onlyOwner {
        _tokenImageURI = newImageURI;
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