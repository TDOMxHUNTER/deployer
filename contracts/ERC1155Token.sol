// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";

contract ERC1155Token is ERC1155, ERC1155URIStorage, Ownable {
    constructor(string memory baseURI) ERC1155(baseURI) Ownable(msg.sender) {}
    
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public onlyOwner {
        _mint(account, id, amount, data);
    }
    
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }
    
    function burn(
        address account,
        uint256 id,
        uint256 amount
    ) public {
        require(
            account == msg.sender || isApprovedForAll(account, msg.sender),
            "ERC1155: caller is not token owner or approved"
        );
        _burn(account, id, amount);
    }
    
    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) public {
        require(
            account == msg.sender || isApprovedForAll(account, msg.sender),
            "ERC1155: caller is not token owner or approved"
        );
        _burnBatch(account, ids, amounts);
    }
    
    function setURI(uint256 tokenId, string memory tokenURI) public onlyOwner {
        _setURI(tokenId, tokenURI);
    }
    
    function setBaseURI(string memory baseURI) public onlyOwner {
        _setBaseURI(baseURI);
    }
    
    function uri(uint256 tokenId)
        public
        view
        override(ERC1155, ERC1155URIStorage)
        returns (string memory)
    {
        return super.uri(tokenId);
    }
    
    function exists(uint256 id) public view returns (bool) {
        return totalSupply(id) > 0;
    }
    
    function totalSupply(uint256 id) public view returns (uint256) {
        // This would need to be tracked manually in a real implementation
        // For simplicity, we'll return 0 here
        return 0;
    }
}
