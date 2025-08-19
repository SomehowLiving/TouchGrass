// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract CliqueNFT is ERC721URIStorage {
    uint256 public tokenCounter;

    event CliqueMinted(uint256 indexed tokenId, address indexed minter, string tokenURI);

    constructor() ERC721("CliqueNFT", "CLQ") {
        tokenCounter = 0;
    }
    
    // anyone can mint their own NFT
    // they just pass the ipfs link to their metadata json- no owner check
    function mintClique(string memory tokenURI) external returns (uint256) {
        uint256 newTokenId = tokenCounter;
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        emit CliqueMinted(newTokenId, msg.sender, tokenURI);

        tokenCounter += 1;  // get ready for the next NFT
        return newTokenId;
    }
}
