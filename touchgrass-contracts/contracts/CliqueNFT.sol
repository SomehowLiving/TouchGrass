// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract CliqueNFT is ERC721URIStorage {
    uint256 public tokenCounter;

    // logging events
    event CliqueMinted(uint256 tokenId, address minter, string uri);

    // set the collection name + short symbol
    constructor() ERC721("CliqueNFT", "CLQ") {
        tokenCounter = 0; // start counting from 0
    }

    // anyone can mint their own NFT
    // they just pass the ipfs link to their metadata json- no owner check
    function mintClique(string memory uri) external returns (uint256) {
        uint256 newId = tokenCounter;

        _safeMint(msg.sender, newId);   // mint it to the caller
        _setTokenURI(newId, uri);       // connect it with ipfs metadata

        emit CliqueMinted(newId, msg.sender, uri);

        tokenCounter += 1; // get ready for the next NFT
        return newId;
    }
}
