# Registry Adapter API

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

A production-quality adapter service that sits between the Official Registry Simulator and on-chain contracts. It provides REST endpoints for the registry, enforces policy and RBAC, performs idempotent, signed transactions on chain, and records canonical receipts.

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

- **REST API**: Clean endpoints for issuance finalization, retirements, transfers, and evidence/IoT anchoring
- **Business Rules**: Enforces role scopes, project/class mapping, factor references, and issuance/retirement invariants
- **On-chain Integration**: Performs calls to CarbonCredit1155 + EvidenceAnchor via dedicated signer
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