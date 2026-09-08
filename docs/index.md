---
layout: home
hero:
  name: Construct
  text: Developer Documentation
  tagline: Everything you need to build with Construct — the AI-powered development environment
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Architecture
      link: /architecture/overview

features:
  - icon: 🖥️
    title: Frontend — Vue 3
    details: Modular "Spaces" architecture with Pinia stores, composables, and the @construct-space/ui design system. Built with Vite and Tailwind CSS.

  - icon: 🤖
    title: Operator — Go
    details: AI engine powering 10+ agents with 22+ tools. Supports Anthropic, OpenAI, DeepSeek, and Ollama. Runs as a local TCP sidecar on port 60100.

  - icon: 🪟
    title: Desktop — Tauri 2
    details: Rust-based native shell with 3D sidebar, operator sidecar management, OAuth, PTY terminal, and cross-platform support.

  - icon: 🧩
    title: Spaces
    details: Self-contained modules that plug into the Construct shell. Each space has its own pages, components, AI agent, tools, and theme.
---
