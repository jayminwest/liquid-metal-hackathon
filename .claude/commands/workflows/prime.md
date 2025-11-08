# Repository Priming Workflow

You are entering the raindrop-hackathon repository. Build baseline context by executing the following steps:

## 1. Git Status & Branch Context

```bash
git fetch --all --prune && git pull --rebase
git rev-parse --abbrev-ref HEAD  # Record current branch
git status --short                # Check working tree cleanliness
git ls-files | head -50           # Sample file inventory
```

## 2. Review Core Documentation

Read the following files in order:
1. `README.md` - Project overview and setup instructions
2. `PRD.md` - Product requirements and hackathon scope
3. `.claude/commands/docs/conditional_docs.md` - When to load layer-specific docs

## 3. Synthesize Context

Based on the documentation review, provide:
- **Current Branch**: [branch name]
- **Working Tree Status**: [clean/dirty - list modified files if any]
- **Architecture Summary**: High-level structure (api/knowledge, api/tooling, interaction)
- **File Groups**: Key directories and their purposes
- **Required Commands**: Available slash commands in .claude/commands/
- **Pending Issues**: Check `gh issue list --state open --limit 10` if gh CLI is available

## 4. Identify Next Actions

Ask the user:
- What would you like to work on?
- Do you need layer-specific documentation loaded? (app.md or automation.md)
- Are there any blockers or questions about the codebase?

## Output Format

Provide a concise summary:
```
Branch: [name] ([clean/dirty])
Key Directories: [list 3-5 main directories]
Available Commands: [list .claude/commands/ slash commands]
Open Issues: [count and notable issues]

Ready to work on: [suggest based on PRD priorities or ask user]
```
