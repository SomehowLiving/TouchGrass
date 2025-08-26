t# TouchGrass - The Proof Layer for Real Life

> "Meet IRL. Mint Forever." - Create verifiable, collaborative memories from real-world social connections.

**Version:** MVP 1.0  
**Target Launch:** Q3 2025  
**Network:** Base L2 (Ethereum)

---

## 🌟 MVP Overview

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
     participant A as touchgrass App
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

## 🏗 MVP System Architecture
**Architecture flow**: - see [Architechture.md](touchgrass-flow.jpeg)
---

## 📱 MVP User Journey

### **1. Gasless Onboarding (30 seconds)**
```
User goes to the dapp website → Background Wallet Creation → Device Registration → Push Notification Permission
```
- **No crypto knowledge required**
- **No manual wallet setup**
- **No gas fee concerns**
- **Immediate usability**

### **2. Friend Discovery & Connection**
```
Accepts Invitation → Mutual Attestation → Trust Level Assignment → Social Graph Update
```
- **Accepts invites to join clique**
- **Mutual verification prevents fake connections**
- **Trust levels unlock features progressively**

### **3. Event Creation & Invitation**
```
Create Event → Set Location & Time → Invite Friends → Send Push Notifications
```
- **Simple event creation interface**
- **Input location of the event manually**
- **Real-time invitation system**


### **4. NFT Minting & Sharing**
```
All Friends Verified → Finalize Memory → Mint Collaborative NFT → Share to Feed
```
- **Automatic NFT generation**
- **Dynamic metadata based on friendship levels**
- **Optional public sharing**

---

## 🔧 MVP Smart Contract Architecture

### **TouchGrassCore.sol - Main Contract**
```solidity
MVP Features:
├── Gasless Functions (via relayer)
│   ├── createEventForUser() - Backend pays gas
│   ├── attestFriendForUser() - Sponsored friendship
│   ├── verifyLocationForUser() - GPS verification
│   └── mintMemoryNFTForUser() - NFT creation
│
├── Direct User Functions (user pays gas)
│   ├── createEvent() - For power users
│   ├── attestFriend() - Direct attestation
│   ├── verifyLocation() - Self verification
│   └── mintMemoryNFT() - Direct minting
│
├── Core Logic
│   ├── Event Management - Geofenced events
│   ├── Friendship Graph - Mutual attestations
│   ├── GPS Verification - Single oracle (MVP)
│   └── Spam Prevention - 30s cooldown
│
└── Admin Controls
    ├── Emergency Pause - Stop all operations
    ├── Relayer Management - Add/remove gas sponsors
    └── Oracle Management - Update GPS verifier
```

### **TouchGrassNFT.sol - Dynamic Memories**
```solidity
MVP Features:
├── Collaborative NFT Minting
├── Dynamic Metadata (friendship-based)
├── Crew Member Cross-references
├── Public/Private Memory Controls
└── Cultural Feed Integration
```

## 💡 MVP vs Advanced Feature Comparison

| Feature Category | MVP Implementation | Advanced Implementation (Future) |
|------------------|-------------------|----------------------------------|
| **Authentication** | Device registration | Zero-knowledge identity proofs |
| **GPS Verification** | Single trusted oracle | Multi-oracle consensus network |
| **Gasless Experience** | Backend relayer | EIP-4337 Account Abstraction |
| **Spam Prevention** | Simple cooldowns | AI-powered trust scoring |
| **Social Graph** | Basic mutual attestation | Reputation-weighted connections |
| **Privacy** | Public/private toggle | Zero-knowledge location proofs |
| **Scaling** | Base L2 only | Cross-chain compatibility |
| **Governance** | Admin-controlled | DAO governance |

---

## 🚀 Future Roadmap

### **Phase 2: Enhanced Security (Q4 2025)**
- **Multi-Oracle GPS Network**: Chainlink + custom oracles for location verification
- **Advanced Trust Scoring**: Machine learning-based reputation system
- **Sybil Resistance**: Device fingerprinting + behavioral analysis
- **Privacy Controls**: Selective visibility and data encryption

