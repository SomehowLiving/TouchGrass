#!/bin/bash

# TouchGrass API Testing with cURL
# Make sure your server is running on http://localhost:3000

BASE_URL="http://localhost:3000/api/v1"

# Your test addresses
USER1=""
USER2=""
USER3=""

echo "🚀 TouchGrass API Testing Suite"
echo "================================="

# 1. HEALTH CHECK
echo ""
echo "📊 1. Health Check"
echo "==================="
curl -X GET "$BASE_URL/../health" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s

# 2. FRIENDSHIP ATTESTATION TESTS
echo ""
echo "🤝 2. Friendship Attestation Tests"
echo "==================================="

# Test friendship attestation preparation
echo ""
echo "2.1 Prepare friendship attestation transaction:"
curl -X POST "$BASE_URL/friendships/attest" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "'$USER1'",
    "friendAddress": "'$USER2'"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test self-attestation (should fail)
echo ""
echo "2.2 Try self-attestation (should fail):"
curl -X POST "$BASE_URL/friendships/attest" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "'$USER1'",
    "friendAddress": "'$USER1'"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test batch friendship attestation
echo ""
echo "2.3 Prepare batch friendship attestation:"
curl -X POST "$BASE_URL/friendships/batch-attest" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "'$USER1'",
    "friends": ["'$USER2'", "'$USER3'"]
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test invalid address in batch (should fail)
echo ""
echo "2.4 Try batch attestation with invalid address (should fail):"
curl -X POST "$BASE_URL/friendships/batch-attest" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "'$USER1'",
    "friends": ["invalid-address", "'$USER2'"]
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test friendship lookup (will fail without deployed contract)
echo ""
echo "2.5 Check friendship status (will fail without deployed contract):"
curl -X GET "$BASE_URL/friendships/$USER1/$USER2" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s

# 3. EVENT CREATION TESTS
echo ""
echo "📅 3. Event Creation Tests"
echo "=========================="

# Test event creation preparation
echo ""
echo "3.1 Prepare event creation transaction:"
FUTURE_TIME=$(($(date +%s) + 7200))  # 2 hours from now

curl -X POST "$BASE_URL/events/prepare" \
  -H "Content-Type: application/json" \
  -d '{
    "creator": "'$USER1'",
    "name": "Coffee Meetup Test",
    "location": "Central Park, NYC",
    "scheduledTime": '$FUTURE_TIME',
    "latitude": 40.7829,
    "longitude": -73.9654,
    "radius": 100,
    "invitedFriends": ["'$USER2'"]
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test invalid event time (should fail)
echo ""
echo "3.2 Try event in the past (should fail):"
PAST_TIME=$(($(date +%s) - 3600))  # 1 hour ago

curl -X POST "$BASE_URL/events/prepare" \
  -H "Content-Type: application/json" \
  -d '{
    "creator": "'$USER1'",
    "name": "Past Event",
    "location": "Test Location",
    "scheduledTime": '$PAST_TIME',
    "latitude": 40.7829,
    "longitude": -73.9654,
    "radius": 100,
    "invitedFriends": ["'$USER2'"]
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test invalid coordinates (should fail)
echo ""
echo "3.3 Try invalid coordinates (should fail):"
curl -X POST "$BASE_URL/events/prepare" \
  -H "Content-Type: application/json" \
  -d '{
    "creator": "'$USER1'",
    "name": "Invalid Location Event",
    "location": "Test Location",
    "scheduledTime": '$FUTURE_TIME',
    "latitude": 91.0,
    "longitude": -73.9654,
    "radius": 100,
    "invitedFriends": ["'$USER2'"]
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test empty name (should fail)
echo ""
echo "3.4 Try empty event name (should fail):"
curl -X POST "$BASE_URL/events/prepare" \
  -H "Content-Type: application/json" \
  -d '{
    "creator": "'$USER1'",
    "name": "",
    "location": "Test Location",
    "scheduledTime": '$FUTURE_TIME',
    "latitude": 40.7829,
    "longitude": -73.9654,
    "radius": 100,
    "invitedFriends": ["'$USER2'"]
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test event lookup (will fail without deployed contract)
echo ""
echo "3.5 Get event details (will fail without deployed contract):"
curl -X GET "$BASE_URL/events/1" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s

# 4. LOCATION VERIFICATION TESTS
echo ""
echo "📍 4. Location Verification Tests"
echo "================================="

