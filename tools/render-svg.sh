#!/usr/bin/env bash
# Usage: render-svg.sh <source.svg> [save-as-slug]
# Renders SVG to PNG (rsvg-convert, fallback ImageMagick). Without a slug: preview PNG path is printed.
set -u
src="${1:?usage: render-svg.sh <source.svg> [slug]}"
slug="${2:-}"
here="$(cd "$(dirname "$0")" && pwd)"
. "$here/_publish.sh"

work="$(mktemp -d)"
out="$work/render.png"
if command -v rsvg-convert >/dev/null 2>&1; then
  rsvg-convert -z 2 -b white -o "$out" "$src" 2>"$work/log"
elif command -v magick >/dev/null 2>&1; then
  magick -density 192 -background white "$src" "$out" 2>"$work/log"
elif command -v convert >/dev/null 2>&1; then
  convert -density 192 -background white "$src" "$out" 2>"$work/log"
else
  echo "SVG render FAILED — install rsvg-convert (librsvg) or ImageMagick."; exit 1
fi

if [ ! -f "$out" ]; then
  echo "SVG render FAILED — no image produced. Fix the source and re-run."
  tail -30 "$work/log"
  exit 1
fi

if [ -n "$slug" ]; then publish "$out" "$slug"; else echo "preview: $out"; fi
