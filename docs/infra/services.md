# Services Directory

A comprehensive reference of all microservices in the Construct infrastructure platform.

## Service Reference

| Service | Purpose | Tech Stack | Port | Status |
|---------|---------|-----------|------|--------|
| **Accounts** | User management & authentication | Go + Vue.js + Templates | 8001 | Production |
| **Billing** | Subscriptions, invoicing, payments | Go + Vue.js | 8002 | Production |
| **Delivery** | Transaction main server API | Go + Vue.js | 8003 | Production |
| **Developer** | Dev portal & API management | Go + Vue.js + Templates | 8004 | Production |
| **Domains** | Domain & DNS management | Go + Vue.js | 8005 | Production |
| **Graph** | Data aggregation, deployment & PaaS | Go + Vue.js | 8006 | Production |
| **Oracle** | Main infrastructure admin | Go + Vue.js | 8007 | Production |
| **Source** | Construct API | Go | 8009 | Production |

## Service Details

### Accounts

**Path**: `infra/accounts/`

**Responsibilities**:
- User registration and signup flow
- Login and session management
- Password reset and security
- User profile management
- Role and permission assignment
- Team/organization management

**API Endpoints**:
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - Logout
- `GET /api/users/:id` - Get user profile
- `PUT /api/users/:id` - Update user
- `POST /api/auth/password-reset` - Reset password
- `GET /api/teams` - List user's teams
- `POST /api/teams` - Create team

**Frontend**: Vue.js dashboard for account management

**Database Schema**: `accounts` schema in PostgreSQL

**Key Dependencies**:
- Billing (user subscription info)
- Delivery (transaction data)
- Email service (password reset)

**Development**:
```bash
cd infra/accounts
go run ./cmd/accounts
# Runs on http://localhost:8001
```

---

### Billing

**Path**: `infra/billing/`

**Responsibilities**:
- Subscription management
- Pricing tiers and plans
- Invoice generation
- Payment processing
- Usage-based billing
- Refund handling
- Billing history and reports

**API Endpoints**:
- `GET /api/subscriptions` - List user subscriptions
- `POST /api/subscriptions` - Create subscription
- `PUT /api/subscriptions/:id` - Update subscription
- `GET /api/invoices` - List invoices
- `POST /api/payments` - Process payment
- `GET /api/usage` - Get usage metrics
- `POST /api/refunds` - Process refund

**Frontend**: Vue.js billing dashboard

**Database Schema**: `billing` schema

**Integrations**:
- Stripe for payment processing
- Accounts service for user info
- Delivery service for transaction metrics

**Development**:
```bash
cd infra/billing
go run ./cmd/billing
# Runs on http://localhost:8002
```

---

### Delivery (construct.delivery)

**Path**: `infra/delivery/`

**Role**: Transaction main server API — the core transactional backend that powers Construct's server-side operations.

**Responsibilities**:
- Transaction processing and management
- Main server API for client-server communication
- Data persistence and retrieval for transactional operations
- Business logic orchestration
- Event processing and distribution
- Webhook delivery and management
- API gateway for transactional workflows

**API Endpoints**:
- `POST /api/transactions` - Create transaction
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction details
- `PUT /api/transactions/:id` - Update transaction
- `POST /api/events` - Publish event
- `GET /api/events` - List events
- `POST /api/webhooks` - Register webhook
- `GET /api/webhooks` - List webhooks

**Frontend**: Vue.js transaction management console

**Database Schema**: `delivery` schema

**Development**:
```bash
cd infra/delivery
go run ./cmd/delivery
# Runs on http://localhost:8003
```

---

### Developer

**Path**: `infra/developer/`

**Responsibilities**:
- Developer portal interface
- API key generation and management
- Rate limiting and quota management
- SDK downloads and documentation
- Integration marketplace
- Developer support and ticketing

**API Endpoints**:
- `GET /api/developer/keys` - List API keys
- `POST /api/developer/keys` - Generate new key
- `DELETE /api/developer/keys/:id` - Revoke key
- `GET /api/developer/quotas` - Get quota usage
- `GET /api/integrations` - List available integrations
- `POST /api/integrations/:id/connect` - Connect integration
- `GET /api/documentation` - Access docs

**Frontend**: Vue.js developer dashboard + HTML documentation

**Database Schema**: `developer` schema

**Documentation**: Static HTML served from `/docs`

**Development**:
```bash
cd infra/developer
go run ./cmd/developer
# Runs on http://localhost:8004
```

---

### Domains

**Path**: `infra/domains/`

**Responsibilities**:
- Domain registration
- Domain transfer management
- DNS record management
- SSL/TLS certificate provisioning
- Custom domain support
- Domain health monitoring
- WHOIS and domain information

**API Endpoints**:
- `GET /api/domains` - List user domains
- `POST /api/domains` - Register/add domain
- `PUT /api/domains/:id` - Update domain
- `DELETE /api/domains/:id` - Delete domain
- `GET /api/domains/:id/dns` - Get DNS records
- `PUT /api/domains/:id/dns/:record` - Update DNS record
- `POST /api/domains/:id/ssl` - Provision SSL cert
- `GET /api/domains/:id/health` - Domain health status

**Frontend**: Vue.js domain management interface

**Database Schema**: `domains` schema

