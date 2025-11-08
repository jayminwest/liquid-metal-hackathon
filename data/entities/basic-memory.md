---
title: basic-memory
tags: [mcp, knowledge-graph, markdown, local-first]
source: hackathon-setup
created: 2025-11-08T12:00:00Z
url: https://github.com/basicmachines-co/basic-memory
---

# basic-memory

Local-first, bi-directional knowledge management system that stores knowledge as Markdown files while maintaining a SQLite database for indexing and semantic graph extraction.

## Observations

- [architecture] Stores everything as Markdown files with SQLite indexing
- [feature] Extracts semantic meaning from structured Markdown patterns
- [feature] WikiLink syntax for entity relations: `[[Entity]]`
- [feature] Observation format: `- [category] content #tag`
- [feature] Canvas tool for knowledge graph visualization
- [capability] MCP-native protocol for LLM integration
- [capability] Real-time file sync with `basic-memory sync --watch`
- [benefit] Human-readable storage - can edit in any text editor
- [benefit] Version controllable with git
- [use_case] Perfect for personal knowledge graphs #knowledge-graph
- [integration] Works alongside Raindrop for hybrid local+cloud architecture

## Relations

- integrates_with [[Raindrop MCP]]
- stores [[Knowledge Entities]]
- used_in [[Personalized Knowledge Graph System]]
- alternative_to [[LightRAG]]
