# Graph Service

The Graph service is Construct's dynamic database and GraphQL API layer. Spaces define data models in their manifests, and Graph automatically creates PostgreSQL schemas, tables, and a GraphQL API — no backend code required.

## Overview

When a space is published with data models, Graph:

1. **Creates a database schema** isolated per space+project (e.g. `s_canvas_p_default`)
2. **Creates tables** from the model definitions with proper types, constraints, and foreign keys
3. **Serves a GraphQL API** for CRUD operations with access control

## Service Information

| | |
|---|---|
| **Location** | `infra/graph/` |
| **Technology** | Go + Vue.js admin frontend |
| **Database** | PostgreSQL |
| **Port** | 8080 |
| **API** | GraphQL + REST |
| **Production** | `graph.construct.space` |

## SDK

Spaces interact with Graph through the `@construct-space/graph` SDK. See the [Graph SDK Guide](/guide/graph-sdk) for full documentation.

```bash
bun add @construct-space/graph
```

## Defining Models

Models are defined using the SDK's builder API and compiled into `data.manifest.json`:

```typescript
import { defineModel, field, relation } from '@construct-space/graph'

const Department = defineModel('department', {
  name: field.string().required(),
  description: field.string(),
})

const Employee = defineModel('employee', {
  first_name: field.string().required(),
  last_name: field.string().required(),
  email: field.string().email().unique(),
  department: relation.belongsTo(Department, { onDelete: 'cascade' }),
})
```

### Field Types

| Type | Builder | SQL (Postgres) |
|------|---------|----------------|
| String | `field.string()` | TEXT |
| Integer | `field.int()` | INTEGER |
| Number | `field.number()` | NUMERIC |
| Boolean | `field.boolean()` | BOOLEAN |
| Date | `field.date()` | TIMESTAMPTZ |
| JSON | `field.json()` | JSONB |
| Enum | `field.enum(['a', 'b'])` | TEXT + CHECK |

### Field Modifiers

```typescript
field.string().required()        // NOT NULL
field.string().unique()          // UNIQUE constraint
field.string().index()           // database index
field.string().default('hello')  // default value
field.string().email()           // email validation
field.string().url()             // URL validation
field.int().min(0).max(100)      // range validation
```

### Relations

Relations create foreign key columns and enable nested GraphQL queries.

```typescript
// belongsTo — creates a foreign key column (employee.department_id)
relation.belongsTo(Department)
relation.belongsTo(Department, { onDelete: 'cascade' })
relation.belongsTo(Department, { onDelete: 'set_null', nullable: true })

// hasMany — virtual inverse (no column, resolved via query)
relation.hasMany(Employee)
```

**belongsTo** creates a `{field}_id` UUID column with a foreign key reference. On query, resolved via SQL `LEFT JOIN` (single query, no N+1).

**hasMany** creates no column. On query, resolved via batch `WHERE fk IN (...)` query (exactly 2 queries total, no N+1).

## GraphQL API

### Queries

```graphql
# List records (plural)
{ employees(limit: 10, offset: 0) { id first_name email created_at } }

# Single record by ID
{ employee(id: "uuid") { id first_name email } }

# Count
{ employeesCount { } }

# With filters (via variables)
query($where: JSON, $orderBy: JSON) {
  employees(where: $where, orderBy: $orderBy) { id first_name }
}
# variables: { "where": { "status": "active" }, "orderBy": { "created_at": "desc" } }
```

### Filter Operators

```json
{
  "where": {
    "age": { "$gt": 25 },
    "status": { "$in": ["active", "pending"] },
    "email": { "$like": "%@company.com" },
    "deleted_at": { "$null": true }
  }
}
```

| Operator | Description |
|----------|-------------|
| `$gt`, `$gte` | Greater than (or equal) |
| `$lt`, `$lte` | Less than (or equal) |
| `$ne` | Not equal |
| `$like` | SQL LIKE pattern |
| `$in` | Value in array |
| `$null` | IS NULL / IS NOT NULL |

### Nested Relations

Query related data without N+1:

```graphql
# belongsTo — resolved via LEFT JOIN (1 query)
{
  employees(limit: 20) {
    id
    first_name
    department {
      id
      name
    }
  }
}

# hasMany — resolved via batch IN query (2 queries)
{
  departments(limit: 10) {
    id
    name
    employees {
      id
      first_name
      email
    }
  }
}
```

### Mutations

```graphql
# Create
mutation($input: JSON!) {
  createEmployee(input: $input) { id first_name }
}
# variables: { "input": { "first_name": "Jane", "email": "jane@co.com" } }

# Update
mutation($id: ID!, $input: JSON!) {
  updateEmployee(id: $id, input: $input) { id first_name }
}

# Delete
mutation($id: ID!) {
  deleteEmployee(id: $id)
}
```

## Access Control

Models define per-operation access levels:

```typescript
defineModel('task', {
  title: field.string().required(),
}, {
  access: {
    read: 'member',        // any project member
    create: 'authenticated', // any logged-in user
    update: 'owner',        // only the creator
    delete: 'admin',        // only admins
  }
})
```

| Level | Description |
|-------|-------------|
| `public` | Anyone, no auth required |
| `authenticated` | Any logged-in user |
| `owner` | Only the record creator (`created_by` filter) |
| `member` | Project/company member |
| `admin` | Admin role |
| `none` | Operation disabled |

## Auto-Generated Fields

Every record automatically gets:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `created_at` | Timestamp | Record creation time |
| `updated_at` | Timestamp | Last modification time |
| `created_by` | UUID | User ID of creator |

## Schema Isolation

Each space+project gets its own PostgreSQL schema:

- **Project scope** (default): `s_{spaceId}_p_{projectId}` — isolated per project
- **Company scope**: `c_{companyId}_s_{spaceId}` — shared across projects in a company

## REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/graphql` | GraphQL queries and mutations |
| `POST` | `/api/schemas/register` | Register/update a space schema |
| `GET` | `/api/schemas/{spaceId}` | Get schema info for a space |
| `GET` | `/api/spaces` | List provisioned spaces |
| `GET` | `/health` | Health check |

### Required Headers

| Header | Description |
|--------|-------------|
| `X-Space-ID` | Space identifier (required) |
| `X-Project-ID` | Project identifier (defaults to "default") |
| `X-Company-ID` | Company identifier (for company-scoped spaces) |
| `Authorization` | Bearer token for authenticated operations |

## CLI

```bash
construct graph init                                  # add Graph to a space
construct graph g User name:string email:string       # generate model
construct graph g Post title:string author:belongsTo:User  # model with relation
construct graph push                                  # register schema with Graph
```

## Development

```bash
cd infra/graph
go mod download
go run ./cmd/graph

# GraphQL playground: http://localhost:8080/playground
# Health check: http://localhost:8080/health
```

## Configuration

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/construct_graph
PORT=8080
ACCOUNTS_URL=https://accounts.construct.space
DEV_PORTAL_URL=https://developer.construct.space
```
