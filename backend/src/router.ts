// import './types/express';
import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ethers } from 'ethers';

const router = Router();
require('dotenv').config();

// Contract ABIs and addresses (would be loaded from environment)
const TOUCHGRASS_CORE_ADDRESS = process.env.TOUCHGRASS_CORE_ADDRESS || '';
const TOUCHGRASS_NFT_ADDRESS = process.env.TOUCHGRASS_NFT_ADDRESS || '';
const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';
const IS_LOCAL = process.env.NODE_ENV === 'development' || process.env.IS_LOCAL === 'true';

// Initialize provider and contracts
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Simplified contract ABIs - in production, load full ABIs
const coreABI = require('./abis/TouchGrassCore.json');
const nftABI = require('./abis/TouchGrassNFT.json');
const paymasterABI = require('./abis/TouchGrassPaymaster.json');

// Contract instances
const coreContract = new ethers.Contract(TOUCHGRASS_CORE_ADDRESS, coreABI, provider);
const nftContract = new ethers.Contract(TOUCHGRASS_NFT_ADDRESS, nftABI, provider);

// Interface for /friendships/:address1/:address2 route params
interface FriendshipParams {
  address1: string;
  address2: string;
}

// Interface for routes with eventId param
interface EventIdParams {
  eventId: string; // Will be converted to number via validation
}

// Interface for routes with tokenId param
interface TokenIdParams {
  tokenId: string; // Will be converted to number via validation
}

// Interface for /nfts/public query params
interface PublicNftsQuery {
  offset?: string; // Will be converted to number via validation
  limit?: string; // Will be converted to number via validation
}

// Define interface for the request body
interface MakePublicBody {
  ownerAddress: string;
  privateKey?: string; // Optional for local testing
}

// Extended interfaces for local testing
interface LocalTestingBody {
  privateKey?: string;
  executeTransaction?: boolean;
}

// Middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const validateAddress = (field: string) => 
  body(field).custom((value) => {
    if (!ethers.isAddress(value)) {
      throw new Error('Invalid Ethereum address');
    }
    return true;
  });

// Validate private key for local testing
const validatePrivateKey = () =>
  body('privateKey').optional().custom((value) => {
    if (value && !IS_LOCAL) {
      throw new Error('Private key only allowed in local environment');
    }
    if (value) {
      try {
        new ethers.Wallet(value);
        return true;
      } catch {
        throw new Error('Invalid private key format');
      }
    }
    return true;
  });

// Helper function to verify message signature
const verifySignature = (message: string, signature: string, expectedAddress: string): boolean => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch {
    return false;
  }
};

// Helper function to execute transaction locally
const executeTransaction = async (txData: any, privateKey: string) => {
  try {
    const wallet = new ethers.Wallet(privateKey, provider);
    const tx = await wallet.sendTransaction(txData);
    const receipt = await tx.wait();
    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
      gasUsed: receipt?.gasUsed?.toString()
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Transaction failed'
    };
  }
};

// Helper function to prepare response based on local vs production mode
const prepareResponse = async (txData: any, privateKey?: string, executeFlag?: boolean) => {
  if (IS_LOCAL && privateKey && executeFlag) {
    const result = await executeTransaction(txData, privateKey);
    return {
      mode: 'local_execution',
      txData,
      execution: result
    };
  } else {
    return {
      mode: 'transaction_preparation',
      txData,
      estimatedGas: '50000'
    };
  }
};

// FRIENDSHIP ROUTES

// POST /api/v1/friendships/attest - Prepare transaction data for frontend
router.post('/friendships/attest',
  validateAddress('userAddress'),
  validateAddress('friendAddress'),
  validatePrivateKey(),
  body('executeTransaction').optional().isBoolean(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userAddress, friendAddress, privateKey, executeTransaction: execute } = req.body;

      if (userAddress.toLowerCase() === friendAddress.toLowerCase()) {
        return res.status(400).json({ error: 'Cannot attest to yourself' });
      }

      // Verify private key matches user address if provided
      if (privateKey) {
        const wallet = new ethers.Wallet(privateKey);
        if (wallet.address.toLowerCase() !== userAddress.toLowerCase()) {
          return res.status(400).json({ error: 'Private key does not match user address' });
        }
      }

      const txData = {
        to: TOUCHGRASS_CORE_ADDRESS,
        data: coreContract.interface.encodeFunctionData('attestFriend', [friendAddress]),
        value: '0'
      };

      const response = await prepareResponse(txData, privateKey, execute);
      res.json({ 
        message: 'Friendship attestation prepared',
        ...response
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to prepare attestation' });
    }
  }
);

