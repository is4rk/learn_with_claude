# learn

[![video](assets/thumbnail.png)](https://www.youtube.com/watch?v=kzcI5F4tGiU)

My AI learning system from this video: [How I Use AI to Learn Things](https://www.youtube.com/watch?v=kzcI5F4tGiU).

This is a personal system I built for myself, shared as-is. Built as a Claude Code configuration: the teaching philosophy encoded in skills, a few hooks and commands, and subagent definitions. (Originally built for [pi](https://github.com/earendil-works/pi); this branch is the Claude Code port.)

## What's in it

- `skills/teach/` — the philosophy and the process
- `skills/quiz/` — graded multiple-choice questions with ✓/✗, the correct answer, and an explanation (built on `AskUserQuestion`; there is an automatic "I don't know" option)
- `skills/visualize/` — adds a correct, minimal diagram to a lesson when an idea is clearer as a picture
- `agents/` — `researcher`, `svg-maker`, `mermaid-maker`: the subagents the system delegates to
- `hooks/md-log.mjs` + `commands/md-log.md`, `commands/md-unlog.md` — `/md-log <file>` mirrors the session (your prompts, lesson prose, questions and answers) into a markdown file, e.g. in an Obsidian vault
- `tools/` — `render-svg.sh`, used by svg-maker (mermaid-maker returns a ```mermaid block that Obsidian renders)
- `settings.json` — registers the md-log hooks

## Install

This repo **is** a `.claude` directory. From your learning project's root:

```bash
git clone https://github.com/amosblomqvist/learn .claude
```

Then run `claude` in that directory. (Or copy the pieces you want into your existing `.claude/`.) `ask_user_question` from the pi version is gone: Claude Code's built-in `AskUserQuestion` takes its place.

## Requirements

- [Claude Code](https://claude.com/claude-code)
- `node` — for the md-log hook
- For SVG visuals: `rsvg-convert` (librsvg) or ImageMagick. Mermaid diagrams need nothing — Obsidian renders them.

## Notes

- Everything is read relative to the project root, so SVG diagrams are published to `<vault>/viz/`; embed them in Obsidian as `![[viz-....png|500]]`.
- Claude Code has no graded-question tool, so `quiz` is a skill: Claude keeps the correct answer to itself, asks with `AskUserQuestion`, then grades from your reply. `AskUserQuestion` caps options at 4, so quizzes use up to 3 real options plus "I don't know".
- md-log writes questions before you answer and never includes the correct answer; it's revealed in the reply after grading. It starts mirroring from the next event after `/md-log`, backfilling the session so far. Prose written right before a question in the same turn doesn't reliably reach the transcript, so the `quiz`/`teach` skills send it with `md-log.mjs note`; the hook skips transcript text a note already logged.
- The teaching skill is written for one learner (me). Edit it to fit how you learn best.
