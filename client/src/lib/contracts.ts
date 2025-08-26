import type { ContractType } from "@shared/schema";

export interface ContractParams {
  contractType: ContractType;
  contractName: string;
  contractSymbol: string;
  totalSupply?: string;
  baseUri?: string;
  tokenImage?: string;
  ipfsHash?: string;
}

export function generateContractCode(params: ContractParams): string {
  const { contractType, contractName, contractSymbol, totalSupply, baseUri, tokenImage, ipfsHash } = params;
  
  const safeName = contractName.replace(/[^a-zA-Z0-9]/g, '') || 'MyToken';
  
  let code = '';
  
  switch (contractType) {
    case 'erc20':
      code = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ${safeName} is ERC20, Ownable {
    string private _tokenImageURI;
    
    constructor() ERC20("${contractName}", "${contractSymbol}") Ownable(msg.sender) {
        _mint(msg.sender, ${totalSupply || '1000000'} * 10 ** decimals());
        _tokenImageURI = "${tokenImage || 'https://via.placeholder.com/200'}";
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
}`;
      break;
      
    case 'erc721':
      code = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ${safeName} is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    string private _baseTokenURI;
    string private _tokenImageURI;

    constructor() ERC721("${contractName}", "${contractSymbol}") Ownable(msg.sender) {
        _baseTokenURI = "${baseUri || (ipfsHash ? `https://ipfs.io/ipfs/${ipfsHash}/` : 'https://api.example.com/metadata/')}";
        _tokenImageURI = "${tokenImage || 'https://via.placeholder.com/200'}";
    }
    
    function tokenImageURI() public view returns (string memory) {
        return _tokenImageURI;
    }
    
    function setTokenImageURI(string memory newImageURI) public onlyOwner {
        _tokenImageURI = newImageURI;
    }
    
    function safeMint(address to, string memory uri) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }
    
    function setBaseURI(string memory baseURI) public onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}`;
      break;
      
    case 'erc1155':
      code = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";

contract ${safeName} is ERC1155, ERC1155URIStorage, Ownable {
    string private _tokenImageURI;
    
    constructor() ERC1155("${baseUri || (ipfsHash ? `https://ipfs.io/ipfs/${ipfsHash}/{id}.json` : 'https://api.example.com/metadata/{id}.json')}") Ownable(msg.sender) {
        _tokenImageURI = "${tokenImage || 'https://via.placeholder.com/200'}";
    }
    
    function tokenImageURI() public view returns (string memory) {
        return _tokenImageURI;
    }
    
    function setTokenImageURI(string memory newImageURI) public onlyOwner {
        _tokenImageURI = newImageURI;
    }
    
    function mint(address account, uint256 id, uint256 amount, bytes memory data)
        public
        onlyOwner
    {
        _mint(account, id, amount, data);
    }
    
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        public
        onlyOwner
    {
        _mintBatch(to, ids, amounts, data);
    }
    
    function setURI(uint256 tokenId, string memory tokenURI) public onlyOwner {
        _setURI(tokenId, tokenURI);
    }
    
    function uri(uint256 tokenId) public view override(ERC1155, ERC1155URIStorage) returns (string memory) {
        return super.uri(tokenId);
    }
}`;
      break;
      
    default:
      code = `// Please select a contract type to generate code`;
  }
  
  if (contractType !== 'erc20' && contractType !== 'erc721' && contractType !== 'erc1155') {
    return code;
  }
  
  code += `

// Contract will be deployed to Monad Testnet
// Network: Monad Testnet (Chain ID: 10143)
// RPC: https://testnet-rpc.monad.xyz/
// Explorer: https://testnet.monadexplorer.com/`;
  
  return code;
}

export const ERC20_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export const ERC721_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "uri",
        "type": "string"
      }
    ],
    "name": "safeMint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export const ERC1155_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
