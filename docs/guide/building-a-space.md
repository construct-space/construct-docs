# Building a Space

This guide walks you through creating your first custom space from start to finish. We'll build a "Book Review" space that helps users write and manage book reviews.

## Prerequisites

Before starting, ensure you have:
- Construct running (`bun run dev`)
- Basic Vue 3 knowledge
- Understanding of [Spaces](/guide/spaces) and [Agents and Tools](/guide/agents-and-tools)
- Familiarity with the project structure

## Step 1: Create the Space Directory

Create a new space directory in `frontend/src/spaces/`:

```bash
mkdir -p frontend/src/spaces/book-review
cd frontend/src/spaces/book-review
```

## Step 2: Create the Space Manifest (space.json)

Create `space.json` to declare your space to the shell:

```json
{
  "id": "book-review",
  "name": "Book Review",
  "description": "Write and manage book reviews with AI assistance",
  "version": "1.0.0",
  "author": "Your Name",

  "icon": "assets/icon.svg",
  "color": "#F59E0B",

  "pages": [
    {
      "id": "index",
      "path": "/",
      "title": "Reviews",
      "component": "pages/index.vue"
    },
    {
      "id": "editor",
      "path": "/editor",
      "title": "New Review",
      "component": "pages/editor.vue"
    },
    {
      "id": "view",
      "path": "/view/:id",
      "title": "Review",
      "component": "pages/view.vue"
    }
  ],

  "agent": {
    "enabled": true,
    "configPath": "agent/config.md"
  },

  "scope": ["project"],

  "dependencies": {
    "@construct-space/ui": "^1.0.0",
    "@construct-space/sdk": "^1.0.0"
  },

  "marketplace": {
    "publishable": false,
    "category": "productivity"
  }
}
```

## Step 3: Create the Directory Structure

Set up the space file structure:

```bash
mkdir -p pages components composables stores lib agent/tools agent/hooks assets styles
```

## Step 4: Create Pages

### Main Reviews Page (pages/index.vue)

```vue
<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">Book Reviews</h1>
      <RouterLink to="/editor" class="btn btn-primary">
        + New Review
      </RouterLink>
    </div>

    <div v-if="reviews.length === 0" class="text-center py-12">
      <p class="text-gray-500">No reviews yet. Create your first one!</p>
    </div>

    <div v-else class="grid gap-4">
      <ReviewCard
        v-for="review in reviews"
        :key="review.id"
        :review="review"
        @click="navigateTo(`/view/${review.id}`)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ReviewCard from '../components/ReviewCard.vue'
import { useReviews } from '../composables/useReviews'

const router = useRouter()
const { reviews, loadReviews } = useReviews()

const navigateTo = (path: string) => {
  router.push(path)
}

onMounted(() => {
  loadReviews()
})
</script>
```

### Review Editor Page (pages/editor.vue)

```vue
<template>
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">Write a Review</h1>

    <form @submit.prevent="submitReview" class="space-y-6">
      <div>
        <label class="block text-sm font-medium mb-2">Book Title</label>
        <input
          v-model="form.title"
          type="text"
          class="input w-full"
          placeholder="Enter book title"
          required
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Author</label>
        <input
          v-model="form.author"
          type="text"
          class="input w-full"
          placeholder="Enter author name"
          required
        />
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Rating</label>
        <select v-model="form.rating" class="input w-full" required>
          <option value="">Select rating</option>
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium mb-2">Review</label>
        <textarea
          v-model="form.content"
          class="input w-full h-48"
          placeholder="Write your review here..."
          required
        />
      </div>

      <div class="flex gap-4">
        <button type="submit" class="btn btn-primary">
          Save Review
        </button>
        <button type="button" @click="askAI" class="btn btn-secondary">
          Improve with AI
        </button>
      </div>
    </form>

    <div v-if="aiSuggestion" class="mt-8 p-4 bg-blue-50 rounded">
      <h3 class="font-semibold mb-2">AI Suggestion</h3>
      <p>{{ aiSuggestion }}</p>
      <button @click="applyAISuggestion" class="btn btn-sm mt-3">
        Apply
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useReviews } from '../composables/useReviews'
import { useAgent } from '@construct-space/sdk'

const router = useRouter()
const { addReview } = useReviews()
const { execute: executeAgent } = useAgent()

const form = ref({
  title: '',
  author: '',
  rating: '',
  content: ''
})

const aiSuggestion = ref('')

const submitReview = async () => {
  await addReview({
    title: form.value.title,
    author: form.value.author,
    rating: parseInt(form.value.rating),
    content: form.value.content,
    createdAt: new Date()
  })

  router.push('/')
}

const askAI = async () => {
  aiSuggestion.value = 'Improving your review...'

  const suggestion = await executeAgent(
    `Improve this book review for clarity and impact:\n${form.value.content}`
  )

  aiSuggestion.value = suggestion
}

const applyAISuggestion = () => {
  form.value.content = aiSuggestion.value
  aiSuggestion.value = ''
}
</script>
```

