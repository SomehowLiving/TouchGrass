// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

import "./TouchGrassCore.sol";
/**
 * @title TouchGrassNFT
 * @dev Dynamic NFT contract for TouchGrass memories
 * Features evolving metadata based on friendship levels and interactions
 */
contract TouchGrassNFT is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    // Events
    event MemoryNFTMinted(uint256 indexed tokenId, address indexed owner, uint256 indexed eventId);
    event MetadataUpdated(uint256 indexed tokenId, string newMetadataURI);

    // Structs
    struct MemoryNFT {
        uint256 eventId;
        address[] crewMembers;      // participants involved in the memory
        uint256 mintedAt;       // when was it minted
        string baseIPFSHash;        // for metadata or assets
        uint256 friendshipLevel;        // based on mutuals and like attended events
        bool isPublic;      // visibility flag of the cultural feed mainly specifying if it's shareable and can be viewed by others 
    }

    Counters.Counter private _tokenIds;
    TouchGrassCore public coreContract;  //friendship data
    
    mapping(uint256 => MemoryNFT) public memoryNFTs;        // event id to memorynft
    mapping(uint256 => mapping(address => uint256)) public eventToUserToken; // eventId => user => tokenId
    
    string public baseMetadataURI;

// "TouchGrass Memory" — the human-readable name of the NFT collection.
// "TGMEM" — the ticker symbol, like a short code for your NFTs.
    constructor() ERC721("TouchGrass Memory", "TGMEM") { // This calls the constructor of the parent ERC721 contract (from OpenZeppelin) and sets the name and symbol of your NFT collection
        baseMetadataURI = "https://api.touchgrass.app/metadata/";       //sets the base URL that will be used later to form the full metadata URI for each token
    }

    /**
     * @dev Set the core contract address (only owner)
     */
    function setCoreContract(address _coreContract) external onlyOwner {
        coreContract = TouchGrassCore(_coreContract);
    }

    /**
     * @dev Mint a memory NFT (only called by core contract)
     */
    function mintMemoryNFT(
        address _to,
        uint256 _eventId,
        string memory _ipfsHash,
        address[] memory _crewMembers
    ) external returns (uint256) {
        require(msg.sender == address(coreContract), "Only core contract can mint");
        require(eventToUserToken[_eventId][_to] == 0, "User already has NFT for this event");

        _tokenIds.increment();
        uint256 tokenId = _tokenIds.current();

        _safeMint(_to, tokenId);

        // Calculate initial friendship level based on crew interactions
        uint256 friendshipLevel = _calculateFriendshipLevel(_to, _crewMembers);

        memoryNFTs[tokenId] = MemoryNFT({
            eventId: _eventId,
            crewMembers: _crewMembers,
            mintedAt: block.timestamp,
            baseIPFSHash: _ipfsHash,
            friendshipLevel: friendshipLevel,
            isPublic: false
        });

        eventToUserToken[_eventId][_to] = tokenId;

        // Set initial metadata URI
        string memory metadataURI = string(abi.encodePacked(baseMetadataURI, _toString(tokenId)));
        _setTokenURI(tokenId, metadataURI);

        emit MemoryNFTMinted(tokenId, _to, _eventId);
        return tokenId;
    }

    /**
     * @dev Update friendship level and metadata URI if level changes
     * Anyone can trigger, but token must exist
     */
    function updateFriendshipLevel(uint256 _tokenId) external {
        require(_exists(_tokenId), "Token does not exist");
        
        MemoryNFT storage memoryNFT = memoryNFTs[_tokenId];
        address owner = ownerOf(_tokenId);
        
        // Recalculate friendship level
        uint256 newFriendshipLevel = _calculateFriendshipLevel(owner, memoryNFT.crewMembers);
        
        if (newFriendshipLevel != memoryNFT.friendshipLevel) {
            memoryNFT.friendshipLevel = newFriendshipLevel;
            
            // Update metadata URI to reflect new level
            string memory metadataURI = string(abi.encodePacked(
                baseMetadataURI, 
                _toString(_tokenId),
                "?level=",
                _toString(newFriendshipLevel)
            ));
            _setTokenURI(_tokenId, metadataURI);
            
            emit MetadataUpdated(_tokenId, metadataURI);
        }
    }

    /**
     * @dev Make memory public (shareable to cultural feed)
     */
    function makeMemoryPublic(uint256 _tokenId) external {
        require(ownerOf(_tokenId) == msg.sender, "Only owner can make public");
        memoryNFTs[_tokenId].isPublic = true;
    }

    /**
     * @dev View detailed memory NFT info by tokenId
     */
    function getMemoryDetails(uint256 _tokenId) external view returns (
        uint256 eventId,
        address[] memory crewMembers,
        uint256 mintedAt,
        string memory baseIPFSHash,
        uint256 friendshipLevel,
        bool isPublic
    ) {
        require(_exists(_tokenId), "Token does not exist");
        MemoryNFT memory memory_nft = memoryNFTs[_tokenId];
        
        return (
            memory_nft.eventId,
            memory_nft.crewMembers,
            memory_nft.mintedAt,
            memory_nft.baseIPFSHash,
            memory_nft.friendshipLevel,
            memory_nft.isPublic
        );
    }

    /**
     * @dev Get a paginated list of public memories for feed display
     * Limits results to max 50
     */
    function getPublicMemories(uint256 _offset, uint256 _limit) external view returns (uint256[] memory) {
        require(_limit <= 50, "Limit too high");
        
        uint256[] memory publicTokens = new uint256[](_limit);
        uint256 count = 0;
        uint256 currentIndex = 0;
        
        for (uint256 i = 1; i <= _tokenIds.current() && count < _limit; i++) {
            if (memoryNFTs[i].isPublic) {
                if (currentIndex >= _offset) {
                    publicTokens[count] = i;
                    count++;
                }
                currentIndex++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = publicTokens[i];
        }
        
        return result;
    }

    /**
     * @dev Internal: Compute friendship level average between user and crew members
     * Returns 1 if no friends found (minimum level)
     */
    function _calculateFriendshipLevel(address _user, address[] memory _crewMembers) internal view returns (uint256) {
        uint256 totalLevel = 0;
        uint256 friendCount = 0;
        
        for (uint i = 0; i < _crewMembers.length; i++) {
            if (_crewMembers[i] != _user) {
                uint256 level = coreContract.getFriendshipLevel(_user, _crewMembers[i]);
                if (level > 0) {
                    totalLevel += level;
                    friendCount++;
                }
            }
        }
        
        return friendCount > 0 ? totalLevel / friendCount : 1;
    }

    /**
     * @dev Set base metadata URI (only owner)
     */
    function setBaseMetadataURI(string memory _baseURI) external onlyOwner {
        baseMetadataURI = _baseURI;
    }

    /**
     * @dev Internal helper to convert uint to string (for URI building)
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    // Overrides required by Solidity due to multiple inheritance
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
