# Graph SDK

The `@construct-space/graph` SDK lets spaces define data models and interact with Construct's database through a type-safe API. Define models, get a database + GraphQL API automatically.

## Install

```bash
bun add @construct-space/graph
```

Or use the CLI:

```bash
construct graph init
```

## Define Models

Create a `models/` directory in your space and define models using the builder API:

```typescript
// models/Department.ts
import { defineModel, field } from '@construct-space/graph'

export const Department = defineModel('department', {
  name: field.string().required(),
  description: field.string(),
})
```

```typescript
// models/Employee.ts
import { defineModel, field, relation } from '@construct-space/graph'
import { Department } from './Department'

export const Employee = defineModel('employee', {
  first_name: field.string().required(),
  last_name: field.string().required(),
  email: field.string().email().unique(),
  phone: field.string(),
  department: relation.belongsTo(Department, { onDelete: 'cascade' }),
  position: field.string(),
  salary: field.number(),
  active: field.boolean().default(true),
})
```

## Use Data

### useGraph Composable

`useGraph` returns a client for a model with CRUD methods:

```vue
<script setup>
import { useGraph } from '@construct-space/graph'
import { Employee } from '../models/Employee'

const employees = useGraph(Employee)

// Find all active employees
const active = await employees.find({
  where: { active: true },
  orderBy: { created_at: 'desc' },
  limit: 20,
})

// Find one by ID
const emp = await employees.findOne('uuid-here')

// Create
const newEmp = await employees.create({
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane@company.com',
})

// Update
await employees.update(newEmp.id, { position: 'Senior Engineer' })

// Delete
await employees.remove(newEmp.id)

// Count
const total = await employees.count({ where: { active: true } })
</script>
```

### Filter Operators

```typescript
await employees.find({
  where: {
    salary: { $gt: 50000 },
    position: { $in: ['Engineer', 'Designer'] },
    email: { $like: '%@company.com' },
    deleted_at: { $null: true },
  }
})
```

| Operator | Description |
|----------|-------------|
| `$gt`, `$gte` | Greater than (or equal) |
| `$lt`, `$lte` | Less than (or equal) |
| `$ne` | Not equal |
| `$like` | SQL LIKE pattern |
| `$in` | Value in array |
| `$null` | IS NULL / IS NOT NULL |

### Including Relations

Use `include` to fetch related data:

```typescript
const employees = await employees.find({
  include: ['department'],
  limit: 10,
})
// Each employee includes: { ..., department: { id: '...' } }
```

For full nested data, use raw GraphQL:

```typescript
const data = await employees.query(`{
  employees(limit: 10) {
    id
    first_name
    department {
      id
      name
      description
    }
  }
}`)
```

## Relations

### belongsTo

Creates a foreign key column. The child record references the parent.

```typescript
import { relation } from '@construct-space/graph'

const Post = defineModel('post', {
  title: field.string().required(),
  author: relation.belongsTo(User),
})
```

This creates a `author_id` UUID column on the `post` table referencing `user(id)`.

Options:
```typescript
relation.belongsTo(User, { onDelete: 'cascade' })    // delete post when user deleted
relation.belongsTo(User, { onDelete: 'set_null' })   // set null when user deleted
relation.belongsTo(User, { onDelete: 'restrict' })   // prevent user deletion
relation.belongsTo(User, { nullable: true })          // optional relation
```

### hasMany

Virtual inverse — no column created. Resolved by querying the target table.

```typescript
const User = defineModel('user', {
  name: field.string().required(),
  posts: relation.hasMany(Post),
})
```

Query with nested data:

```graphql
{
  users(limit: 5) {
    id
    name
    posts {
      id
      title
    }
  }
}
```

### Performance

Relations are resolved without N+1 queries:

- **belongsTo**: Single SQL query with `LEFT JOIN`
- **hasMany**: Exactly 2 queries — parent rows + batch `WHERE fk IN (...)`

## Access Control

Define per-operation access levels:

```typescript
const Task = defineModel('task', {
  title: field.string().required(),
  done: field.boolean().default(false),
}, {
  access: {
    read: 'owner',          // only see your own tasks
    create: 'authenticated', // any logged-in user can create
    update: 'owner',         // only update your own
    delete: 'owner',         // only delete your own
  }
})
```

Access levels: `public`, `authenticated`, `owner`, `member`, `admin`, `none`

## Model Scoping

Control data isolation:

```typescript
const Note = defineModel('note', {
  content: field.string().required(),
}, {
  scope: 'project',  // default — isolated per project
})

const Setting = defineModel('setting', {
  key: field.string().required(),
  value: field.json(),
}, {
  scope: 'company',  // shared across projects in a company
})
```

## Auto-Generated Fields

Every record automatically includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `created_at` | Timestamp | Creation time |
| `updated_at` | Timestamp | Last update |
| `created_by` | UUID | Creator's user ID |

## Configuration

Inside Construct, the SDK auto-configures from the runtime context. For standalone use:

```typescript
import { configure } from '@construct-space/graph'

configure({
  url: 'https://graph.construct.space',
  spaceId: 'my-space',
  projectId: 'default',
  getAccessToken: () => Promise.resolve('your-token'),
})
```

## CLI Commands

```bash
construct graph init                                  # add Graph SDK to space
construct graph g User name:string email:string       # generate model file
construct graph g Post title:string author:belongsTo:User  # model with relation
construct graph push                                  # register schema with Graph
```
