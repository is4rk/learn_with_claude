# learn

## Obsidian vault

The Obsidian vault is `/home/is4r/claude/learning` (set as `LEARN_VAULT_DIR` in `settings.json`; change it there if the vault moves).

- `mermaid-maker` returns a ```` ```mermaid ```` block: paste it into the lesson; Obsidian renders it (no browser needed).
- `svg-maker` publishes PNGs to `<vault>/viz/` as `viz-<slug>-<timestamp>.png` via `tools/render-svg.sh`. Embed them in lessons with `![[viz-<slug>-<timestamp>.png|500]]` (filename only, no path) so Obsidian resolves them.
- `/md-log <file>` resolves relative paths against the vault, e.g. `/md-log sessions/tcp.md` writes `<vault>/sessions/tcp.md`.
- Lesson text is rendered by Obsidian: write math as LaTeX (`$x^2$`, `$$ ... $$`) and dependency maps as ```` ```mermaid ```` blocks.

## Launching

Always start `claude` from the vault root (`/home/is4r/claude/learning`), never from inside `.claude/` — otherwise `settings.json` and the md-log hooks don't load.
