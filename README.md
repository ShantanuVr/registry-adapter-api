# Registry Adapter API

A production-quality adapter service that sits between the Official Registry Simulator and on-chain contracts. It provides REST endpoints for the registry, enforces policy and RBAC, performs idempotent, signed transactions on chain, and records canonical receipts.

## Features

- **REST API**: Clean endpoints for issuance finalization, retirements, transfers, and evidence/IoT anchoring
- **Business Rules**: Enforces role scopes, project/class mapping, factor references, and issuance/retirement invariants
- **On-chain Integration**: Performs calls to CarbonCredit1155 + EvidenceAnchor via dedicated signer
- **Idempotency**: Guarantees idempotent operations with strong audit trails
- **Security**: JWT verification, RBAC, rate limiting, and request validation
- **Observability**: Structured logging, Prometheus metrics, and health checks
- **Documentation**: Complete OpenAPI 3.1 specification with interactive docs

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- pnpm (recommended) or npm

### Local Development

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd registry-adapter-api
   pnpm install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start with Docker Compose:**
   ```bash
   docker compose up -d
   ```

4. **Run database migrations and seeds:**
   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

5. **Start development server:**
   ```bash
   pnpm dev
   ```

The API will be available at:
- **API**: http://localhost:4100
- **Documentation**: http://localhost:4100/docs
- **Health Check**: http://localhost:4100/health
- **Metrics**: http://localhost:4100/metrics

### Mock Services

The Docker Compose setup includes mock services for demo purposes:
- **Registry Simulator**: http://localhost:3000
- **Evidence Locker**: http://localhost:3001
- **IoT Oracle**: http://localhost:3002

## API Endpoints

### Authentication

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Core Operations

#### Issuance Finalization
```http
POST /v1/issuance/finalize
Content-Type: application/json
Idempotency-Key: <uuid>
Authorization: Bearer <jwt>

{
  "issuanceId": "ISS001",
  "projectId": "PRJ001",
  "vintageStart": "2020-01-01T00:00:00Z",
  "vintageEnd": "2020-12-31T23:59:59Z",
  "quantity": 1000,
  "factorRef": "FACTOR_001",
  "evidenceHashes": ["0xabc123", "0xdef456"]
}
```

#### Credit Retirement
```http
POST /v1/retire
Content-Type: application/json
Idempotency-Key: <uuid>
Authorization: Bearer <jwt>

{
  "classId": "0x1001",
  "holder": "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6",
  "quantity": 100,
  "purposeHash": "0x1234...",
  "beneficiaryHash": "0xabcd..."
}
```

#### Evidence Anchoring
```http
POST /v1/anchor
Content-Type: application/json
Idempotency-Key: <uuid>
Authorization: Bearer <jwt>

{
  "topic": "IOT:PRJ001:2025-01-01",
  "hash": "0x1234...",
  "uri": "https://ipfs.io/ipfs/QmHash"
}
```

### Utility Endpoints

- `GET /v1/receipts/:adapterTxId` - Get transaction receipt
- `GET /v1/classes/resolve?projectId=...&vintageStart=...&vintageEnd=...` - Resolve class ID
- `GET /v1/tx/:txHash` - Get transaction status
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | API port | `4100` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `JWT_JWKS_URL` | JWT public keys endpoint | Required |
| `JWT_ISSUER` | JWT issuer | Required |
| `CHAIN_RPC_URL` | Blockchain RPC URL | Required |
| `CHAIN_ID` | Blockchain network ID | Required |
| `SIGNER_PRIV` | Private key for signing | Required |
| `TOKENS_CREDIT1155_ADDR` | CarbonCredit1155 contract address | Required |
| `EVIDENCE_ANCHOR_ADDR` | EvidenceAnchor contract address | Required |

### Feature Flags

- `ENABLE_REGISTRY_CALLBACK` - Enable registry validation callbacks
- `READONLY_MODE` - Disable all mutating operations
- `MOCK_CHAIN` - Use mock blockchain responses
- `MOCK_LOCKER` - Use mock evidence locker
- `MOCK_ORACLE` - Use mock IoT oracle

## Architecture

### Core Modules

- **Auth**: JWT verification and role-based authorization
- **Classes**: Project-to-class mapping and validation
- **Issuance**: Credit issuance finalization and minting
- **Retire**: Credit retirement and burning
- **Anchor**: Evidence anchoring on-chain
- **Receipts**: Transaction receipt management
- **Audit**: Append-only audit logging
- **Idempotency**: Request deduplication

### Data Model

- **Receipt**: Transaction records with on-chain details
- **ClassMap**: Project/vintage to class ID mappings
- **Idempotency**: Request deduplication tracking
- **AuditEvent**: Immutable audit trail

### Security

- JWT verification with JWKS
- Role-based access control (RBAC)
- Rate limiting and CORS protection
- Request validation with Zod schemas
- Idempotency key enforcement

## Development

### Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm db:migrate   # Run database migrations
pnpm db:seed      # Seed database with demo data
pnpm db:studio    # Open Prisma Studio
pnpm test         # Run unit tests
pnpm test:e2e     # Run end-to-end tests
pnpm lint         # Run ESLint
pnpm typecheck    # Run TypeScript compiler
```

### Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:coverage
```

### Database

The application uses PostgreSQL with Prisma ORM. Database schema is defined in `prisma/schema.prisma`.

```bash
# Generate Prisma client
pnpm db:generate

# Create migration
pnpm db:migrate dev

# Reset database
pnpm db:migrate reset
```

## Production Deployment

### Docker

```bash
# Build image
docker build -t registry-adapter-api .

# Run container
docker run -p 4100:4100 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_JWKS_URL="https://..." \
  registry-adapter-api
```

### Environment Setup

1. Set up PostgreSQL database
2. Configure JWT JWKS endpoint
3. Deploy smart contracts and update addresses
4. Set production environment variables
5. Run database migrations
6. Deploy application

### Monitoring

- Health checks at `/health`
- Prometheus metrics at `/metrics`
- Structured logging with trace IDs
- Database connection monitoring

## API Documentation

Interactive API documentation is available at `/docs` when running the application. The OpenAPI specification includes:

- Complete endpoint documentation
- Request/response schemas
- Authentication requirements
- Example requests and responses
- Error codes and messages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For questions and support:
- Create an issue in the repository
- Contact the Carbon Credit Registry Team
- Check the API documentation at `/docs`
