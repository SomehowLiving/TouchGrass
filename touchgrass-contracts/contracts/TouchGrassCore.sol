// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./TouchGrassNFT.sol";
contract TouchGrassCore is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using ECDSA for bytes32;

    // Events to notify off-chain
    event EventCreated(uint256 indexed eventId, address indexed creator, string name, uint256 timestamp);
    event FriendAttested(address indexed attester, address indexed friend, uint256 timestamp);
    event LocationVerified(address indexed user, uint256 indexed eventId, int256 lat, int256 lng);
    event MemoryMinted(uint256 indexed eventId, address indexed minter, uint256 tokenId);
    event EventDetailsStored(uint256 indexed eventId, string name, string location, address[] invitedFriends);

    // Structs
    struct GrassEvent {
        uint256 id;
        address creator;
        uint128 scheduledTime;  // when event is plsnned to happen
        uint128 createdAt;  // time it was created
        int128 centerLng;   // Longitude * 1e6 for precision
        int128 centerLat;   // Latitude 
        uint32 radiusMeters;    // Radius around center for valid location
        bool isActive;  //Flag to check if its active
        string name;    // event name
        string location;    // Human readable
        string ipfsHash;    // IPFS hash of collaborative memory after event
        address[] invitedFriends;   // List of invited friends
    }

    struct LocationProof {
        address user;   // who submitted
        uint256 eventId;    // for what event
        int256 lat;     // submitted lat
        int256 lng;     //submitted lug
        uint256 timestamp;  // when proof was submitted
        bytes signature;    // GPS- signature(from oracle or off-chain relyer.. currently not used)
    }

    struct FriendshipAttestation {
        address friend;     // which friend attested
        uint256 attestedAt;     // when did they
        bool isMutual;      // are they mutual
        uint256 interactionCount;       // tracking their interactions
    }

    struct UserProfile {
        uint256 eventsAttended;     // no. of events attended     
        uint256 eventsCreated;      // no. of events created
        bool isVerified;        // user verication flag- unused as of now
        bytes32 deviceFingerprint;      // Sybil resistance - unused as of now
    }

    // State variables 
    Counters.Counter private _eventIds;     // counter for unique event IDs
    
    mapping(uint256 => GrassEvent) public events;       // event ids to grassEvent
    mapping(address => mapping(address => FriendshipAttestation)) public friendships;       // user address to frient to friend attestation
    mapping(uint256 => mapping(address => LocationProof)) public locationProofs;        // event id->user address-> loc proof
    mapping(uint256 => address[]) public eventAttendees;        // event id->attendees
    mapping(address => uint256[]) public userEvents;        // user addres to list of event IDS they created
    mapping(address => UserProfile) public userProfiles;        // user addres to their profile
    mapping(bytes32 => address) public deviceToUser;        // device fingerprint to user address
    mapping(uint256 => mapping(address => bool)) public hasAttended; // To prevent duplicates
    
    // Configuration
    uint256 public constant MAX_FRIENDS_PER_EVENT = 6;
    uint256 public constant MIN_FRIENDS_PER_EVENT = 1;
    uint256 public constant LOCATION_VERIFICATION_WINDOW = 2 hours;     // not used as of now
    address public trustedGPSOracle;        // Oracle address trusted for GPS verification
    
    TouchGrassNFT public nftContract;

    // Rate limiting to prevent spamming actions
    mapping(address => uint256) public lastActionTime;
    uint256 public constant ACTION_COOLDOWN = 1 minutes;

    // Modifiers
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

    // constructor
    constructor() {
        trustedGPSOracle = msg.sender;
        // nftContract will be set after NFT deployment since it was leading to circular dependency
    }

    /**
     * @dev Set NFT contract address (only owner, only once)
     */
    function setNFTContract(address _nftContract) external onlyOwner {
        require(address(nftContract) == address(0), "NFT contract already set");
        nftContract = TouchGrassNFT(_nftContract);
    }

    /**
     * @dev Attest friendship with another user.
     * - Ensures you can't attest yourself.
     * - Records your attestation.
     * - If the other user already attested you, marks it as mutual.
     * - Emits event to notify listeners.
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
     * @dev Can attest multiple friends in a batch
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

        // Verify all invited friends are mutually attested with creatorr
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
        // if user is event creator or invited friend- they r authorised
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

        // confirm loc is inside the geofence radius
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
     * in frontend the collaboaration etc will happen
     * only created can finalise it 
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

        // Update friendship interaction counts among attendees
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
     * @dev Get user's friendship level(1-5) with another user
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
        // 1 degree ≈ 111,000 meters (this is simplified - real calculation needs haversine -- will do in backend)
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
        // Note: This doesn't remove the reverse(since mutual) friendship - handle in frontend
    }

    // Admin functions
    function setTrustedGPSOracle(address _oracle) external onlyOwner {
        trustedGPSOracle = _oracle;
    }

    /**
     * @dev Emergency pause event (only owner)
     */
    function pauseEvent(uint256 _eventId) external onlyOwner {
        events[_eventId].isActive = false;
    }
// Lets the contract owner manually set whether an event is isActive (true/false).
// so to Quickly start or stop an event without going through normal event lifecycle code.
// Useful for testing behavior when an event is "active" or "inactive".
    function debugSetEventActive(uint256 _eventId, bool _active) external onlyOwner {
        events[_eventId].isActive = _active;
    }

// Force-adds an attendee to an event’s attendee list.
// Creates a dummy LocationProof entry for that attendee (lat/lng are set to 0 just as placeholders).
// TO Bypass normal location verification for manual attendance insertion.
// Testing “attendee” dependent features without needing GPS verification.
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