## Step 5: Create Components

### ReviewCard Component (components/ReviewCard.vue)

```vue
<template>
  <div
    class="p-4 border rounded-lg hover:shadow-lg transition cursor-pointer"
    @click="$emit('click')"
  >
    <div class="flex justify-between items-start mb-2">
      <div>
        <h3 class="text-lg font-semibold">{{ review.title }}</h3>
        <p class="text-sm text-gray-600">by {{ review.author }}</p>
      </div>
      <div class="text-2xl">{{ "⭐".repeat(review.rating) }}</div>
    </div>

    <p class="text-gray-700 line-clamp-3">{{ review.content }}</p>

    <p class="text-xs text-gray-500 mt-3">
      {{ formatDate(review.createdAt) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

interface Review {
  id: string
  title: string
  author: string
  rating: number
  content: string
  createdAt: Date
}

defineProps<{
  review: Review
}>()

defineEmits(['click'])

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>
```

## Step 6: Create Composables

### useReviews Composable (composables/useReviews.ts)

```typescript
import { ref, reactive } from 'vue'
import { useStorage } from '@construct-space/sdk'

interface Review {
  id: string
  title: string
  author: string
  rating: number
  content: string
  createdAt: Date
}

const reviews = ref<Review[]>([])
const { getItem, setItem } = useStorage('book-review')

export function useReviews() {
  const loadReviews = async () => {
    const stored = await getItem('reviews')
    if (stored) {
      reviews.value = JSON.parse(stored)
    }
  }

  const addReview = async (review: Omit<Review, 'id'>) => {
    const newReview: Review = {
      ...review,
      id: Math.random().toString(36).substr(2, 9)
    }

    reviews.value.push(newReview)
    await setItem('reviews', JSON.stringify(reviews.value))
  }

  const getReview = (id: string) => {
    return reviews.value.find(r => r.id === id)
  }

  const updateReview = async (id: string, updates: Partial<Review>) => {
    const index = reviews.value.findIndex(r => r.id === id)
    if (index !== -1) {
      reviews.value[index] = { ...reviews.value[index], ...updates }
      await setItem('reviews', JSON.stringify(reviews.value))
    }
  }

  const deleteReview = async (id: string) => {
    reviews.value = reviews.value.filter(r => r.id !== id)
    await setItem('reviews', JSON.stringify(reviews.value))
  }

  return {
    reviews,
    loadReviews,
    addReview,
    getReview,
    updateReview,
    deleteReview
  }
}
```

## Step 7: Create the Agent Configuration

### Agent Config (agent/config.md)

```markdown
---
model: claude-3-5-sonnet-20241022
temperature: 0.7
maxIterations: 15
provider: anthropic
canSpawn: false

tools:
  - id: read
    enabled: true
  - id: write
    enabled: true
---

# Book Review Assistant

You are an expert book reviewer and literary critic. Your role is to help users write compelling, thoughtful book reviews.

Your expertise includes:
- Analyzing books for themes, structure, and impact
- Identifying strengths and weaknesses in writing
- Suggesting improvements for clarity and persuasiveness
- Providing constructive feedback

When helping with reviews:
1. Ask clarifying questions about the book and reader's perspective
2. Identify key themes and elements worth discussing
3. Suggest structure and flow improvements
4. Help refine language for impact and clarity
5. Ensure the review is balanced and well-reasoned

## Available Tools

- **read:** Read book notes or draft reviews
- **write:** Create or refine review text

## Important Guidelines

- Be encouraging and constructive
- Focus on clarity and impact
- Respect the reviewer's opinion
- Never rewrite without approval
```

### Custom Tool: improveContent (agent/tools/improveContent.md)