### **Phase 3: Scale & Decentralization (Q1 2026)**
- **EIP-4337 Integration**: Full account abstraction for gasless transactions
- **Cross-Chain Support**: Polygon, Arbitrum, and Optimism compatibility
- **Advanced NFT Features**: Time-decay traits, location-based unlocks
- **Community Governance**: DAO voting on platform parameters

### **Phase 4: Ecosystem Expansion (Q2 2026)**
- **IRL Partner Integrations**: Festivals, venues, and event partnerships
- **Creator Economy**: Monetization tools for community builders
- **AR/VR Integration**: Immersive memory experiences
- **Global Cultural Archive**: Decentralized storage of human moments

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
- Vercel for both frontend and backend hosting

---

## 📁 MVP Project Structure

```
touchgrass-mvp/
├── mobile/                     # React Native app
│   ├── src/
│   │   ├── components/
│   │   │   ├── EventCreation/
│   │   │   ├── FriendDiscovery/
│   │   │   ├── LocationVerification/
│   │   │   └── MemoryCreation/
│   │   ├── screens/
│   │   │   ├── OnboardingScreen.tsx
│   │   │   ├── HomeScreen.tsx
│   │   │   ├── EventScreen.tsx
│   │   │   └── ProfileScreen.tsx
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── wallet.ts
│   │   │   ├── camera.ts
│   │   │   └── location.ts
│   │   └── store/
│   │       ├── authSlice.ts
│   │       ├── eventsSlice.ts
│   │       └── friendsSlice.ts
│   ├── app.config.js
│   └── package.json
│
├── backend/                    # Backend services
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── events.controller.ts
│   │   │   ├── friends.controller.ts
│   │   │   └── memories.controller.ts
│   │   ├── services/
│   │   │   ├── gps-oracle.service.ts
│   │   │   ├── relayer.service.ts
│   │   │   ├── ipfs.service.ts
│   │   │   └── notification.service.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── rateLimit.middleware.ts
│   │   │   └── validation.middleware.ts
│   │   ├── routes/
│   │   └── database/
│   │       ├── schema.prisma or schema/(mongodb)
│   │       └── migrations/
│   ├── Dockerfile
│   └── package.json
│
├── contracts/                  # Smart contracts
│   ├── contracts/
│   │   ├── TouchGrassCore.sol
│   │   ├── TouchGrassNFT.sol
│   │   └── interfaces/
│   ├── test/
│   │   ├── TouchGrassCore.test.ts
│   │   └── TouchGrassNFT.test.ts
│   ├── deploy/
│   │   └── 01-deploy-core.ts
│   ├── hardhat.config.ts
│   └── package.json
│
├── web/                        # Web app (optional)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── hooks/
│   ├── next.config.js
│   └── package.json
│
└── docs/
    ├── api.md
    ├── deployment.md
    └── user-guide.md
```

---

## 🚀 MVP Getting Started

### **Prerequisites**
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Expo CLI
- Base testnet ETH

### **Quick Start**

1. **Clone Repository**
```bash
git clone https://github.com/somehowliving/touchgrass
cd touchgrass-mvp
```

2. **Setup Environment Variables**
```bash
# Backend .env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
BASE_RPC_URL=https://sepolia.base.org
PRIVATE_KEY=your_deployer_private_key
PINATA_API_KEY=your_pinata_key
EXPO_PUSH_TOKEN=your_expo_token

# Mobile .env
API_BASE_URL=http://localhost:3000
SEQUENCE_PROJECT_ACCESS_KEY=your_sequence_key
```

