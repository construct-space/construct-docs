import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Construct Docs',
  description: 'Developer documentation for Construct — AI-powered development environment',
  outDir: '../dist',
  markdown: {
    languageAlias: {
      svg: 'xml',
    },
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
  ],
  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Construct',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Frontend', link: '/frontend/overview' },
      { text: 'Operator', link: '/operator/overview' },
      { text: 'Architecture', link: '/architecture/overview' },
      { text: 'API Reference', link: '/api/operator-protocol' },
      { text: 'Infrastructure', link: '/infra/overview' },
      { text: 'Contributing', link: '/contributing/workflow' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Welcome', link: '/guide/welcome' },
            { text: 'Prerequisites', link: '/guide/prerequisites' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Project Structure', link: '/guide/project-structure' },
            { text: 'Dev Commands', link: '/guide/dev-commands' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Spaces', link: '/guide/spaces' },
            { text: 'Agents & Tools', link: '/guide/agents-and-tools' },
            { text: 'Building a Space', link: '/guide/building-a-space' },
            { text: 'Data Directory', link: '/guide/data-directory' },
          ],
        },
        {
          text: 'Guides',
          items: [
            { text: 'Graph SDK (Data)', link: '/guide/graph-sdk' },
            { text: 'Structured Output', link: '/guide/structured-output' },
            { text: 'Versioning & Releases', link: '/guide/versioning' },
          ],
        },
      ],
      '/frontend/': [
        {
          text: 'Overview',
          items: [
            { text: 'Frontend Overview', link: '/frontend/overview' },
            { text: 'Bootstrap & Lifecycle', link: '/frontend/bootstrap' },
          ],
        },
        {
          text: 'Core Systems',
          items: [
            { text: 'Operator Communication', link: '/frontend/operator-client' },
            { text: 'Assistant & Blocks', link: '/frontend/assistant-system' },
            { text: 'Pinia Stores', link: '/frontend/stores' },
            { text: 'Composables', link: '/frontend/composables' },
          ],
        },
        {
          text: 'UI & Spaces',
          items: [
            { text: 'Components', link: '/frontend/components' },
            { text: 'UI Library', link: '/frontend/ui-library' },
            { text: 'Built-in Spaces', link: '/frontend/built-in-spaces' },
            { text: 'Context Bus & Bridge', link: '/frontend/context-bus' },
          ],
        },
        {
          text: 'Development',
          items: [
            { text: 'Testing', link: '/frontend/testing' },
          ],
        },
      ],
      '/operator/': [
        {
          text: 'Overview',
          items: [
            { text: 'Operator Overview', link: '/operator/overview' },
            { text: 'Boot & Lifecycle', link: '/operator/boot' },
            { text: 'Module System', link: '/operator/modules' },
          ],
        },
        {
          text: 'Core Engine',
          items: [
            { text: 'Agent System', link: '/operator/agents' },
            { text: 'Runner Loop', link: '/operator/runner' },
            { text: 'Tools', link: '/operator/tools' },
            { text: 'Providers', link: '/operator/providers' },
          ],
        },
        {
          text: 'Extensions',
          items: [
            { text: 'Hooks & Skills', link: '/operator/hooks-skills' },
            { text: 'MCP Integration', link: '/operator/mcp' },
          ],
        },
        {
          text: 'Data & Transport',
          items: [
            { text: 'State & Sessions', link: '/operator/state-sessions' },
            { text: 'Transport Protocol', link: '/operator/transport' },
          ],
        },
        {
          text: 'Development',
          items: [
            { text: 'Testing', link: '/operator/testing' },
          ],
        },
      ],
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture/overview' },
            { text: 'Frontend (Vue 3)', link: '/architecture/frontend' },
            { text: 'Operator (Go)', link: '/architecture/operator' },
            { text: 'Desktop (Tauri 2)', link: '/architecture/desktop' },
            { text: 'IPC Protocol', link: '/architecture/ipc-protocol' },
            { text: 'Architecture Map', link: '/architecture/map' },
            { text: 'Data Flow', link: '/architecture/data-flow' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Operator Protocol', link: '/api/operator-protocol' },
            { text: 'Agent Configuration', link: '/api/agent-config' },
            { text: 'Tool Schema', link: '/api/tool-schema' },
            { text: 'Space Manifest', link: '/api/space-manifest' },
            { text: 'Hooks & Safety', link: '/api/hooks' },
            { text: 'State Store', link: '/api/state-store' },
            { text: 'SDK & UI Library', link: '/api/sdk' },
          ],
        },
      ],
      '/infra/': [
        {
          text: 'Infrastructure',
          items: [
            { text: 'Overview', link: '/infra/overview' },
            { text: 'Services Directory', link: '/infra/services' },
          ],
        },
        {
          text: 'Key Services',
          items: [
            { text: 'Graph (+ PaaS)', link: '/infra/graph' },
            { text: 'Oracle (Admin)', link: '/infra/overview#_7-oracle' },
            { text: 'Source (Construct API)', link: '/infra/overview#_8-source-construct-api' },
            { text: 'Delivery (Transactions)', link: '/infra/overview#_3-delivery-construct-delivery' },
          ],
        },
      ],
      '/contributing/': [
        {
          text: 'Contributing',
          items: [
            { text: 'Workflow', link: '/contributing/workflow' },
            { text: 'Code Standards', link: '/contributing/code-standards' },
            { text: 'Commit Conventions', link: '/contributing/commits' },
            { text: 'Testing', link: '/contributing/testing' },
            { text: 'Repos & Ownership', link: '/contributing/repos' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/construct-space' },
    ],
    search: {
      provider: 'local',
    },
    footer: {
      message: 'Construct Team — Internal Developer Documentation',
      copyright: 'Proprietary',
    },
    outline: {
      level: [2, 3],
    },
  },
})
