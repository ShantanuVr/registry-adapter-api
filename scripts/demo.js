# Registry Adapter API - Demo Script

This script demonstrates the complete flow of the Registry Adapter API:
1. Finalize issuance (mint credits)
2. Retire credits
3. Anchor evidence

## Prerequisites

- Registry Adapter API running on localhost:4100
- Mock services running (registry, locker, oracle)
- Valid JWT token

## Usage

```bash
node scripts/demo.js
```

## Demo Flow

1. **Get JWT Token**: Authenticate with registry simulator
2. **Finalize Issuance**: Mint 1000 credits for PRJ001
3. **Retire Credits**: Burn 100 credits
4. **Anchor Evidence**: Anchor IoT data hash
5. **Check Receipts**: Verify all transactions

## Expected Output

```
🚀 Starting Registry Adapter API Demo...

✅ Got JWT token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

📋 Finalizing issuance...
✅ Issuance finalized: demo-receipt-1
   Receipt URL: http://localhost:4100/v1/receipts/demo-receipt-1

🔥 Retiring credits...
✅ Credits retired: demo-receipt-2
   Receipt URL: http://localhost:4100/v1/receipts/demo-receipt-2

🔗 Anchoring evidence...
✅ Evidence anchored: demo-receipt-3
   Receipt URL: http://localhost:4100/v1/receipts/demo-receipt-3

📊 Checking receipts...
✅ All receipts verified successfully

🎉 Demo completed successfully!
```

## Configuration

Edit the script to modify:
- API endpoints
- Project IDs
- Quantities
- Evidence hashes
- JWT token source