// GET /api/v1/friendships/:address1/:address2 - Read from contract
router.get('/friendships/:address1/:address2',
  param('address1').custom(value => ethers.isAddress(value)),
  param('address2').custom(value => ethers.isAddress(value)),
  handleValidationErrors,
  async (req: Request<FriendshipParams>, res: Response, next: NextFunction) => {
    try {
      const { address1, address2 } = req.params;
      const friendship = await coreContract.friendships(address1, address2);
      const friendshipLevel = await coreContract.getFriendshipLevel(address1, address2);
      
      res.json({
        friend: friendship.friend,
        isMutual: friendship.isMutual,
        timestamp: friendship.timestamp.toString(),
        level: friendshipLevel.toString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch friendship data' });
    }
  }
);

// POST /api/v1/friendships/batch-attest
router.post('/friendships/batch-attest',
  validateAddress('userAddress'),
  body('friends').isArray().custom((friends) => {
    return friends.every((friend: string) => ethers.isAddress(friend));
  }),
  validatePrivateKey(),
  body('executeTransaction').optional().isBoolean(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userAddress, friends, privateKey, executeTransaction: execute } = req.body;

      if (friends.length === 0 || friends.length > 10) {
        return res.status(400).json({ error: 'Friends array must contain 1-10 addresses' });
      }

      if (friends.some((friend: string) => friend.toLowerCase() === userAddress.toLowerCase())) {
        return res.status(400).json({ error: 'Cannot attest to yourself' });
      }

      // Verify private key matches user address if provided
      if (privateKey) {
        const wallet = new ethers.Wallet(privateKey);
        if (wallet.address.toLowerCase() !== userAddress.toLowerCase()) {
          return res.status(400).json({ error: 'Private key does not match user address' });
        }
      }

      const txData = {
        to: TOUCHGRASS_CORE_ADDRESS,
        data: coreContract.interface.encodeFunctionData('batchAttestFriends', [friends]),
        value: '0'
      };

      const response = await prepareResponse(txData, privateKey, execute);
      res.json({ 
        message: 'Batch attestation prepared',
        friendCount: friends.length,
        ...response
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to prepare batch attestation' });
    }
  }
);

// EVENT ROUTES

// POST /api/v1/events/prepare - Prepare event creation transaction
router.post('/events/prepare',
  validateAddress('creator'),
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('location').trim().isLength({ min: 1, max: 200 }),
  body('scheduledTime').isInt({ min: Math.floor(Date.now() / 1000) + 3600 }),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  body('radius').isInt({ min: 1, max: 10000 }),
  body('invitedFriends').isArray({ min: 1 }).custom((friends) => {
    return friends.every((friend: string) => ethers.isAddress(friend));
  }),
  validatePrivateKey(),
  body('executeTransaction').optional().isBoolean(),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { creator, name, location, scheduledTime, latitude, longitude, radius, invitedFriends, privateKey, executeTransaction: execute } = req.body;

      // Verify private key matches creator address if provided
      if (privateKey) {
        const wallet = new ethers.Wallet(privateKey);
        if (wallet.address.toLowerCase() !== creator.toLowerCase()) {
          return res.status(400).json({ error: 'Private key does not match creator address' });
        }
      }

      // Convert coordinates to contract format (multiply by 1e6)
      const lat = Math.round(latitude * 1e6);
      const lng = Math.round(longitude * 1e6);

      // Validate mutual friendships (optional check on backend)
      for (const friend of invitedFriends) {
        try {
          const friendship = await coreContract.friendships(creator, friend);
          if (!friendship.isMutual) {
            return res.status(400).json({ 
              error: `Friend ${friend} is not mutually attested` 
            });
          }
        } catch (error) {
          // Skip validation if contract call fails
        }
      }

      const txData = {
        to: TOUCHGRASS_CORE_ADDRESS,
        data: coreContract.interface.encodeFunctionData('createEvent', [
          name, location, scheduledTime, lat, lng, radius, invitedFriends
        ]),
        value: '0'
      };

      const response = await prepareResponse(txData, privateKey, execute);
      res.json({ 
        message: 'Event creation prepared',
        ...response
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to prepare event creation' });
    }
  }
);

// GET /api/v1/events/:eventId - Read event from contract
router.get('/events/:eventId',
  param('eventId').isInt().toInt(),
  handleValidationErrors,
  async (req: Request<EventIdParams>, res: Response, next: NextFunction) => {
    try {
      const eventId = Number(req.params.eventId);
      const eventData = await coreContract.events(eventId);
      
      const event = {
        id: eventId,
        creator: eventData.creator,
        name: eventData.name,
        location: eventData.location,
        scheduledTime: eventData.scheduledTime.toString(),
        latitude: Number(eventData.lat) / 1e6,
        longitude: Number(eventData.lng) / 1e6,
        radius: eventData.radius.toString(),
        isActive: eventData.isActive,
        ipfsHash: eventData.ipfsHash || null
      };

      res.json({ event });
    } catch (error) {
      res.status(404).json({ error: 'Event not found' });
    }
  }
);

// POST /api/v1/events/:eventId/verify-location/prepare
router.post('/events/:eventId/verify-location/prepare',
  param('eventId').isInt().toInt(),
  validateAddress('userAddress'),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  validatePrivateKey(),
  body('executeTransaction').optional().isBoolean(),
  handleValidationErrors,
  async (req: Request<EventIdParams>, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.eventId;
      const { userAddress, latitude, longitude, privateKey, executeTransaction: execute } = req.body;

      // Verify private key matches user address if provided
      if (privateKey) {
        const wallet = new ethers.Wallet(privateKey);
        if (wallet.address.toLowerCase() !== userAddress.toLowerCase()) {
          return res.status(400).json({ error: 'Private key does not match user address' });
        }
      }

      // Check if user already verified location
      try {
        const locationProof = await coreContract.locationProofs(eventId, userAddress);
        if (locationProof.verified) {
          return res.status(400).json({ error: 'Location already verified' });
        }
      } catch (error) {
        // Continue if check fails
      }

      // Get event details for geofence validation
      const eventData = await coreContract.events(eventId);
      const eventLat = Number(eventData.lat) / 1e6;
      const eventLng = Number(eventData.lng) / 1e6;
      const radius = Number(eventData.radius);

      // Calculate distance using Haversine formula
      const R = 6371e3; // Earth's radius in meters
      const φ1 = eventLat * Math.PI / 180;
      const φ2 = latitude * Math.PI / 180;
      const Δφ = (latitude - eventLat) * Math.PI / 180;
      const Δλ = (longitude - eventLng) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      if (distance > radius) {
        return res.status(400).json({ 
          error: 'Location outside geofence',
          distance: Math.round(distance),
          maxDistance: radius
        });
      }

      const lat = Math.round(latitude * 1e6);
      const lng = Math.round(longitude * 1e6);

      const txData = {
        to: TOUCHGRASS_CORE_ADDRESS,
        data: coreContract.interface.encodeFunctionData('verifyLocationSimple', [
          eventId, lat, lng
        ]),
        value: '0'
      };

      const response = await prepareResponse(txData, privateKey, execute);
      res.json({ 
        message: 'Location verification prepared',
        distance: Math.round(distance),
        ...response
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to prepare location verification' });
    }
  }
);

// GET /api/v1/events/:eventId/attendees
router.get('/events/:eventId/attendees',
  param('eventId').isInt().toInt(),
  handleValidationErrors,
  async (req: Request<EventIdParams>, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.eventId;
      
      // Get event data to find creator and invited friends
      const eventData = await coreContract.events(eventId);
      const potentialAttendees = [eventData.creator]; // Include creator
      
      // Check attendance for each potential attendee
      const attendees = [];
      for (const user of potentialAttendees) {
        try {
          const hasAttended = await coreContract.hasAttended(eventId, user);
          if (hasAttended) {
            const locationProof = await coreContract.locationProofs(eventId, user);
            attendees.push({
              address: user,
              latitude: Number(locationProof.lat) / 1e6,
              longitude: Number(locationProof.lng) / 1e6,
              timestamp: locationProof.timestamp.toString()
            });
          }
        } catch (error) {
          // Skip if can't check attendance
        }
      }

      res.json({ attendees });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch attendees' });
    }
  }
);

// POST /api/v1/events/:eventId/finalize-memory/prepare
router.post('/events/:eventId/finalize-memory/prepare',
  param('eventId').isInt().toInt(),
  validateAddress('creatorAddress'),
  body('ipfsHash').matches(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/),
  validatePrivateKey(),
  body('executeTransaction').optional().isBoolean(),
  handleValidationErrors,
  async (req: Request<EventIdParams>, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.eventId;
      const { creatorAddress, ipfsHash, privateKey, executeTransaction: execute } = req.body;

      // Verify private key matches creator address if provided
      if (privateKey) {
        const wallet = new ethers.Wallet(privateKey);
        if (wallet.address.toLowerCase() !== creatorAddress.toLowerCase()) {
          return res.status(400).json({ error: 'Private key does not match creator address' });
        }
      }

      // Verify creator owns the event
      const eventData = await coreContract.events(eventId);
      if (eventData.creator.toLowerCase() !== creatorAddress.toLowerCase()) {
        return res.status(403).json({ error: 'Only event creator can finalize memory' });
      }

      const txData = {
        to: TOUCHGRASS_CORE_ADDRESS,
        data: coreContract.interface.encodeFunctionData('finalizeMemory', [
          eventId, ipfsHash
        ]),
        value: '0'
      };

      const response = await prepareResponse(txData, privateKey, execute);
      res.json({ 
        message: 'Memory finalization prepared',
        ...response
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to prepare memory finalization' });
    }
  }
);

// POST /api/v1/events/:eventId/mint-nft/prepare
router.post('/events/:eventId/mint-nft/prepare',
  param('eventId').isInt().toInt(),
  validateAddress('userAddress'),
  validatePrivateKey(),
  body('executeTransaction').optional().isBoolean(),
  handleValidationErrors,
  async (req: Request<EventIdParams>, res: Response, next: NextFunction) => {
    try {
      const eventId = req.params.eventId;
      const { userAddress, privateKey, executeTransaction: execute } = req.body;

      // Verify private key matches user address if provided
      if (privateKey) {
        const wallet = new ethers.Wallet(privateKey);
        if (wallet.address.toLowerCase() !== userAddress.toLowerCase()) {
          return res.status(400).json({ error: 'Private key does not match user address' });
        }
      }

      // Check if user attended the event
      const hasAttended = await coreContract.hasAttended(eventId, userAddress);
      if (!hasAttended) {
        return res.status(400).json({ error: 'User did not attend this event' });
      }

      // Check if event memory is finalized
      const eventData = await coreContract.events(eventId);
      if (!eventData.ipfsHash) {
        return res.status(400).json({ error: 'Event memory not finalized yet' });
      }

      const txData = {
        to: TOUCHGRASS_CORE_ADDRESS,
        data: coreContract.interface.encodeFunctionData('mintMemoryNFT', [eventId]),
        value: '0'
      };

      const response = await prepareResponse(txData, privateKey, execute);
      res.json({ 
        message: 'NFT minting prepared',
        ...response
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to prepare NFT minting' });
    }
  }
);

// NFT ROUTES

// GET /api/v1/nfts/:tokenId/details
router.get('/nfts/:tokenId/details',
  param('tokenId').isInt().toInt(),
  handleValidationErrors,
  async (req: Request<TokenIdParams>, res: Response, next: NextFunction) => {
    try {
      const tokenId = Number(req.params.tokenId);
      const [owner, memoryDetails] = await Promise.all([
        nftContract.ownerOf(tokenId),
        nftContract.getMemoryDetails(tokenId)
      ]);

      res.json({
        tokenId,
        owner,
        eventId: memoryDetails.eventId.toString(),
        baseIPFSHash: memoryDetails.baseIPFSHash,
        friendshipLevel: memoryDetails.friendshipLevel.toString(),
        isPublic: memoryDetails.isPublic
      });
    } catch (error) {
      res.status(404).json({ error: 'NFT not found' });
    }
  }
);

// GET /api/v1/nfts/public
router.get('/nfts/public',
  query('offset').optional().isInt({ min: 0 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  handleValidationErrors,
  async (req: Request<{}, {}, {}, PublicNftsQuery>, res: Response, next: NextFunction) => {
    try {
      const offset = Number(req.query.offset) || 0;
      const limit = Number(req.query.limit) || 20;

      const publicTokenIds = await nftContract.getPublicMemories(offset, limit);
      
      // Get details for each public NFT
      const nfts = await Promise.all(
        publicTokenIds.map(async (tokenId: bigint) => {
          try {
            const [owner, details] = await Promise.all([
              nftContract.ownerOf(tokenId),
              nftContract.getMemoryDetails(tokenId)
            ]);
            return {
              tokenId: tokenId.toString(),
              owner,
              eventId: details.eventId.toString(),
              baseIPFSHash: details.baseIPFSHash,
              friendshipLevel: details.friendshipLevel.toString()
            };
          } catch {
            return null;
          }
        })
      );

      res.json({ 
        nfts: nfts.filter(nft => nft !== null),
        offset,
        limit 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch public NFTs' });
    }
  }
);

// POST /api/v1/nfts/:tokenId/make-public/prepare
router.post('/nfts/:tokenId/make-public/prepare',
  param('tokenId').isInt().toInt(),
  validateAddress('ownerAddress'),
  validatePrivateKey(),
  body('executeTransaction').optional().isBoolean(),
  handleValidationErrors,
  async (req: Request<TokenIdParams, {}, MakePublicBody & LocalTestingBody>, res: Response, next: NextFunction) => {
    try {
      const tokenId = Number(req.params.tokenId);
      const { ownerAddress, privateKey, executeTransaction: execute } = req.body;

      // Verify private key matches owner address if provided
      if (privateKey) {
        const wallet = new ethers.Wallet(privateKey);
        if (wallet.address.toLowerCase() !== ownerAddress.toLowerCase()) {
          return res.status(400).json({ error: 'Private key does not match owner address' });
        }
      }

      // Verify ownership
      const actualOwner = await nftContract.ownerOf(tokenId);
      if (actualOwner.toLowerCase() !== ownerAddress.toLowerCase()) {
        return res.status(403).json({ error: 'Not the owner of this NFT' });
      }

      const txData = {
        to: TOUCHGRASS_NFT_ADDRESS,
        data: nftContract.interface.encodeFunctionData('makeMemoryPublic', [tokenId]),
        value: '0'
      };

      const response = await prepareResponse(txData, privateKey, execute);
      res.json({ 
        message: 'Make public transaction prepared',
        ...response
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to prepare make public transaction' });
    }
  }
);

// UTILITY ROUTES

// POST /api/v1/utils/validate-location
router.post('/utils/validate-location',
  body('eventId').isInt().toInt(),
  body('userLat').isFloat({ min: -90, max: 90 }),
  body('userLng').isFloat({ min: -180, max: 180 }),
  handleValidationErrors,
  async (req, res) => {
    try {
      const { eventId, userLat, userLng } = req.body;
      
      const eventData = await coreContract.events(eventId);
      const eventLat = Number(eventData.lat) / 1e6;
      const eventLng = Number(eventData.lng) / 1e6;
      const radius = Number(eventData.radius);

      // Haversine formula
      const R = 6371e3;
      const φ1 = eventLat * Math.PI / 180;
      const φ2 = userLat * Math.PI / 180;
      const Δφ = (userLat - eventLat) * Math.PI / 180;
      const Δλ = (userLng - eventLng) * Math.PI / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      res.json({
        distance: Math.round(distance),
        withinGeofence: distance <= radius,
        maxDistance: radius
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to validate location' });
    }
  }
);

// NEW: Local testing utility routes

// GET /api/v1/utils/environment
router.get('/utils/environment', (req, res) => {
  res.json({
    isLocal: IS_LOCAL,
    nodeEnv: process.env.NODE_ENV,
    rpcUrl: RPC_URL,
    contractAddresses: {
      core: TOUCHGRASS_CORE_ADDRESS,
      nft: TOUCHGRASS_NFT_ADDRESS
    }
  });
});

// POST /api/v1/utils/derive-address
router.post('/utils/derive-address',
  validatePrivateKey(),
  handleValidationErrors,
  (req, res) => {
    try {
      const { privateKey } = req.body;
      
      if (!IS_LOCAL) {
        return res.status(403).json({ error: 'Address derivation only available in local environment' });
      }

      const wallet = new ethers.Wallet(privateKey);
      const signingKey = new ethers.SigningKey(privateKey);
      res.json({
        address: wallet.address,
        publicKey: signingKey.publicKey
      });
    } catch (error) {
      res.status(400).json({ error: 'Invalid private key' });
    }
  }
);

export { router };







// // import './types/express';
// import { Router, Request, Response, NextFunction } from 'express';
// import { body, param, query, validationResult } from 'express-validator';
// import { ethers } from 'ethers';

// const router = Router();
// require('dotenv').config();
// // Contract ABIs and addresses (would be loaded from environment)
// const TOUCHGRASS_CORE_ADDRESS = process.env.TOUCHGRASS_CORE_ADDRESS || '';
// const TOUCHGRASS_NFT_ADDRESS = process.env.TOUCHGRASS_NFT_ADDRESS || '';
// const RPC_URL = process.env.RPC_URL || 'http://localhost:8545';

// // Initialize provider and contracts
// const provider = new ethers.JsonRpcProvider(RPC_URL);

// // Simplified contract ABIs - in production, load full ABIs
// const coreABI = require('./abis/TouchGrassCore.json');
// const nftABI = require('./abis/TouchGrassNFT.json');
// const paymasterABI = require('./abis/TouchGrassPaymaster.json');

// // Contract instances
// const coreContract = new ethers.Contract(TOUCHGRASS_CORE_ADDRESS, coreABI, provider);
// const nftContract = new ethers.Contract(TOUCHGRASS_NFT_ADDRESS, nftABI, provider);

// // Interface for /friendships/:address1/:address2 route params
// interface FriendshipParams {
//   address1: string;
//   address2: string;
// }

// // Interface for routes with eventId param
// interface EventIdParams {
//   eventId: string; // Will be converted to number via validation
// }

// // Interface for routes with tokenId param
// interface TokenIdParams {
//   tokenId: string; // Will be converted to number via validation
// }

// // Interface for /nfts/public query params
// interface PublicNftsQuery {
//   offset?: string; // Will be converted to number via validation
//   limit?: string; // Will be converted to number via validation
// }
// // Define interface for the request body
// interface MakePublicBody {
//   ownerAddress: string;
// }
// // Middleware
// const handleValidationErrors = (req: any, res: any, next: any) => {
//   const errors = validationResult(req);
//   if (!errors.isEmpty()) {
//     return res.status(400).json({ errors: errors.array() });
//   }
//   next();
// };

// const validateAddress = (field: string) => 
//   body(field).custom((value) => {
//     if (!ethers.isAddress(value)) {
//       throw new Error('Invalid Ethereum address');
//     }
//     return true;
//   });

// // Helper function to verify message signature
// const verifySignature = (message: string, signature: string, expectedAddress: string): boolean => {
//   try {
//     const recoveredAddress = ethers.verifyMessage(message, signature);
//     return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
//   } catch {
//     return false;
//   }
// };

// // FRIENDSHIP ROUTES

// // POST /api/v1/friendships/attest - Prepare transaction data for frontend
// router.post('/friendships/attest',
//   validateAddress('userAddress'),
//   validateAddress('friendAddress'),
//   handleValidationErrors,
//   async (req, res) => {
//     try {
//       const { userAddress, friendAddress } = req.body;

//       if (userAddress.toLowerCase() === friendAddress.toLowerCase()) {
//         return res.status(400).json({ error: 'Cannot attest to yourself' });
//       }

//       // Return transaction data for frontend to execute
//       const txData = {
//         to: TOUCHGRASS_CORE_ADDRESS,
//         data: coreContract.interface.encodeFunctionData('attestFriend', [friendAddress]),
//         value: '0'
//       };

//       res.json({ 
//         message: 'Transaction data prepared',
//         txData,
//         estimatedGas: '50000' // Rough estimate
//       });
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to prepare attestation' });
//     }
//   }
// );

// // GET /api/v1/friendships/:address1/:address2 - Read from contract
// router.get('/friendships/:address1/:address2',
//   param('address1').custom(value => ethers.isAddress(value)),
//   param('address2').custom(value => ethers.isAddress(value)),
//   handleValidationErrors,
//   async (req: Request<FriendshipParams>, res: Response, next: NextFunction) => {
//     try {
//       const { address1, address2 } = req.params;
//       const friendship = await coreContract.friendships(address1, address2);
//       const friendshipLevel = await coreContract.getFriendshipLevel(address1, address2);
      
//       res.json({
//         friend: friendship.friend,
//         isMutual: friendship.isMutual,
//         timestamp: friendship.timestamp.toString(),
//         level: friendshipLevel.toString()
//       });
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to fetch friendship data' });
//     }
//   }
// );

// // POST /api/v1/friendships/batch-attest
// router.post('/friendships/batch-attest',
//   validateAddress('userAddress'),
//   body('friends').isArray().custom((friends) => {
//     return friends.every((friend: string) => ethers.isAddress(friend));
//   }),
//   handleValidationErrors,
//   async (req, res) => {
//     try {
//       const { userAddress, friends } = req.body;

//       if (friends.length === 0 || friends.length > 10) {
//         return res.status(400).json({ error: 'Friends array must contain 1-10 addresses' });
//       }

//       if (friends.some((friend: string) => friend.toLowerCase() === userAddress.toLowerCase())) {
//         return res.status(400).json({ error: 'Cannot attest to yourself' });
//       }

//       const txData = {
//         to: TOUCHGRASS_CORE_ADDRESS,
//         data: coreContract.interface.encodeFunctionData('batchAttestFriends', [friends]),
//         value: '0'
//       };

//       res.json({ 
//         message: 'Batch attestation transaction prepared',
//         txData,
//         friendCount: friends.length
//       });
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to prepare batch attestation' });
//     }
//   }
// );

// // EVENT ROUTES

// // POST /api/v1/events/prepare - Prepare event creation transaction
// router.post('/events/prepare',
//   validateAddress('creator'),
//   body('name').trim().isLength({ min: 1, max: 100 }),
//   body('location').trim().isLength({ min: 1, max: 200 }),
//   body('scheduledTime').isInt({ min: Math.floor(Date.now() / 1000) + 3600 }),
//   body('latitude').isFloat({ min: -90, max: 90 }),
//   body('longitude').isFloat({ min: -180, max: 180 }),
//   body('radius').isInt({ min: 1, max: 10000 }),
//   body('invitedFriends').isArray({ min: 1 }).custom((friends) => {
//     return friends.every((friend: string) => ethers.isAddress(friend));
//   }),
//   handleValidationErrors,
//   async (req, res) => {
//     try {
//       const { creator, name, location, scheduledTime, latitude, longitude, radius, invitedFriends } = req.body;

//       // Convert coordinates to contract format (multiply by 1e6)
//       const lat = Math.round(latitude * 1e6);
//       const lng = Math.round(longitude * 1e6);

//       // Validate mutual friendships (optional check on backend)
//       for (const friend of invitedFriends) {
//         try {
//           const friendship = await coreContract.friendships(creator, friend);
//           if (!friendship.isMutual) {
//             return res.status(400).json({ 
//               error: `Friend ${friend} is not mutually attested` 
//             });
//           }
//         } catch (error) {
//           // Skip validation if contract call fails
//         }
//       }

//       const txData = {
//         to: TOUCHGRASS_CORE_ADDRESS,
//         data: coreContract.interface.encodeFunctionData('createEvent', [
//           name, location, scheduledTime, lat, lng, radius, invitedFriends
//         ]),
//         value: '0'
//       };

//       res.json({ 
//         message: 'Event creation transaction prepared',
//         txData,
//         estimatedGas: '200000'
//       });
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to prepare event creation' });
//     }
//   }
// );

// // GET /api/v1/events/:eventId - Read event from contract
// router.get('/events/:eventId',
//   param('eventId').isInt().toInt(),
//   handleValidationErrors,
//   async (req: Request<EventIdParams>, res: Response, next: NextFunction) => {
//     try {
//       const eventId = Number(req.params.eventId); // Convert to number
//       const eventData = await coreContract.events(eventId);
      
//       const event = {
//         id: eventId,
//         creator: eventData.creator,
//         name: eventData.name,
//         location: eventData.location,
//         scheduledTime: eventData.scheduledTime.toString(),
//         latitude: Number(eventData.lat) / 1e6,
//         longitude: Number(eventData.lng) / 1e6,
//         radius: eventData.radius.toString(),
//         isActive: eventData.isActive,
//         ipfsHash: eventData.ipfsHash || null
//       };

//       res.json({ event });
//     } catch (error) {
//       res.status(404).json({ error: 'Event not found' });
//     }
//   }
// );

// // POST /api/v1/events/:eventId/verify-location/prepare
// router.post('/events/:eventId/verify-location/prepare',
//   param('eventId').isInt().toInt(),
//   validateAddress('userAddress'),
//   body('latitude').isFloat({ min: -90, max: 90 }),
//   body('longitude').isFloat({ min: -180, max: 180 }),
//   handleValidationErrors,
//   async (req: Request<EventIdParams>, res: Response, next: NextFunction) => {
//     try {
//       const eventId = req.params.eventId;
//       const { userAddress, latitude, longitude } = req.body;

//       // Check if user already verified location
//       try {
//         const locationProof = await coreContract.locationProofs(eventId, userAddress);
//         if (locationProof.verified) {
//           return res.status(400).json({ error: 'Location already verified' });
//         }
//       } catch (error) {
//         // Continue if check fails
//       }

//       // Get event details for geofence validation
//       const eventData = await coreContract.events(eventId);
//       const eventLat = Number(eventData.lat) / 1e6;
//       const eventLng = Number(eventData.lng) / 1e6;
//       const radius = Number(eventData.radius);

//       // Calculate distance using Haversine formula
//       const R = 6371e3; // Earth's radius in meters
//       const φ1 = eventLat * Math.PI / 180;
//       const φ2 = latitude * Math.PI / 180;
//       const Δφ = (latitude - eventLat) * Math.PI / 180;
//       const Δλ = (longitude - eventLng) * Math.PI / 180;

//       const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//                 Math.cos(φ1) * Math.cos(φ2) *
//                 Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//       const distance = R * c;

//       if (distance > radius) {
//         return res.status(400).json({ 
//           error: 'Location outside geofence',
//           distance: Math.round(distance),
//           maxDistance: radius
//         });
//       }

//       const lat = Math.round(latitude * 1e6);
//       const lng = Math.round(longitude * 1e6);

//       const txData = {
//         to: TOUCHGRASS_CORE_ADDRESS,
//         data: coreContract.interface.encodeFunctionData('verifyLocationSimple', [
//           eventId, lat, lng
//         ]),
//         value: '0'
//       };

//       res.json({ 
//         message: 'Location verification transaction prepared',
//         txData,
//         distance: Math.round(distance)
//       });
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to prepare location verification' });
//     }
//   }
// );

// // GET /api/v1/events/:eventId/attendees
// router.get('/events/:eventId/attendees',
//   param('eventId').isInt().toInt(),
//   handleValidationErrors,
//   async (req: Request<EventIdParams>, res: Response, next: NextFunction) => {
//     try {
//       const eventId = req.params.eventId;
      
//       // Get event data to find creator and invited friends
//       const eventData = await coreContract.events(eventId);
//       const potentialAttendees = [eventData.creator]; // Include creator
      
//       // Check attendance for each potential attendee
//       const attendees = [];
//       for (const user of potentialAttendees) {
//         try {
//           const hasAttended = await coreContract.hasAttended(eventId, user);
//           if (hasAttended) {
//             const locationProof = await coreContract.locationProofs(eventId, user);
//             attendees.push({
//               address: user,
//               latitude: Number(locationProof.lat) / 1e6,
//               longitude: Number(locationProof.lng) / 1e6,
//               timestamp: locationProof.timestamp.toString()
//             });
//           }
//         } catch (error) {
//           // Skip if can't check attendance
//         }
//       }

//       res.json({ attendees });
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to fetch attendees' });
//     }
//   }
// );

// // POST /api/v1/events/:eventId/finalize-memory/prepare
// router.post('/events/:eventId/finalize-memory/prepare',
//   param('eventId').isInt().toInt(),
//   validateAddress('creatorAddress'),
//   body('ipfsHash').matches(/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/),
//   handleValidationErrors,
//   async (req: Request<EventIdParams>, res: Response, next: NextFunction) => {
//     try {
//       const eventId = req.params.eventId;
//       const { creatorAddress, ipfsHash } = req.body;

//       // Verify creator owns the event
//       const eventData = await coreContract.events(eventId);
//       if (eventData.creator.toLowerCase() !== creatorAddress.toLowerCase()) {
//         return res.status(403).json({ error: 'Only event creator can finalize memory' });
//       }

//       const txData = {
//         to: TOUCHGRASS_CORE_ADDRESS,
//         data: coreContract.interface.encodeFunctionData('finalizeMemory', [
//           eventId, ipfsHash
//         ]),
//         value: '0'
//       };

//       res.json({ 
//         message: 'Memory finalization transaction prepared',
//         txData
//       });
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to prepare memory finalization' });
//     }
//   }
// );

// // POST /api/v1/events/:eventId/mint-nft/prepare
// router.post('/events/:eventId/mint-nft/prepare',
//   param('eventId').isInt().toInt(),
//   validateAddress('userAddress'),
//   handleValidationErrors,
//   async (req: Request<EventIdParams>, res: Response, next: NextFunction) => {
//     try {
//       const eventId = req.params.eventId;
//       const { userAddress } = req.body;

//       // Check if user attended the event
//       const hasAttended = await coreContract.hasAttended(eventId, userAddress);
//       if (!hasAttended) {
//         return res.status(400).json({ error: 'User did not attend this event' });
//       }

//       // Check if event memory is finalized
//       const eventData = await coreContract.events(eventId);
//       if (!eventData.ipfsHash) {
//         return res.status(400).json({ error: 'Event memory not finalized yet' });
//       }

//       const txData = {
//         to: TOUCHGRASS_CORE_ADDRESS,
//         data: coreContract.interface.encodeFunctionData('mintMemoryNFT', [eventId]),
//         value: '0'
//       };

//       res.json({ 
//         message: 'NFT minting transaction prepared',
//         txData
//       });
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to prepare NFT minting' });
//     }
//   }
// );

// // NFT ROUTES

// // GET /api/v1/nfts/:tokenId/details
// router.get('/nfts/:tokenId/details',
//   param('tokenId').isInt().toInt(),
//   handleValidationErrors,
//   async (req: Request<TokenIdParams>, res: Response, next: NextFunction) => {
//     try {
//       const tokenId = Number(req.params.tokenId);
//       const [owner, memoryDetails] = await Promise.all([
//         nftContract.ownerOf(tokenId),
//         nftContract.getMemoryDetails(tokenId)
//       ]);

//       res.json({
//         tokenId,
//         owner,
//         eventId: memoryDetails.eventId.toString(),
//         baseIPFSHash: memoryDetails.baseIPFSHash,
//         friendshipLevel: memoryDetails.friendshipLevel.toString(),
//         isPublic: memoryDetails.isPublic
//       });
//     } catch (error) {
//       res.status(404).json({ error: 'NFT not found' });
//     }
//   }
// );

// // GET /api/v1/nfts/public
// router.get('/nfts/public',
//   query('offset').optional().isInt({ min: 0 }).toInt(),
//   query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
//   handleValidationErrors,
//   async (req: Request<{}, {}, {}, PublicNftsQuery>, res: Response, next: NextFunction) => {
//     try {
//       const offset = Number(req.query.offset) || 0; // Safe conversion
//       const limit = Number(req.query.limit) || 20; // Safe conversion

//       const publicTokenIds = await nftContract.getPublicMemories(offset, limit);
      
//       // Get details for each public NFT
//       const nfts = await Promise.all(
//         publicTokenIds.map(async (tokenId: bigint) => {
//           try {
//             const [owner, details] = await Promise.all([
//               nftContract.ownerOf(tokenId),
//               nftContract.getMemoryDetails(tokenId)
//             ]);
//             return {
//               tokenId: tokenId.toString(),
//               owner,
//               eventId: details.eventId.toString(),
//               baseIPFSHash: details.baseIPFSHash,
//               friendshipLevel: details.friendshipLevel.toString()
//             };
//           } catch {
//             return null;
//           }
//         })
//       );

//       res.json({ 
//         nfts: nfts.filter(nft => nft !== null),
//         offset,
//         limit 
//       });
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to fetch public NFTs' });
//     }
//   }
// );

// // POST /api/v1/nfts/:tokenId/make-public/prepare
// router.post('/nfts/:tokenId/make-public/prepare',
//   param('tokenId').isInt().toInt(),
//   validateAddress('ownerAddress'),
//   handleValidationErrors,
//   async (req: Request<TokenIdParams, {}, MakePublicBody>, res: Response, next: NextFunction) => {
//     try {
//       const tokenId = Number(req.params.tokenId); // Convert to number
//       const { ownerAddress } = req.body;
//       // Verify ownership
//       const actualOwner = await nftContract.ownerOf(tokenId);
//       if (actualOwner.toLowerCase() !== ownerAddress.toLowerCase()) {
//         return res.status(403).json({ error: 'Not the owner of this NFT' });
//       }

//       const txData = {
//         to: TOUCHGRASS_NFT_ADDRESS,
//         data: nftContract.interface.encodeFunctionData('makeMemoryPublic', [tokenId]),
//         value: '0'
//       };

//       res.json({ 
//         message: 'Make public transaction prepared',
//         txData
//       });
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to prepare make public transaction' });
//     }
//   }
// );

// // UTILITY ROUTES

// // POST /api/v1/utils/validate-location
// router.post('/utils/validate-location',
//   body('eventId').isInt().toInt(),
//   body('userLat').isFloat({ min: -90, max: 90 }),
//   body('userLng').isFloat({ min: -180, max: 180 }),
//   handleValidationErrors,
//   async (req, res) => {
//     try {
//       const { eventId, userLat, userLng } = req.body;
      
//       const eventData = await coreContract.events(eventId);
//       const eventLat = Number(eventData.lat) / 1e6;
//       const eventLng = Number(eventData.lng) / 1e6;
//       const radius = Number(eventData.radius);

//       // Haversine formula
//       const R = 6371e3;
//       const φ1 = eventLat * Math.PI / 180;
//       const φ2 = userLat * Math.PI / 180;
//       const Δφ = (userLat - eventLat) * Math.PI / 180;
//       const Δλ = (userLng - eventLng) * Math.PI / 180;

//       const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
//                 Math.cos(φ1) * Math.cos(φ2) *
//                 Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
//       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//       const distance = R * c;

//       res.json({
//         distance: Math.round(distance),
//         withinGeofence: distance <= radius,
//         maxDistance: radius
//       });
//     } catch (error) {
//       res.status(500).json({ error: 'Failed to validate location' });
//     }
//   }
// );

// export { router };