3. **Deploy Contracts**
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat deploy --network base-sepolia
# Save deployed addresses to backend config
```

4. **Start Backend**
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

5. **Start Mobile App**
```bash
cd mobile
npm install
npx expo start
```

6. **Test MVP Flow**
- Create two test accounts
- Connect as friends
- Create event together
- Test location verification
- Mint collaborative NFT

---

## 📊 MVP Success Metrics

### **Core KPIs**
- **User Onboarding**: <30 seconds from download to first action
- **Friend Connection Rate**: >80% of users connect at least 1 friend
- **Event Creation Rate**: >60% of users create at least 1 event
- **IRL Meetup Success**: >70% of events result in verified meetups
- **NFT Minting Rate**: >50% of verified meetups mint memories
- **Retention**: >40% 7-day retention, >20% 30-day retention

### **Technical Metrics**
- **Gas Sponsorship Cost**: <$0.10 per complete user journey
- **GPS Verification Accuracy**: >95% within 50-meter radius
- **App Performance**: <2 second load times, <5% crash rate
- **Backend Uptime**: >99% API availability

---

## 🔐 MVP Security Considerations

### **Current Security Measures**
- ✅ **Smart Contract Pausability**: Emergency stop functionality
- ✅ **Rate Limiting**: 30-second cooldowns prevent spam
- ✅ **GPS Signature Verification**: Backend oracle prevents spoofing
- ✅ **Mutual Friend Attestation**: Prevents fake social connections
- ✅ **Input Validation**: All user inputs sanitized and validated
- ✅ **Private Key Security**: Hardware security modules for relayer

### **Known MVP Limitations**
- ⚠️ **Single GPS Oracle**: Centralized verification point
- ⚠️ **Basic Spam Prevention**: Simple cooldowns, not AI-powered
- ⚠️ **No Sybil Resistance**: Multiple devices could game system
- ⚠️ **Limited Privacy**: Location data stored in backend database

### **Security Roadmap**
- **Phase 2**: Multi-oracle verification, advanced spam detection
- **Phase 3**: Zero-knowledge proofs, decentralized verification
- **Phase 4**: Hardware-level security, biometric verification

---

## 🧪 MVP Testing Strategy

### **Smart Contract Testing**
```bash
cd contracts
npm run test              # Unit tests
npm run test:integration  # Integration tests
npm run coverage          # Coverage report (target: >90%)
```

### **Backend Testing**
```bash
cd backend
npm run test              # API endpoint tests
npm run test:gps          # GPS oracle verification tests
npm run test:relayer      # Gasless transaction tests
```

### **Mobile App Testing**
```bash
cd mobile
npm run test              # Component tests
npm run test:e2e          # End-to-end user flows
```

### **Load Testing**
- **Target**: 1,000 concurrent users
- **GPS Verification**: <3 seconds response time
- **Relayer Capacity**: 10 transactions/second
- **Database Performance**: <100ms query time

---

## 💰 MVP Economics

### **Gas Cost Analysis (Base L2)**
```
User Journey Breakdown:
├── registerUser: ~45,000 gas (~$0.01)
├── createEvent: ~85,000 gas (~$0.02)
├── attestFriend: ~35,000 gas (~$0.008)
├── verifyLocation: ~55,000 gas (~$0.012)
├── mintMemoryNFT: ~120,000 gas (~$0.025)

Total per complete journey: ~$0.065
Monthly budget for 1,000 users: ~$65
```

### **Backend Infrastructure Costs**
```
Monthly Operating Expenses:
├── Server Hosting (Railway): ~$50
├── Database (PostgreSQL/Mongodb): ~$25
├── Redis Cache: ~$15
├── IPFS Storage (Pinata): ~$20
├── Push Notifications: ~$10
├── Monitoring (Sentry): ~$25

Total monthly OpEx: ~$145
Cost per active user: ~$0.145
```

### **Revenue Model (Future)**
- **Premium Features**: Enhanced privacy, custom NFT traits
- **Event Partnerships**: Revenue share with venues/festivals
- **Creator Tools**: Monetization for community organizers
- **NFT Marketplace**: Transaction fees on secondary sales

---

## 🤝 Contributing to MVP

### **Development Workflow**
1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/mvp-improvement`)
3. **Develop** with comprehensive tests
4. **Test** all affected functionality
5. **Submit** pull request with detailed description

### **MVP Development Priorities**
1. **Core User Flow**: Ensure gasless onboarding → NFT minting works flawlessly
2. **Mobile Performance**: Optimize for low-end devices and slow networks
3. **Backend Reliability**: Focus on uptime and error handling
4. **Security**: Regular audits and penetration testing
5. **User Experience**: Intuitive UI/UX with minimal learning curve

### **Code Quality Standards**
- **TypeScript**: Strict mode enabled, no `any` types
- **Testing**: >80% code coverage required
- **Documentation**: All public functions documented
- **Performance**: Mobile app must work on 3-year-old devices
- **Security**: All external inputs validated and sanitized

---

## 📜 License & Legal

**License**: MIT License - see [LICENSE.md](LICENSE.md)

