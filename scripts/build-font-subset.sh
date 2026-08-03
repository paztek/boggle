#!/usr/bin/env bash
#
# Régénère la police des tuiles : InterDisplay Bold sous-catégorisée aux seuls
# caractères affichés sur une grille (A–Z, plus le « u » de « Qu »).
#
# Pourquoi ne pas prendre @fontsource/inter : ce paquet retire les variantes de
# caractères OpenType. Or la grille en a besoin — `cv08` donne au « I » ses
# empattements, sans quoi un « I » pivoté à 90° se réduit à un trait horizontal
# illisible. On part donc de la distribution officielle.
#
# Prérequis : python3, et une connexion réseau pour télécharger Inter.
# Usage : ./scripts/build-font-subset.sh

set -euo pipefail

INTER_VERSION="4.1"
# Caractères affichés sur une tuile : les 26 capitales et le « u » de « Qu ».
GLYPHS="ABCDEFGHIJKLMNOPQRSTUVWXYZu"
# cv08 : « I » à empattements. cv10 : « G » à éperon, distinct du « O ».
FEATURES="cv08,cv10"

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
  --layout-features+="$FEATURES" \
  --no-hinting --desubroutinize --name-IDs='' --notdef-outline

cp "$work_dir/inter/LICENSE.txt" "$dest_dir/Inter-LICENSE.txt"

echo "✓ $(du -h "$dest_dir/inter-display-bold-subset.woff2" | cut -f1) — $dest_dir/inter-display-bold-subset.woff2"
