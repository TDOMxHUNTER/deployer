// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/ERC20Token.sol";
import "../contracts/ERC721Token.sol";
import "../contracts/ERC1155Token.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Example deployments - these would be customized based on user input
        
        // Deploy ERC20 Token
        ERC20Token erc20 = new ERC20Token(
            "Example Token",
            "EXT",
            1000000 // 1M tokens
        );
        console.log("ERC20 Token deployed at:", address(erc20));

        // Deploy ERC721 Token
        ERC721Token erc721 = new ERC721Token(
            "Example NFT",
            "ENFT",
            "https://api.example.com/metadata/"
        );
        console.log("ERC721 Token deployed at:", address(erc721));

        // Deploy ERC1155 Token
        ERC1155Token erc1155 = new ERC1155Token(
            "https://api.example.com/metadata/{id}.json"
        );
        console.log("ERC1155 Token deployed at:", address(erc1155));

        vm.stopBroadcast();
    }
}
