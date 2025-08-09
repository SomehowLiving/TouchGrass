// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract TouchGrassCore is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using ECDSA for bytes32;

    // Events (same as before)
    event EventCreated(uint256 indexed eventId, address indexed creator, string name, uint256 timestamp);
    event FriendAttested(address indexed attester, address indexed friend, uint256 timestamp);
    event LocationVerified(address indexed user, uint256 indexed eventId, int256 lat, int256 lng);
    event MemoryMinted(uint256 indexed eventId, address indexed minter, uint256 tokenId);
    event EventDetailsStored(uint256 indexed eventId, string name, string location, address[] invitedFriends);

    // Structs (same as before - but consider the packing optimization I mentioned)
    struct GrassEvent {
        uint256 id;
        address creator;
        uint128 scheduledTime;
        uint128 createdAt;
        int128 centerLat;
        int128 centerLng;
        uint32 radiusMeters;
        bool isActive;
        string name;
        string location;
        string ipfsHash;
        address[] invitedFriends;
    }

    struct LocationProof {
        address user;
        uint256 eventId;
        int256 lat;
        int256 lng;
        uint256 timestamp;
        bytes signature;
    }

    struct FriendshipAttestation {
        address friend;
        uint256 attestedAt;
        bool isMutual;
        uint256 interactionCount;
    }

    struct UserProfile {
        uint256 eventsAttended;
        uint256 eventsCreated;
        bool isVerified;
        bytes32 deviceFingerprint;
    }

    // State variables (same as before)
    Counters.Counter private _eventIds;
    
    mapping(uint256 => GrassEvent) public events;
    mapping(address => mapping(address => FriendshipAttestation)) public friendships;
    mapping(uint256 => mapping(address => LocationProof)) public locationProofs;
    mapping(uint256 => address[]) public eventAttendees;
    mapping(address => uint256[]) public userEvents;
    mapping(address => UserProfile) public userProfiles;
    mapping(bytes32 => address) public deviceToUser;
    mapping(uint256 => mapping(address => bool)) public hasAttended; // Add this to prevent duplicates
    
    // Configuration
    uint256 public constant MAX_FRIENDS_PER_EVENT = 6;
    uint256 public constant MIN_FRIENDS_PER_EVENT = 1;
    uint256 public constant LOCATION_VERIFICATION_WINDOW = 2 hours;
    address public trustedGPSOracle;
    
    TouchGrassNFT public nftContract;

    // Rate limiting
    mapping(address => uint256) public lastActionTime;
    uint256 public constant ACTION_COOLDOWN = 1 minutes;

    modifier validAddress(address _addr) {
        require(_addr != address(0), "Invalid address");
        require(_addr != msg.sender, "Cannot reference self");
        _;
    }

    modifier rateLimited() {
        require(
            block.timestamp >= lastActionTime[msg.sender] + ACTION_COOLDOWN,
            "Action rate limited"
        );
        lastActionTime[msg.sender] = block.timestamp;
        _;
    }

    constructor() {
        trustedGPSOracle = msg.sender;
        // nftContract will be set after NFT deployment
    }

    /**
     * @dev Set NFT contract address (only owner, only once)
     */
    function setNFTContract(address _nftContract) external onlyOwner {
        require(address(nftContract) == address(0), "NFT contract already set");
        nftContract = TouchGrassNFT(_nftContract);
    }

    /**
     * @dev Attest to a friendship (requires mutual attestation)
     * THIS FUNCTION MUST BE DEFINED BEFORE batchAttestFriends
     */
    function attestFriend(address _friend) public nonReentrant rateLimited {
        require(_friend != msg.sender, "Cannot attest to yourself");
        require(_friend != address(0), "Invalid friend address");

        // Check if friend has already attested to us
        bool friendAttested = friendships[_friend][msg.sender].friend == msg.sender;
        bool isMutual = friendAttested;

        friendships[msg.sender][_friend] = FriendshipAttestation({
            friend: _friend,
            attestedAt: block.timestamp,
            isMutual: isMutual,
            interactionCount: 0
        });

        // If mutual, update both attestations
        if (isMutual) {
            friendships[_friend][msg.sender].isMutual = true;
        }

        emit FriendAttested(msg.sender, _friend, block.timestamp);
    }

    /**
     * @dev Batch attest multiple friends
     * NOW THIS CAN CALL attestFriend BECAUSE IT'S DEFINED ABOVE
     */
    function batchAttestFriends(address[] calldata _friends) external {
        for (uint i = 0; i < _friends.length; i++) {
            attestFriend(_friends[i]);
        }
    }

    /**
     * @dev Create a new GrassDrop event
     */
    function createEvent(
        string memory _name,
        string memory _location,
        uint128 _scheduledTime,
        int128 _centerLat,
        int128 _centerLng,
        uint32 _radiusMeters,
        address[] memory _invitedFriends
    ) external rateLimited returns (uint256) {
        require(bytes(_name).length > 0, "Event name required");
        require(_scheduledTime > block.timestamp + 1 hours, "Event must be at least 1 hour in future");
        require(_invitedFriends.length >= MIN_FRIENDS_PER_EVENT, "Need at least 1 friend");
        require(_invitedFriends.length <= MAX_FRIENDS_PER_EVENT, "Too many friends");
        require(_radiusMeters > 0 && _radiusMeters <= 1000, "Invalid radius");

        // Verify all invited friends are mutually attested
        for (uint i = 0; i < _invitedFriends.length; i++) {
            require(
                friendships[msg.sender][_invitedFriends[i]].isMutual,
                "All friends must be mutually attested"
            );
        }

        _eventIds.increment();
        uint256 eventId = _eventIds.current();

        events[eventId] = GrassEvent({
            id: eventId,
            creator: msg.sender,
            name: _name,
            location: _location,
            scheduledTime: _scheduledTime,
            centerLat: _centerLat,
            centerLng: _centerLng,
            radiusMeters: _radiusMeters,
            invitedFriends: _invitedFriends,
            createdAt: uint128(block.timestamp),
            isActive: true,
            ipfsHash: ""
        });

        userEvents[msg.sender].push(eventId);
        userProfiles[msg.sender].eventsCreated++;

        emit EventCreated(eventId, msg.sender, _name, block.timestamp);
        return eventId;
    }

    /**
     * @dev Verify location (simplified for MVP)
     */
    function verifyLocationSimple(
        uint256 _eventId,
        int256 _lat,
        int256 _lng
    ) external rateLimited {
        GrassEvent memory grassEvent = events[_eventId];
        require(grassEvent.isActive, "Event not active");
        require(!hasAttended[_eventId][msg.sender], "Already verified location");
        
        bool isAuthorized = (msg.sender == grassEvent.creator);
        if (!isAuthorized) {
            for (uint i = 0; i < grassEvent.invitedFriends.length; i++) {
                if (grassEvent.invitedFriends[i] == msg.sender) {
                    isAuthorized = true;
                    break;
                }
            }
        }
        require(isAuthorized, "Not authorized");
        require(_isWithinGeofence(_lat, _lng, grassEvent), "Outside geofence");
        
        // Store location proof
        locationProofs[_eventId][msg.sender] = LocationProof({
            user: msg.sender,
            eventId: _eventId,
            lat: _lat,
            lng: _lng,
            timestamp: block.timestamp,
            signature: ""
        });
        
        // Mark as attended and add to attendees
        hasAttended[_eventId][msg.sender] = true;
        eventAttendees[_eventId].push(msg.sender);
        userProfiles[msg.sender].eventsAttended++;

        emit LocationVerified(msg.sender, _eventId, _lat, _lng);
    }

    /**
     * @dev Finalize collaborative memory and enable minting
     */
    function finalizeMemory(uint256 _eventId, string memory _ipfsHash) external {
        GrassEvent storage grassEvent = events[_eventId];
        require(msg.sender == grassEvent.creator, "Only creator can finalize");
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(eventAttendees[_eventId].length >= 2, "Need at least 2 attendees");

        grassEvent.ipfsHash = _ipfsHash;
    }

    /**
     * @dev Mint memory NFT for event attendee
     */
    function mintMemoryNFT(uint256 _eventId) external nonReentrant returns (uint256) {
        require(address(nftContract) != address(0), "NFT contract not set");
        
        GrassEvent memory grassEvent = events[_eventId];
        require(bytes(grassEvent.ipfsHash).length > 0, "Memory not finalized");
        require(locationProofs[_eventId][msg.sender].user == msg.sender, "Location not verified");

        // Mint NFT through the NFT contract
        uint256 tokenId = nftContract.mintMemoryNFT(
            msg.sender,
            _eventId,
            grassEvent.ipfsHash,
            eventAttendees[_eventId]
        );

        // Update friendship interaction counts
        address[] memory attendees = eventAttendees[_eventId];
        for (uint i = 0; i < attendees.length; i++) {
            if (attendees[i] != msg.sender && friendships[msg.sender][attendees[i]].isMutual) {
                friendships[msg.sender][attendees[i]].interactionCount++;
                friendships[attendees[i]][msg.sender].interactionCount++;
            }
        }

        emit MemoryMinted(_eventId, msg.sender, tokenId);
        return tokenId;
    }

    /**
     * @dev Get user's friendship level with another user
     */
    function getFriendshipLevel(address _user, address _friend) external view returns (uint256) {
        if (!friendships[_user][_friend].isMutual) return 0;
        
        uint256 interactions = friendships[_user][_friend].interactionCount;
        
        // Friendship levels: 1-5 based on interaction count
        if (interactions == 0) return 1;
        if (interactions < 3) return 2;
        if (interactions < 7) return 3;
        if (interactions < 15) return 4;
        return 5;
    }

    /**
     * @dev Get event details
     */
    function getEvent(uint256 _eventId) external view returns (
        address creator,
        string memory name,
        string memory location,
        uint128 scheduledTime,
        address[] memory attendees,
        bool isActive,
        string memory ipfsHash
    ) {
        GrassEvent memory grassEvent = events[_eventId];
        return (
            grassEvent.creator,
            grassEvent.name,
            grassEvent.location,
            grassEvent.scheduledTime,
            eventAttendees[_eventId],
            grassEvent.isActive,
            grassEvent.ipfsHash
        );
    }

    /**
     * @dev Internal function to check if coordinates are within geofence
     * FIXED VERSION - proper distance calculation
     */
    function _isWithinGeofence(int256 _lat, int256 _lng, GrassEvent memory _event) internal pure returns (bool) {
        // Assuming coordinates are stored as degrees * 1e6 for precision
        int256 latDiff = _lat - _event.centerLat;
        int256 lngDiff = _lng - _event.centerLng;
        
        // Convert to approximate meters using rough conversion
        // 1 degree ≈ 111,000 meters (this is simplified - real calculation needs haversine)
        int256 latMeters = (latDiff * 111000) / 1e6;
        int256 lngMeters = (lngDiff * 111000) / 1e6;
        
        // Calculate distance squared to avoid sqrt
        uint256 distanceSquared = uint256(latMeters * latMeters + lngMeters * lngMeters);
        uint256 radiusSquared = uint256(_event.radiusMeters) * uint256(_event.radiusMeters);
        
        return distanceSquared <= radiusSquared;
    }

    /**
     * @dev Cancel event
     */
    function cancelEvent(uint256 _eventId) external {
        require(events[_eventId].creator == msg.sender, "Only creator can cancel");
        events[_eventId].isActive = false;
    }

    /**
     * @dev Remove friend
     */
    function removeFriend(address _friend) external {
        delete friendships[msg.sender][_friend];
        // Note: This doesn't remove the reverse friendship - handle in frontend
    }

    // Admin functions
    function setTrustedGPSOracle(address _oracle) external onlyOwner {
        trustedGPSOracle = _oracle;
    }

    function pauseEvent(uint256 _eventId) external onlyOwner {
        events[_eventId].isActive = false;
    }

    function debugSetEventActive(uint256 _eventId, bool _active) external onlyOwner {
        events[_eventId].isActive = _active;
    }

    function debugAddAttendee(uint256 _eventId, address _attendee) external onlyOwner {
        if (!hasAttended[_eventId][_attendee]) {
            eventAttendees[_eventId].push(_attendee);
            locationProofs[_eventId][_attendee] = LocationProof({
                user: _attendee,
                eventId: _eventId,
                lat: 0,
                lng: 0,
                timestamp: block.timestamp,
                signature: ""
            });
            hasAttended[_eventId][_attendee] = true;
        }
    }
}

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
        address[] crewMembers;
        uint256 mintedAt;
        string baseIPFSHash;
        uint256 friendshipLevel;
        bool isPublic;
    }

    Counters.Counter private _tokenIds;
    TouchGrassCore public coreContract;
    
    mapping(uint256 => MemoryNFT) public memoryNFTs;
    mapping(uint256 => mapping(address => uint256)) public eventToUserToken; // eventId => user => tokenId
    
    string public baseMetadataURI;

    constructor() ERC721("TouchGrass Memory", "TGMEM") {
        baseMetadataURI = "https://api.touchgrass.app/metadata/";
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
     * @dev Update NFT metadata when friendship level changes
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
     * @dev Get memory details
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
     * @dev Get all public memories for cultural feed
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
     * @dev Calculate friendship level based on crew interactions
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
     * @dev Convert uint to string
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

    // Override required by Solidity
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

/**
 * @title TouchGrassPaymaster  
 * @dev Paymaster contract for gasless onboarding
 * Sponsors gas for first-time users and specific operations
 */
contract TouchGrassPaymaster is Ownable {
    
    // Events
    event UserSponsored(address indexed user, uint256 gasUsed, uint256 gasPrice);
    event SponsorshipBudgetUpdated(uint256 newBudget);
    
    // State
    mapping(address => bool) public hasReceivedSponsorship;
    mapping(address => uint256) public userSponsoredGas;
    
    uint256 public sponsorshipBudget;
    uint256 public maxSponsorshipPerUser = 0.001 ether; // Max gas sponsorship per user
    uint256 public totalSponsored;
    
    TouchGrassCore public coreContract;
    TouchGrassNFT public nftContract;
    
    constructor(address _coreContract, address _nftContract) {
        coreContract = TouchGrassCore(_coreContract);
        nftContract = TouchGrassNFT(_nftContract);
        sponsorshipBudget = 1 ether; // Initial budget
    }
    
    /**
     * @dev Check if user is eligible for gas sponsorship
     */
    function isEligibleForSponsorship(address _user) public view returns (bool) {
        return !hasReceivedSponsorship[_user] && 
               userSponsoredGas[_user] < maxSponsorshipPerUser &&
               address(this).balance >= maxSponsorshipPerUser;
    }
    
    /**
     * @dev Sponsor gas for eligible users
     */
    function sponsorGas(address _user, uint256 _gasUsed, uint256 _gasPrice) external {
        require(msg.sender == address(coreContract) || msg.sender == address(nftContract), "Unauthorized");
        require(isEligibleForSponsorship(_user), "User not eligible");
        
        uint256 gasRefund = _gasUsed * _gasPrice;
        require(gasRefund <= maxSponsorshipPerUser, "Refund exceeds limit");
        require(address(this).balance >= gasRefund, "Insufficient balance");
        
        hasReceivedSponsorship[_user] = true;
        userSponsoredGas[_user] += gasRefund;
        totalSponsored += gasRefund;
        
        payable(_user).transfer(gasRefund);
        
        emit UserSponsored(_user, _gasUsed, _gasPrice);
    }
    
    /**
     * @dev Add funds to sponsorship budget
     */
    function addFunds() external payable onlyOwner {
        sponsorshipBudget += msg.value;
        emit SponsorshipBudgetUpdated(sponsorshipBudget);
    }
    
    /**
     * @dev Withdraw excess funds
     */
    function withdrawFunds(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient balance");
        payable(owner()).transfer(_amount);
    }
    
    /**
     * @dev Update sponsorship parameters
     */
    function updateSponsorshipParams(uint256 _maxPerUser) external onlyOwner {
        maxSponsorshipPerUser = _maxPerUser;
    }
    
    receive() external payable {
        sponsorshipBudget += msg.value;
    }
}

//-------------------------------------------------not needed as of now----------------------------------
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

// contract TouchGrassCoreUpgradeable is 
//     Initializable, 
//     UUPSUpgradeable, 
//     OwnableUpgradeable 
// {
//     // ... your existing code with initializer instead of constructor
    
//     function initialize() public initializer {
//         __Ownable_init();
//         __UUPSUpgradeable_init();
//         // Initialize your variables
//     }
    
//     function _authorizeUpgrade(address) internal override onlyOwner {}
// }


//------------------------------FUTURE ADD ONS------------------------------

    // /**
    //  * @dev Verify location for an event (with GPS signature)-- mainly for launch
    //  */
    // function verifyLocation(
    //     uint256 _eventId,
    //     int256 _lat,
    //     int256 _lng,
    //     bytes memory _gpsSignature
    // ) external {
    //     GrassEvent memory grassEvent = events[_eventId];
    //     require(grassEvent.isActive, "Event not active");
    //     require(
    //         block.timestamp >= grassEvent.scheduledTime - LOCATION_VERIFICATION_WINDOW &&
    //         block.timestamp <= grassEvent.scheduledTime + LOCATION_VERIFICATION_WINDOW,
    //         "Outside verification window"
    //     );

    //     // Verify user is invited or is creator
    //     bool isAuthorized = (msg.sender == grassEvent.creator);
    //     if (!isAuthorized) {
    //         for (uint i = 0; i < grassEvent.invitedFriends.length; i++) {
    //             if (grassEvent.invitedFriends[i] == msg.sender) {
    //                 isAuthorized = true;
    //                 break;
    //             }
    //         }
    //     }
    //     require(isAuthorized, "Not authorized for this event");

    //     // Verify GPS signature (simplified - in production, use proper GPS oracle)
    //     bytes32 locationHash = keccak256(abi.encodePacked(_eventId, msg.sender, _lat, _lng, block.timestamp));
    //     require(_verifyGPSSignature(locationHash, _gpsSignature), "Invalid GPS signature");

    //     // Check if location is within geofence
    //     require(_isWithinGeofence(_lat, _lng, grassEvent), "Outside event geofence");

    //     locationProofs[_eventId][msg.sender] = LocationProof({
    //         user: msg.sender,
    //         eventId: _eventId,
    //         lat: _lat,
    //         lng: _lng,
    //         timestamp: block.timestamp,
    //         signature: _gpsSignature
    //     });

    //     // Add to attendees if not already present
    //     address[] storage attendees = eventAttendees[_eventId];
    //     bool alreadyAttending = false;
    //     for (uint i = 0; i < attendees.length; i++) {
    //         if (attendees[i] == msg.sender) {
    //             alreadyAttending = true;
    //             break;
    //         }
    //     }
    //     if (!alreadyAttending) {
    //         attendees.push(msg.sender);
    //     }

    //     emit LocationVerified(msg.sender, _eventId, _lat, _lng);
    // }
