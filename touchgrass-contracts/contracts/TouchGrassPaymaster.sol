// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TouchGrassCore.sol";
import "./TouchGrassNFT.sol";

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