**Integrations**:
- DNS providers (Route53, Cloudflare)
- Certificate authorities (Let's Encrypt, Sectigo)
- WHOIS lookup services

**Development**:
```bash
cd infra/domains
go run ./cmd/domains
# Runs on http://localhost:8005
```

---

### Graph

**Path**: `infra/graph/`

**Role**: Data aggregation, querying, and platform deployment — combines GraphQL data layer with PaaS capabilities.

::: tip
The Graph service incorporates what was previously the standalone PaaS service. All PaaS documentation in `infra/graph/docs/` (vision, architecture, data models, SDK, implementation plans, database design) remains the canonical reference.
:::

**Responsibilities**:
- GraphQL API for complex queries
- Data aggregation across services
- Application deployment management
- Container orchestration and environment configuration
- Relationship mapping
- Query optimization
- Schema management
- Real-time subscriptions

**API Endpoints**:
- `POST /graphql` - Execute GraphQL query
- `GET /graphql/schema` - Get schema definition
- `POST /graphql/subscription` - WebSocket subscriptions
- `GET /api/deployments` - List deployments
- `POST /api/deployments` - Create deployment
- `GET /api/deployments/:id` - Deployment details
- `GET /health` - Health check

**GraphQL Types**: User, Team, Project, Service, Deployment, Environment, etc.

**Frontend**: Vue.js with GraphQL client

**Database Schema**: `graph` schema with relationship tables

**Documentation**: Comprehensive docs in `infra/graph/docs/`
- Schema definitions and query examples
- Vision and architecture (from PaaS)
- Data models
- SDK documentation
- Implementation plans
- Database design

**Development**:
```bash
cd infra/graph
go run ./cmd/graph
# Runs on http://localhost:8006
# GraphQL playground: http://localhost:8006/playground
```

---

### Oracle

**Path**: `infra/oracle/`

**Role**: Main Construct admin — the central administration and control plane for the entire infrastructure.

**Responsibilities**:
- Infrastructure-wide administration and configuration
- Service orchestration and health monitoring
- System-wide settings and policies
- Cross-service user and permission management
- Audit logging and compliance tracking
- Centralized dashboards and reporting
- Service discovery and configuration management
- Infrastructure metrics aggregation

**API Endpoints**:
- `GET /api/admin/services` - List all services and status
- `GET /api/admin/config` - System-wide configuration
- `PUT /api/admin/config` - Update configuration
- `GET /api/admin/users` - Cross-service user management
- `GET /api/admin/audit` - Audit log
- `GET /api/admin/health` - Infrastructure health dashboard
- `GET /api/admin/metrics` - Aggregated metrics
- `POST /api/admin/actions` - Execute admin actions

**Frontend**: Vue.js admin dashboard

**Database Schema**: `oracle` schema with admin tables

**Development**:
```bash
cd infra/oracle
go run ./cmd/oracle
# Runs on http://localhost:8007
```

---

### Source (Construct API)

**Path**: `infra/source/`

**Role**: The main Construct API — the primary API backend and gateway for the entire platform.

**Responsibilities**:
- Core API endpoints consumed by all Construct clients (desktop app, web, SDK)
- Authentication and authorization gateway
- API routing and versioning
- Rate limiting and throttling
- Request validation and transformation
- API documentation and schema serving
- Client SDK integration
- Webhook and event distribution

**API Endpoints**:
- `GET /api/v1/*` - Versioned API endpoints
- `POST /api/auth/token` - Token generation
- `GET /api/schema` - API schema
- `GET /api/health` - Health check
- `POST /api/webhooks` - Register webhooks

**Database Schema**: `source` schema

**Development**:
```bash
cd infra/source
go run ./cmd/source
# Runs on http://localhost:8009
```

## Common Endpoints

All services implement these standard endpoints:

```
GET  /health                    - Health check
GET  /health/ready              - Readiness probe
GET  /metrics                   - Prometheus metrics
GET  /version                   - Service version
GET  /api/swagger.json          - OpenAPI/Swagger spec
```

## Port Mapping

Development port allocation:

```
8001 - Accounts
8002 - Billing
8003 - Delivery (construct.delivery — transaction API)
8004 - Developer
8005 - Domains
8006 - Graph (includes PaaS)
8007 - Oracle (infrastructure admin)
8009 - Source (Construct API)
```

Production uses port 443 (HTTPS) with service routing via ingress.

## Database Schemas

Each service owns its schema:

```
PostgreSQL
├── accounts         (users, sessions, roles)
├── billing          (subscriptions, invoices)
├── delivery         (transactions, events, webhooks)
├── developer        (api_keys, quotas)
├── domains          (domains, dns_records)
├── graph            (relationships, deployments, environments)
├── oracle           (admin, audit, config)
└── source           (api_routes, tokens, schemas)
```

## Inter-Service Communication

Service dependencies:

```
Accounts    → none (foundational)
Billing     → Accounts, Delivery
Delivery    → Accounts, Source
Developer   → Accounts
Domains     → Accounts
Graph       → All services (data aggregation + deployment)
Oracle      → All services (admin control plane)
Source      → Accounts (API gateway)
```

Oracle and Graph are cross-cutting services. Oracle provides centralized administration, while Graph provides data aggregation and deployment orchestration.

## Development Commands

Standard commands for all services:

```bash
# Go to service directory
cd infra/[service-name]

# Build
go build ./cmd/[service-name]

# Run
go run ./cmd/[service-name]

# Test
go test ./...

# Lint
golangci-lint run

# Database migration
go run ./cmd/[service-name] migrate up
```

## Documentation

- **Service README**: Each service has `README.md` with quick start
- **API Docs**: OpenAPI/Swagger specs at `/api/swagger.json`
- **Database**: Schema files in `db/migrations/`
- **Environment**: `.env.example` with all variables

For detailed service documentation, see individual service READMEs in their directories.
