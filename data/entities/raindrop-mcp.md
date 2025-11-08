---
title: Raindrop MCP
tags:
- mcp
- platform
- raindrop
- ai-infrastructure
source: hackathon-setup
created: 2025-11-08 12:00:00+00:00
permalink: entities/raindrop-mcp
---

# Raindrop MCP

Platform-as-a-Service MCP server providing AI-native infrastructure components for building personalized knowledge systems.

## Observations

- [feature] SmartBucket for AI-powered document storage with vector search
- [feature] Working Memory system for session-based AI agent memory
- [feature] SmartSQL for AI-enhanced database operations with PII detection
- [feature] Workflow Orchestration for multi-step AI agent workflows
- [capability] Supports semantic similarity search with built-in embeddings (text-embedding-ada-002)
- [capability] Timeline support for organizing memories by context
- [architecture] Zero infrastructure setup - fully managed cloud service
- [use_case] Perfect for building RAG applications and knowledge graphs #rag #knowledge-graph
- [integration] MCP-native, works seamlessly with basic-memory

## Relations

- provides [[SmartBucket]]
- provides [[SmartSQL]]
- provides [[Working Memory]]
- integrates_with [[basic-memory]]
- used_in [[Personalized Knowledge Graph System]]