**Privacy Policy**: [privacy.touchgrass.app](https://privacy.touchgrass.app)

**Terms of Service**: [terms.touchgrass.app](https://terms.touchgrass.app)

---

## 🔗 MVP Links & Resources

### **Live Links**
- **MVP dApp**: [touch-grass-xo.vercel.app](https://touch-grass-xo.vercel.app) (coming Q4 2025)


### **Development Resources**
- **GitHub**: [github.com/touchgrass/mvp](https://github.com/SomehowLiving/TouchGrass)
- **Base Testnet Faucet**: [faucet.quicknode.com/base/sepolia](https://faucet.quicknode.com/base/sepolia)
- **Contract Addresses**: [0x35AcB41e1c3a0B35478ce9d01FC1aa45E15416E2]

### **Community**
- **Twitter**: [@touchgrass_app](https://x.com/just_touchgrass)
- **Feedback Form**: [feedback.touchgrass.xyz](https://tinyurl.com/touchgrass-feedback)

---

## ❓ MVP FAQ

### **Product Questions**

**Q: Why start with an MVP instead of full features?**  
A: We want to validate the core user journey (gasless onboarding → IRL meetups → collaborative NFTs) before building complex features. User feedback will guide our roadmap.

**Q: Is the MVP really gasless?**  
A: Yes! Our backend relayer sponsors all gas costs. Users never see transaction fees or need to buy crypto.

**Q: What's the difference between MVP and advanced versions?**  
A: MVP uses simplified security (single GPS oracle, basic spam prevention) to launch quickly. Advanced versions add multi-oracle verification, AI trust scoring, and full decentralization.

**Q: Can I use TouchGrass without friends who have the app?**  
A: Not yet. The MVP requires mutual friend attestation. Solo user features come in Phase 2.

### **Technical Questions**

**Q: Why Base L2 instead of Ethereum mainnet?**  
A: Base offers much lower gas costs (~$0.01 vs $20+ on mainnet) and faster transactions (2 seconds vs 12+ seconds), essential for mobile UX.

**Q: How do you prevent GPS spoofing?**  
A: Our backend GPS oracle signs location data with cryptographic proofs. The smart contract verifies these signatures before allowing location verification.

**Q: What happens if the backend goes down?**  
A: Users can still interact with smart contracts directly (paying gas themselves). All critical data (friendships, events, NFTs) lives on-chain permanently.

**Q: How accurate is geofencing?**  
A: Current MVP accuracy is ~10-50 meters depending on device GPS quality. Phase 2 will add multi-device triangulation for <5 meter accuracy.

### **Security Questions**

**Q: What if someone hacks the GPS oracle?**  
A: MVP risk is limited to fake location verifications. Phase 2 adds multiple oracles requiring consensus. Emergency pause function stops all operations if needed.

**Q: Can people create fake friend connections?**  
A: No. Friendship requires mutual attestation (both people must approve) and physical proximity during attestation process.

**Q: Is my location data private?**  
A: Location coordinates are stored encrypted in our database and only used for geofence verification. You control which memories are public/private.

---

## 🎯 MVP Launch Checklist

### **Pre-Launch (Q3 2025)**
- [ ] Smart contracts deployed to Base Sepolia
- [ ] Backend services deployed and monitored
- [ ] Mobile app submitted to app stores
- [ ] Security audit completed
- [ ] Load testing passed (1K concurrent users)
- [ ] Documentation completed
- [ ] Community Discord launched

### **Launch Week (Q4 2025)**
- [ ] Smart contracts deployed to Base mainnet
- [ ] Gas sponsorship budget funded ($10K initial)
- [ ] Mobile app live in app stores
- [ ] Launch announcement and PR
- [ ] Community onboarding events
- [ ] Real-time monitoring active
- [ ] Customer support ready

### **Post-Launch (Q1-Q2 2026)**
- [ ] User feedback collection and analysis
- [ ] Performance optimization based on usage
- [ ] Security monitoring and incident response
- [ ] Community growth and engagement
- [ ] Partner integrations (venues, events)
- [ ] Phase 2 planning based on MVP learnings

---

**TouchGrass MVP - Building authentic human connections in the Web3 era, one IRL moment at a time.** 🌱