```markdown
# improveContent

Improve writing clarity, style, and impact.

## Parameters

- **content** (string, required): The text to improve
- **focusArea** (string, optional): Focus on (clarity, style, tone, grammar)
- **audience** (string, optional): Target audience (general, academic, casual)

## Description

This tool analyzes writing and suggests improvements for readability and impact.

## Example

```
improveContent(content="This book was good.", focusArea="clarity", audience="general")
```

## Returns

Improved version of the text with explanations of changes.
```

## Step 8: Create Styles

### Theme Overrides (styles/theme.css)

```css
:root {
  --color-space-primary: #F59E0B;
  --color-space-secondary: #DBEAFE;
}

/* Space-specific button styling */
.btn-primary {
  background-color: #F59E0B;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background-color: #D97706;
}

.btn-secondary {
  background-color: #E5E7EB;
  color: #1F2937;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.btn-secondary:hover {
  background-color: #D1D5DB;
}
```

## Step 9: Create the Icon

Create a simple SVG icon for the sidebar (assets/icon.svg):

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 3H20C21.1046 3 22 3.89543 22 5V19C22 20.1046 21.1046 21 20 21H4C2.89543 21 2 20.1046 2 19V5C2 3.89543 2.89543 3 4 3Z" fill="currentColor" opacity="0.1"/>
  <path d="M7 7H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M7 12H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <path d="M7 17H13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>
```

## Step 10: Register the Space

Add your space to the frontend space loader. In `frontend/src/lib/spaceHost.ts`, add:

```typescript
import bookReviewSpace from '../spaces/book-review/space.json'

export const BUILTIN_SPACES = [
  // ... existing spaces
  bookReviewSpace
]
```

## Step 11: Test Your Space

1. Stop Construct if running: `Ctrl+C`
2. Restart with `bun run dev`
3. Look for the "Book Review" icon in the sidebar
4. Click it to open your new space
5. Test creating and viewing reviews

## Step 12: Publish (Optional)

### For Marketplace Distribution

1. Create a `README.md` with usage instructions:

```markdown
# Book Review Space

Write and manage book reviews with AI assistance.

## Features

- Create and store book reviews
- Rate books with 5-star system
- Get AI suggestions for improvement
- View review history

## Installation

Install from the Construct marketplace.

## Usage

1. Click the Book Review icon in the sidebar
2. Click "+ New Review" to create a review
3. Fill in book details and your thoughts
4. Click "Improve with AI" for suggestions
```

2. Add screenshots showing the space in action
3. Update `space.json` with `"publishable": true`
4. Submit to the marketplace (process TBD)

### For Private Installation

Share the space directory for manual installation:

```bash
# User copies the space to:
~/Library/Application Support/Construct/spaces/book-review/

# Then restarts Construct
```

## Common Patterns

### Using the Host API

```typescript
import { useHost } from '@construct-space/sdk'

const { sendMessage, onMessage } = useHost()

// Send notification to shell
sendMessage({
  type: 'notification',
  message: 'Review saved successfully!',
  level: 'success'
})
```

### Broadcasting Between Spaces

```typescript
import { useBroadcast } from '@construct-space/sdk'

const { broadcast, onBroadcast } = useBroadcast()

// Broadcast when review is saved
broadcast({
  type: 'review:created',
  id: review.id,
  title: review.title
})

// Listen for broadcasts from other spaces
onBroadcast((message) => {
  if (message.type === 'project:changed') {
    loadReviews() // Reload reviews for new project
  }
})
```

### Using Project Context

```typescript
import { useSpaceContext } from '@construct-space/sdk'

const { projectId, projectPath, scope } = useSpaceContext()

// Data is project-scoped
const dataKey = `reviews:${projectId}`
```

## Troubleshooting

### Space doesn't appear in sidebar

1. Check that `space.json` has correct `id` and `name`
2. Verify space directory is in `frontend/src/spaces/`
3. Check console for JSON parsing errors
4. Restart Construct

### Agent tools not working

1. Verify tool paths in `agent/config.md` are correct
2. Check that tool markdown files exist
3. Restart Construct to reload agent config

### Pages don't load

1. Check route paths in `space.json` match `pages/` directory
2. Verify Vue component imports are correct
3. Check browser console for errors

## Next Steps

- Explore other built-in spaces for patterns and ideas
- Read [Spaces](/guide/spaces) for deep dive on space architecture
- Check [@construct-space/sdk](/api/sdk) for all available APIs
- Share your space with the community!
