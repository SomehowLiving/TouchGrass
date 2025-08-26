# TouchGrass - The Proof Layer for Real Life

> "Meet homies IRL, and mint memories together."

**Version:** MVP 1.0  
**Target Launch:** Q3 2025  
**Network:** Base L2 (Ethereum)

---


## MVP Overview

TouchGrass transforms authentic in-person moments into permanent, blockchain-verified memories. Our MVP focuses on the core user journey: **gasless onboarding → friend connections → IRL meetups → collaborative NFT memories**.

### **MVP Core Features** 
- Gasless Onboarding: Invisible wallet creation & sponsored transactions

- Friend Attestation: Mutual verification system for authentic connections

- Collaborative Memory Creation: Shared photos, doodles, and artifacts

- Dynamic NFTs: Memories that evolve as friendships grow stronger

- Cultural Feed: Public gallery of shared memories
  
## User Flow

This diagram illustrates the core user flow of `touchgrass`:

 ```mermaid
 sequenceDiagram
     actor U as User
     participant A as touchgrass dApp
     Participant S as Base
     participant IPFS

     U->>A: visits dApp
     U->>A: Connects Wallet (Sequence)

     U->>A: Creates Plan
     A->>S: Records plan & invitees
     S-->>A: Plan ID created

     U->>A: Accepts Plan (/Meet IRL)
     A->>S: Calls accept()
     S-->>A: Meet up IRL
     U->>A: Uploads Memory (/memory)
     A->>IPFS: Stores image/video
     IPFS-->>A: Returns IPFS hash

     U->>A: Mints NFT (/mint)
     A->>S: Calls mint() with IPFS hash
     S-->>A: NFT minted & returned
 ```

---

## MVP User Journey

### **1. Gasless Onboarding (30 seconds)**
```
User goes to the dapp website → Connects with gmail → User Registration and wallet address generated.
```
- **No crypto knowledge required**
- **No manual wallet setup**
- **No gas fee concerns**
- **Immediate usability**

### **2. Friend Discovery & Connection**
```
Creates Clique → Adds friends and homies → Friends see clique    → Social Graph Update
```
- **Easily create clique**
- **Add friends to the clique**
- **Only friends invited can interact bulding trust and social graph interaction**

### **3. Event Creation & Invitation**
```
Create Event → Set Location & Time (manually for now) → Invite Friends → Send Push Notifications
```
- **Simple event creation interface**
- **Input location of the event manually**
- **Real-time invitation system**


### **4. NFT Minting & Sharing**
```
All Friends Verified → Finalize Memory → Mint Collaborative NFT → Share to Feed
```
- **Automatic NFT generation**
- **Dynamic metadata based on meet up details**
- **Optional public sharing**

---

## 🛠 MVP Technology Stack
### Frontend tech stack (Mobile reponsive)

- NextJs15 
- Tailwindcss 
- Local storage and context API for local data persistence 
- Sequence wallet SDK + Wagmi

### Backend
- NextJS 15 (through API/route.ts pattern) - API server
- Typescript 
- Database - MongoDB

### External service: 
- IPFS
- Vercel for both frontend and backend hosting

---


### **Development Resources**
- **GitHub**: [github.com/touchgrass/mvp](https://github.com/SomehowLiving/TouchGrass)
- **Base Testnet Faucet**: [faucet.quicknode.com/base/sepolia](https://faucet.quicknode.com/base/sepolia)
- **Contract Addresses**: 0x35AcB41e1c3a0B35478ce9d01FC1aa45E15416E2
---

### **Community**
- **Twitter**: [@touchgrass_app](https://x.com/just_touchgrass)
- **Feedback Form**: [feedback.touchgrass.xyz](https://tinyurl.com/touchgrass-feedback)

---
### **Future Roadmap**

**Phase 2: Enhanced Trust & Security (2026)**

- In-app Chat: A private, off-chain messaging feature for event and memory planning.

- Multi-Oracle GPS Network: Chainlink + custom oracles for location verification

- Advanced Trust Scoring: Machine learning-based reputation system

- Sybil Resistance: Device fingerprinting + behavioral analysis

- Privacy Controls: Selective visibility and data encryption


### Phase 3: Scale & Decentralization (2027)
- EIP-4337 Integration: Full account abstraction for gasless transactions

- Advanced NFT Features: Time-decay traits, location-based unlocks
  
- Community Governance: Empowering our users with on-chain control

- Cross-Chain Support: Polygon, Arbitrum, and Optimism compatibility


We will build and ship these phases with a core focus on user feedback. The lessons learned and data gathered from our early community will be used to build and strategize the next evolution of our roadmap, ensuring our product is always aligned with the needs of our users.
