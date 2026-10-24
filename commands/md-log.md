---
description: Link a markdown file to this session (mirrors prompts, lesson prose and Q&A into it)
argument-hint: <filepath>
allowed-tools: Bash(node:*)
---

!`node .claude/hooks/md-log.mjs link "$ARGUMENTS"`

Report the line above to the user in one short sentence. Nothing else.
