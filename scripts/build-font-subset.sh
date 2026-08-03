#!/usr/bin/env bash
#
# Régénère la police des tuiles : InterDisplay Bold sous-catégorisée aux seuls
# caractères affichés sur une grille (A–Z, plus le « u » de « Qu »).
#
# Les lettres sont rendues dans leur dessin par défaut : aucune variante de
# caractère OpenType n'est activée.
#
# Prérequis : python3, et une connexion réseau pour télécharger Inter.
# Usage : ./scripts/build-font-subset.sh

set -euo pipefail

INTER_VERSION="4.1"
# Caractères affichés sur une tuile : les 26 capitales et le « u » de « Qu ».
GLYPHS="ABCDEFGHIJKLMNOPQRSTUVWXYZu"

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dest_dir="$repo_root/src/assets/fonts"
work_dir="$(mktemp -d)"
trap 'rm -rf "$work_dir"' EXIT

echo "→ Environnement Python et fonttools"
python3 -m venv "$work_dir/venv"
"$work_dir/venv/bin/pip" install --quiet fonttools brotli

echo "→ Téléchargement d'Inter $INTER_VERSION"
curl -sSL -o "$work_dir/inter.zip" \
  "https://github.com/rsms/inter/releases/download/v${INTER_VERSION}/Inter-${INTER_VERSION}.zip"
unzip -oq "$work_dir/inter.zip" -d "$work_dir/inter"

echo "→ Sous-catégorisation ($GLYPHS)"
mkdir -p "$dest_dir"
"$work_dir/venv/bin/pyftsubset" "$work_dir/inter/web/InterDisplay-Bold.woff2" \
  --output-file="$dest_dir/inter-display-bold-subset.woff2" \
  --flavor=woff2 \
  --text="$GLYPHS" \
  --no-hinting --desubroutinize --name-IDs='' --notdef-outline

cp "$work_dir/inter/LICENSE.txt" "$dest_dir/Inter-LICENSE.txt"

echo "✓ $(du -h "$dest_dir/inter-display-bold-subset.woff2" | cut -f1) — $dest_dir/inter-display-bold-subset.woff2"
