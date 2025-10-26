# Registry Adapter API

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

A production-quality adapter service that serves as the **boundary enforcer** between the Official Registry and on-chain contracts. It provides separate API namespaces for credit and token domains, enforces deterministic mapping, and ensures proper domain separation.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/ShantanuVr/registry-adapter-api.git
cd registry-adapter-api

# Install dependencies
pnpm install

# Start with Docker Compose
docker compose up -d

# Run database migrations and seeds
pnpm db:migrate
pnpm db:seed

# Start development server
pnpm dev
```

## 📋 Features

- **Domain Separation**: Separate `/v1/credit/*` and `/v1/token/*` API namespaces
- **Boundary Enforcement**: Clear separation between Registry (credit) and Chain (token) domains
- **Deterministic Mapping**: Maintains `classId -> {chainId, contract, tokenId}` mapping table
- **Role-Based Access**: Token operations restricted to ADMIN role only
- **Idempotency**: Guarantees idempotent operations with strong audit trails
- **Security**: JWT verification, RBAC, rate limiting, and request validation
- **Observability**: Structured logging, Prometheus metrics, and health checks
- **Documentation**: Complete OpenAPI 3.1 specification with interactive docs

## 🔗 API Endpoints

- **API**: http://localhost:4100
- **Documentation**: http://localhost:4100/docs
- **Health Check**: http://localhost:4100/health
- **Metrics**: http://localhost:4100/metrics

## 🏗️ Architecture

### Domain Boundaries

The adapter enforces strict domain boundaries between credit and token operations:

```
┌─────────────────────────────────────────────────────────────────┐
│                    REGISTRY ADAPTER API                         │
│                     (Boundary Enforcer)                         │
├─────────────────────────────────────────────────────────────────┤
│  CREDIT DOMAIN (Registry-facing)    │  TOKEN DOMAIN (Chain-facing) │
│  ┌─────────────────────────────────┐ │  ┌─────────────────────────┐ │
│  │ /v1/credit/issuance/finalize   │ │  │ /v1/token/mint          │ │
│  │ /v1/credit/retire              │ │  │ /v1/token/burn          │ │
│  │ /v1/classes/map                │ │  │ /v1/token/bridge        │ │
│  │ /v1/classes/resolve            │ │  │                         │ │
│  └─────────────────────────────────┘ │  └─────────────────────────┘ │
│  domain: "credit"                    │  domain: "token"              │
│  sourceOfRecord: "registry"          │  sourceOfRecord: "chain"      │
├─────────────────────────────────────────────────────────────────┤
│                    DETERMINISTIC MAPPING                        │
│              classId -> {chainId, contract, tokenId}            │
└─────────────────────────────────────────────────────────────────┘
```

### API Flow Diagram

```
Registry (Credit Domain)          Adapter API              Blockchain (Token Domain)
┌─────────────────────┐         ┌─────────────────┐         ┌─────────────────────┐
│                     │         │                 │         │                     │
│  Issuance Finalize  │ ──────► │ /v1/credit/     │ ──────► │ Mint Tokens         │
│  (Webhook)          │         │ issuance/        │         │ (Admin CLI only)    │
│                     │         │ finalize        │         │                     │
│                     │         │                 │         │                     │
│  Credit Retirement  │ ──────► │ /v1/credit/     │ ──────► │ Burn Tokens         │
│  (Webhook)          │         │ retire          │         │ (Admin CLI only)    │
│                     │         │                 │         │                     │
│  Class Mapping      │ ──────► │ /v1/classes/    │ ──────► │ Contract Address    │
│  (Admin CLI)        │         │ map             │         │ Token ID            │
│                     │         │                 │         │                     │
└─────────────────────┘         └─────────────────┘         └─────────────────────┘
```

### Core Modules

- **Auth**: JWT verification and role-based authorization
- **Classes**: Project-to-class mapping and deterministic token mapping
- **Issuance**: Credit issuance finalization and token minting
- **Retire**: Credit retirement and token burning
- **Anchor**: Evidence anchoring on-chain
- **Receipts**: Transaction receipt management
- **Audit**: Append-only audit logging
- **Idempotency**: Request deduplication

### Data Model

- **Receipt**: Transaction records with on-chain details
- **ClassMap**: Project/vintage to class ID mappings
- **TokenMap**: Deterministic classId -> {chainId, contract, tokenId} mappings
- **Idempotency**: Request deduplication tracking
- **AuditEvent**: Immutable audit trail

## 🔒 Security & Access Control

### Role-Based Access

- **ADMIN**: Full access to all endpoints including token operations
- **VERIFIER**: Read-only access to credit domain endpoints
- **ISSUER**: Access to credit issuance endpoints
- **BURNER**: Access to credit retirement endpoints
- **EVIDENCE**: Access to evidence anchoring endpoints
- **VIEWER**: Read-only access to all endpoints

### Domain Restrictions

- **Credit Domain** (`/v1/credit/*`): Accessible to Registry webhooks and authorized roles
- **Token Domain** (`/v1/token/*`): Restricted to ADMIN role only
- **Mint Operations**: Only accessible via Registry webhooks or Admin CLI
- **Mapping Operations**: Only accessible via Admin CLI

## 📖 API Documentation

### Credit Domain Endpoints

#### Issuance Finalization
```http
POST /v1/credit/issuance/finalize
Content-Type: application/json
Authorization: Bearer <jwt-token>
Idempotency-Key: <uuid>

{
  "issuanceId": "issuance_123",
  "projectId": "project_456",
  "vintageStart": "2023-01-01T00:00:00Z",
  "vintageEnd": "2023-12-31T23:59:59Z",
  "quantity": 1000,
  "factorRef": "factor_789",
  "evidenceHashes": ["0xabc123..."]
}
```

**Response:**
```json
{
  "domain": "credit",
  "sourceOfRecord": "registry",
  "adapterTxId": "c1234567890abcdef",
  "classId": "class_123",
  "quantity": 1000,
  "txHash": "0xdef456...",
  "blockNumber": 12345,
  "onchainHash": "0xghi789...",
  "receiptUrl": "/v1/receipts/c1234567890abcdef"
}
```

#### Credit Retirement
```http
POST /v1/credit/retire
Content-Type: application/json
Authorization: Bearer <jwt-token>
Idempotency-Key: <uuid>

{
  "classId": "class_123",
  "holder": "0x1234567890123456789012345678901234567890",
  "quantity": 100,
  "purposeHash": "0xabc123...",
  "beneficiaryHash": "0xdef456..."
}
```

### Token Domain Endpoints (Admin Only)

#### Token Minting
```http
POST /v1/token/mint
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>
Idempotency-Key: <uuid>

{
  "classId": "class_123",
  "to": "0x1234567890123456789012345678901234567890",
  "quantity": 1000,
  "chainId": "137",
  "contractAddress": "0xabcdef1234567890123456789012345678901234",
  "tokenId": "token_123"
}
```

**Response:**
```json
{
  "domain": "token",
  "sourceOfRecord": "chain",
  "adapterTxId": "c1234567890abcdef",
  "classId": "class_123",
  "quantity": 1000,
  "txHash": "0xdef456...",
  "blockNumber": 12345,
  "onchainHash": "0xghi789...",
  "receiptUrl": "/v1/receipts/c1234567890abcdef"
}
```

### Class Mapping Management

#### Create Mapping
```http
POST /v1/classes/map
Content-Type: application/json
Authorization: Bearer <admin-jwt-token>
Idempotency-Key: <uuid>

{
  "classId": "class_123",
  "chainId": "137",
  "contractAddress": "0xabcdef1234567890123456789012345678901234",
  "tokenId": "token_123"
}
```

#### Get Mapping
```http
GET /v1/classes/map/class_123
Authorization: Bearer <jwt-token>
```

## 🛠️ Development

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm db:migrate   # Run database migrations
pnpm db:seed      # Seed database with demo data
pnpm test         # Run unit tests
pnpm test:e2e     # Run end-to-end tests
pnpm lint         # Run ESLint
```

## 📖 Documentation

- [API Documentation](http://localhost:4100/docs) - Interactive OpenAPI documentation
- [README](README.md) - Complete setup and usage guide
- [Architecture](docs/architecture.md) - System design and components

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@carboncredit.example.com
- 🐛 Issues: [GitHub Issues](https://github.com/ShantanuVr/registry-adapter-api/issues)
- 📚 Documentation: [API Docs](http://localhost:4100/docs)

---

**Built with ❤️ by the Carbon Credit Registry Team**