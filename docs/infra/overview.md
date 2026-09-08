# Infrastructure Overview

The Construct infrastructure is a microservices-based platform supporting company and project management, billing, deployment, and developer tools. The infra directory contains 9 independent services that work together to provide the complete platform.

## Architecture

Construct uses a distributed microservices architecture:

```
┌─────────────────────────────────────────────────┐
│              Construct Desktop                   │
│          (Vue 3 + Tauri Desktop)                │
└──────────────────┬──────────────────────────────┘
                   │
       ┌───────────┴────────────────┐
       │                            │
┌──────▼──────────┐        ┌──────▼──────────┐
│  Operator       │        │  Infra Services │
│  (Go, :60100)   │        │  (REST APIs)    │
└─────────────────┘        └────────┬────────┘
                                    │
        ┌───────────┬───────────────┼───────────┬──────────┐
        │           │               │           │          │
    ┌───▼───┐  ┌───▼───┐      ┌───▼───┐  ┌───▼───┐  ┌───▼───┐
    │Accounts│  │Billing│      │Domains│  │Source │  │Graph  │
    └───────┘  └───────┘      └───────┘  │(API)  │  │       │
        │           │               │    └───────┘  └───────┘
    ┌───▼───┐  ┌───▼───────┐  ┌───▼───┐     │          │
    │Delivery│  │  Oracle   │  │ Dev   │  ┌──▼───┐  ┌──▼───┐
    │(Txn)  │  │  (Admin)  │  │Portal │  │Source│  │Graph │
    └───────┘  └───────────┘  └───────┘  │Query │  │Query │
                                          └──────┘  └──────┘
```

## Microservices

The infra directory contains these 9 services:

### 1. Accounts

**Purpose**: User account management, authentication, and authorization.

- User registration and login
- Password management
- Session management
- Permission and role assignment
- User profiles and settings

**Stack**: Go + Vue.js frontend + HTML templates

**Database**: PostgreSQL (production) / SQLite (development)

**API**: RESTful HTTP endpoints

### 2. Billing

**Purpose**: Subscription management, invoicing, and payment processing.

- Subscription tiers and pricing
- Invoice generation and tracking
- Payment processing integration
- Usage tracking and analytics
- Refund management

**Stack**: Go + Vue.js frontend

**Database**: PostgreSQL (production)

**API**: RESTful HTTP endpoints

**Integrations**: Stripe, payment gateways

### 3. Delivery (construct.delivery)

**Purpose**: Transaction main server API — the core transactional backend for Construct.

- Transaction processing and management
- Main server API for client-server communication
- Data persistence and retrieval
- Business logic orchestration
- Event processing and distribution
- Webhook delivery and management

**Stack**: Go + Vue.js frontend

**Database**: PostgreSQL (production)

**API**: RESTful HTTP endpoints — the primary transaction API consumed by the desktop app and other services

### 4. Developer

**Purpose**: Developer portal and API management.

- API key generation and management
- Rate limiting and quotas
- Developer documentation
- SDK downloads
- Integration marketplace

**Stack**: Go + Vue.js frontend + HTML templates

**Database**: PostgreSQL (production)

**API**: RESTful HTTP endpoints

### 5. Domains

**Purpose**: Domain management and DNS configuration.

- Domain registration and transfer
- DNS record management
- SSL/TLS certificate management
- Domain health monitoring
- Custom domain support

**Stack**: Go + Vue.js frontend

**Database**: PostgreSQL (production)

**API**: RESTful HTTP endpoints

**Integrations**: DNS providers, certificate authorities

### 6. Graph

**Purpose**: Query language, data retrieval, and platform-as-a-service backend.

- GraphQL API for complex queries
- Data aggregation across services
- Application deployment management
- Container orchestration and environment configuration
- Relationship mapping and advanced querying
- Query optimization

**Stack**: Go + Vue.js frontend

**Database**: PostgreSQL with graph extensions

**API**: GraphQL endpoint

**Documentation**: Comprehensive docs in `infra/graph/docs/`

::: tip
The Graph service previously contained the PaaS functionality. All PaaS-related documentation in `infra/graph/docs/` (vision, architecture, data models, SDK, implementation plans, database design) remains the canonical reference.
:::

### 7. Oracle

**Purpose**: Main Construct admin service — the central administration hub for the entire infrastructure.

- Infrastructure-wide administration and configuration
- Service orchestration and health monitoring
- System-wide settings and policies
- User management across all services
- Audit logging and compliance
- Centralized dashboards and reporting
- Cross-service configuration management

**Stack**: Go + Vue.js frontend

**Database**: PostgreSQL with admin tables

**API**: RESTful HTTP endpoints

**Role**: Oracle acts as the master control plane for the Construct infrastructure, providing a unified admin interface over all other services.

### 8. Source (Construct API)

**Purpose**: The main Construct API — the primary API gateway and backend for the platform.

- Core API endpoints consumed by all Construct clients
- Authentication and authorization gateway
- API routing and versioning
- Rate limiting and throttling
- Request validation and transformation
- API documentation and schema serving

**Stack**: Go backend

**Database**: PostgreSQL (production)

**API**: RESTful HTTP endpoints — the central API that other services and clients depend on

### 9. _Graph (Legacy: PaaS)_

::: info
The service previously known as **PaaS** has been merged into the **Graph** service. See [Graph documentation](./graph.md) for details.
:::

## Technology Stack

### Backend

**Language**: Go 1.25+

**Web Framework**: Standard library or Chi router

**Database**:
- Development: SQLite files
- Production: PostgreSQL 14+

**Deployment**: Docker containers with Captain orchestration

### Frontend

All services with UI components use:

**Framework**: Vue.js 3 with Composition API

**Build**: Vite

