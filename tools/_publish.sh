# Sourced by render-*.sh. publish <png> <slug> -> copies into <vault>/viz with a unique name.
# Vault = $LEARN_VAULT_DIR (the Obsidian vault), falling back to the project root.
publish() {
  local png="$1" slug clean dest
  slug="$2"
  clean=$(printf '%s' "$slug" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]\{1,\}/-/g; s/^-//; s/-$//')
  [ -n "$clean" ] || clean=viz
  mkdir -p "${LEARN_VAULT_DIR:-${CLAUDE_PROJECT_DIR:-$PWD}}/viz"
  dest="${LEARN_VAULT_DIR:-${CLAUDE_PROJECT_DIR:-$PWD}}/viz/viz-${clean}-$(date +%s).png"
  cp "$png" "$dest"
  echo "filename: $(basename "$dest")"
  echo "path: $dest"
}
