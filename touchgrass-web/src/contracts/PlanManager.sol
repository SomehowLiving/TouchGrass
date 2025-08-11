// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEAS {
    struct AttestationRequestData {
        address recipient;
        uint64 expirationTime;
        bool revocable;
        bytes32 refUID;
        bytes data;
        uint256 value;
    }

    struct AttestationRequest {
        bytes32 schema;
        AttestationRequestData data;
    }

    function attest(AttestationRequest calldata request) external payable;
}

abstract contract Ownable2Step {
    address private _owner;
    address private _pendingOwner;
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() payable {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "Ownable: caller is not the owner");
        _;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function transferOwnership(address newOwner) external payable onlyOwner {
        require(newOwner != address(0), "newOwner is zero address");
        if (_pendingOwner != newOwner) {
            _pendingOwner = newOwner;
            emit OwnershipTransferStarted(_owner, newOwner);
        }
    }

    function acceptOwnership() external {
        require(msg.sender == _pendingOwner, "Only pending owner can accept");
        emit OwnershipTransferred(_owner, _pendingOwner);
        _owner = _pendingOwner;
        _pendingOwner = address(0);
    }
}

contract PlanManager is Ownable2Step {
    struct Plan {
        address creator;
        address[] invitees;
        mapping(address => bool) accepted;
        bool memoryCreated;
    }

    IEAS public immutable eas;
    bytes32 public immutable friendshipSchema;
    uint256 public planCounter;
    mapping(uint256 planId => Plan) public plans;
    mapping(address user => mapping(address homie => bool)) public isHomie;

    event PlanCreated(uint256 indexed planId, address indexed creator, address[] invitees);
    event PlanAccepted(uint256 indexed planId, address indexed homie);
    event FriendshipAttested(address indexed user, address indexed friend);

    constructor(address easAddress, bytes32 schemaUID) payable {
        require(easAddress != address(0), "zero address");
        eas = IEAS(easAddress);
        friendshipSchema = schemaUID;
    }

    function getInvitees(uint256 planId) external view returns (address[] memory) {
        return plans[planId].invitees;
    }

    function createPlan(address[] calldata invitees) external returns (uint256 planId) {
        require(invitees.length > 1, "Minimum 2 invitees");
        require(invitees.length < 7, "Maximum 6 invitees");

        planId = planCounter++;
        Plan storage plan = plans[planId];
        plan.creator = msg.sender;
        plan.invitees = invitees;

        emit PlanCreated(planId, msg.sender, invitees);
    }

    function acceptPlan(uint256 planId) external {
        Plan storage plan = plans[planId];
        require(!plan.accepted[msg.sender], "Already accepted");

        address[] storage invitees = plan.invitees;
        uint256 len = invitees.length;
        bool isInvited = false;
        unchecked {
            for (uint i = 0; i < len; ++i) {
                if (invitees[i] == msg.sender) {
                    isInvited = true;
                    break;
                }
            }
        }
        require(isInvited, "Not invited");

        plan.accepted[msg.sender] = true;
        emit PlanAccepted(planId, msg.sender);

        if (!isHomie[plan.creator][msg.sender]) {
            isHomie[plan.creator][msg.sender] = true;
            isHomie[msg.sender][plan.creator] = true;

            IEAS.AttestationRequestData memory data = IEAS.AttestationRequestData({
                recipient: msg.sender,
                expirationTime: 0,
                revocable: true,
                refUID: bytes32(0),
                data: abi.encodePacked(plan.creator, msg.sender, uint64(block.timestamp)),
                value: 0
            });

            eas.attest(IEAS.AttestationRequest({schema: friendshipSchema, data: data}));
            emit FriendshipAttested(plan.creator, msg.sender);
        }
    }
}