# Test location verification preparation
echo ""
echo "4.1 Prepare location verification transaction:"
curl -X POST "$BASE_URL/events/1/verify-location/prepare" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "'$USER1'",
    "latitude": 40.7829,
    "longitude": -73.9654
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test invalid coordinates
echo ""
echo "4.2 Try invalid coordinates (should fail):"
curl -X POST "$BASE_URL/events/1/verify-location/prepare" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "'$USER1'",
    "latitude": 181.0,
    "longitude": -73.9654
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test get attendees (will fail without deployed contract)
echo ""
echo "4.3 Get event attendees (will fail without deployed contract):"
curl -X GET "$BASE_URL/events/1/attendees" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s

# 5. MEMORY AND NFT TESTS
echo ""
echo "🎨 5. Memory and NFT Tests"
echo "========================="

# Test memory finalization preparation
echo ""
echo "5.1 Prepare memory finalization transaction:"
curl -X POST "$BASE_URL/events/1/finalize-memory/prepare" \
  -H "Content-Type: application/json" \
  -d '{
    "creatorAddress": "'$USER1'",
    "ipfsHash": "QmYwAPJzv5CZsnAzt8auVZRn8T5Xd8VHmZS6YhJZZ8r5X6"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test invalid IPFS hash (should fail)
echo ""
echo "5.2 Try invalid IPFS hash (should fail):"
curl -X POST "$BASE_URL/events/1/finalize-memory/prepare" \
  -H "Content-Type: application/json" \
  -d '{
    "creatorAddress": "'$USER1'",
    "ipfsHash": "invalid-hash"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test NFT minting preparation
echo ""
echo "5.3 Prepare NFT minting transaction:"
curl -X POST "$BASE_URL/events/1/mint-nft/prepare" \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "'$USER1'"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test NFT details lookup (will fail without deployed contract)
echo ""
echo "5.4 Get NFT details (will fail without deployed contract):"
curl -X GET "$BASE_URL/nfts/1/details" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test public NFTs lookup (will fail without deployed contract)
echo ""
echo "5.5 Get public NFTs (will fail without deployed contract):"
curl -X GET "$BASE_URL/nfts/public?offset=0&limit=10" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test make NFT public preparation
echo ""
echo "5.6 Prepare make NFT public transaction:"
curl -X POST "$BASE_URL/nfts/1/make-public/prepare" \
  -H "Content-Type: application/json" \
  -d '{
    "ownerAddress": "'$USER1'"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# 6. UTILITY TESTS
echo ""
echo "🛠️ 6. Utility Tests"
echo "==================="

# Test location validation
echo ""
echo "6.1 Validate location against event geofence:"
curl -X POST "$BASE_URL/utils/validate-location" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": 1,
    "userLat": 40.7829,
    "userLng": -73.9654
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test invalid event ID
echo ""
echo "6.2 Try invalid event ID (should fail):"
curl -X POST "$BASE_URL/utils/validate-location" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "invalid",
    "userLat": 40.7829,
    "userLng": -73.9654
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

# 7. ERROR HANDLING TESTS
echo ""
echo "❌ 7. Error Handling Tests"
echo "=========================="

# Test invalid endpoint
echo ""
echo "7.1 Test 404 - Invalid endpoint:"
curl -X GET "$BASE_URL/invalid-endpoint" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test missing required fields
echo ""
echo "7.2 Test missing required fields:"
curl -X POST "$BASE_URL/friendships/attest" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test malformed JSON
echo ""
echo "7.3 Test malformed JSON:"
curl -X POST "$BASE_URL/friendships/attest" \
  -H "Content-Type: application/json" \
  -d '{invalid json}' \
  -w "\nStatus: %{http_code}\n" \
  -s

# Test invalid HTTP method
echo ""
echo "7.4 Test invalid HTTP method:"
curl -X DELETE "$BASE_URL/friendships/attest" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" \
  -s

echo ""
echo "✅ Testing Complete!"
echo "==================="
echo ""
echo "Note: Many tests that require contract interaction will fail with"
echo "'Failed to fetch...' errors unless you have:"
echo "1. A running Ethereum node/network"
echo "2. Deployed TouchGrass contracts"
echo "3. Proper contract addresses in environment variables"
echo ""
echo "Expected successful responses (200-201):"
echo "- Health check"
echo "- Transaction preparation endpoints"
echo "- Input validation (400 errors for invalid data)"
echo ""
echo "Expected failures without deployed contracts:"
echo "- Contract read operations (friendship lookups, event details, etc.)"
echo "- Location validation against non-existent events"