**Styling**: Tailwind CSS / Construct design system

**State Management**: Pinia (where needed)

### Data Layer

**Primary Database**: PostgreSQL for all production services

**Database Features**:
- Connection pooling
- Full-text search
- JSON support
- Row-level security
- Materialized views

**Migrations**: SQL-based versioning

## Deployment

### Development Environment

```bash
# Run locally with SQLite
ENVIRONMENT=development go run ./cmd/service

# All services log to stdout
# API runs on service-specific ports
```

### Production Environment

```yaml
# Deployed via Captain (container orchestrator)
apiVersion: v1
kind: Service
metadata:
  name: accounts-service
spec:
  containers:
    - name: accounts
      image: construct/accounts:latest
      env:
        - name: DATABASE_URL
          value: postgresql://user:pass@db:5432/accounts
        - name: PORT
          value: "8080"
```

**Characteristics**:
- Containerized (Docker)
- Orchestrated (Captain)
- Auto-scaling enabled
- Health checks configured
- Blue-green deployments

## Service Communication

### Internal APIs

Services communicate via HTTP REST APIs:

```
Accounts → Billing (for user info)
Billing → Delivery (for transaction info)
Graph → All services (aggregating data, deployment management)
Oracle → All services (admin and monitoring)
Source → All services (core API gateway)
```

### External Integration

Services integrate with:
- Payment processors (Stripe)
- Email providers (SendGrid, AWS SES)
- DNS providers (Route53, Cloudflare)
- Storage (S3, GCS)
- Authentication (OAuth2, OpenID Connect)

## Data Storage

### SQLite (Development)

Each service stores SQLite databases locally:

```
data/
  accounts.db
  billing.db
  domains.db
  ...
```

**Advantages**:
- No external database required
- Fast iteration
- Offline development

**Limitations**:
- Single user only
- No concurrent access
- Not suitable for production

### PostgreSQL (Production)

All services use a shared PostgreSQL instance with separate schemas:

```sql
CREATE SCHEMA accounts;
CREATE SCHEMA billing;
CREATE SCHEMA domains;
...
```

**Features**:
- ACID transactions
- Full-text search
- JSON data types
- Row-level security
- Materialized views

**Configuration**:
- Connection pooling (PgBouncer)
- Replication for HA
- Daily backups
- Monitoring and alerting

## Monitoring & Logging

### Logs

All services output structured JSON logs to stdout:

```json
{
  "timestamp": "2026-03-29T10:15:30Z",
  "level": "info",
  "service": "accounts",
  "message": "User login successful",
  "user_id": "user_123",
  "request_id": "req_abc"
}
```

Logs are aggregated by logging infrastructure (ELK stack, Datadog, etc.).

### Metrics

Each service exposes Prometheus-compatible metrics:

```
accounts_login_total{status="success"} 1234
accounts_login_duration_seconds{quantile="0.95"} 0.245
database_connections_active 12
```

Metrics are scraped and visualized in monitoring dashboards.

### Health Checks

Each service has `/health` endpoint:

```
GET /health
{
  "status": "healthy",
  "timestamp": "2026-03-29T10:15:30Z",
  "database": "connected",
  "version": "1.2.0"
}
```

Used by orchestrators for readiness and liveness probes.

## Security

### Authentication

- API keys for service-to-service communication
- OAuth2 for user authentication
- JWT tokens for session management
- Rate limiting on public endpoints

### Authorization

- Role-based access control (RBAC)
- Resource-based access control (RBAC)
- Row-level security in database
- API scope validation

### Data Protection

- Encryption at rest (database)
- Encryption in transit (TLS 1.3)
- Secrets management (environment variables, secret stores)
- Regular security audits

## Scalability

### Horizontal Scaling

Services are stateless and can be scaled horizontally:

```bash
# Scale accounts service to 5 replicas
kubectl scale deployment accounts --replicas=5
```

### Database Scaling

PostgreSQL handles scale via:
- Read replicas for read-heavy workloads
- Connection pooling for concurrent access
- Caching layer (Redis) for hot data
- Sharding for data partitioning

### Rate Limiting

Each service implements rate limiting:

```
100 requests per minute per API key
1000 requests per minute per user
10000 requests per minute per service
```

## Development Workflow

### Local Development

```bash
# Start one service
cd infra/accounts
go run ./cmd/accounts

# Or all services with docker-compose
docker-compose up
```

### Testing

Each service has comprehensive tests:

```bash
go test ./...           # Unit tests
go test -cover ./...    # With coverage
go test -race ./...     # Race condition detection
```

### Deployment

```bash
# Build Docker image
docker build -t construct/accounts:v1.2.0 .

# Push to registry
docker push construct/accounts:v1.2.0

# Deploy (Captain handles orchestration)
captain deploy accounts v1.2.0
```

## Related Documentation

For detailed information about specific services:

- **Graph** (includes PaaS): See [Graph documentation](./graph.md) for comprehensive architecture, data models, and SDK docs
- **Services**: See [Services Reference](./services.md) for detailed service listing

## Getting Started

To work with the infrastructure:

1. Clone the main Construct repo
2. Navigate to the infra directory
3. Start with a specific service:
   ```bash
   cd infra/accounts
   go mod download
   go run ./cmd/accounts
   ```
4. Read the README in each service directory
5. Check the database migrations in `db/migrations/`
6. Review the API documentation in service READMEs

## Architecture Principles

1. **Microservices**: Independent, loosely coupled services
2. **API-First**: Services communicate via well-defined APIs
3. **Stateless**: Services can be restarted without data loss
4. **Scalable**: Each service scales independently
5. **Observable**: Comprehensive logging and metrics
6. **Resilient**: Graceful degradation and error handling
7. **Secure**: Multi-layer security and access control
