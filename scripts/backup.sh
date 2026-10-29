#!/usr/bin/env bash
# The whole project as one file for Google Drive (docs/06-SETUP.md section
# 11): every branch and commit, nothing else (no packages, builds or .env
# files). Writes straight into Google Drive for desktop when it is
# installed (G:\My Drive\Coding Projects\Personal\Hoshimono, or DRIVE_DIR),
# else into backups/.
set -euo pipefail

DRIVE="${DRIVE_DIR:-/g/My Drive/Coding Projects/Personal/Hoshimono}"
if [ -d "$DRIVE" ]; then OUT="$DRIVE"; else OUT="backups"; mkdir -p "$OUT"; fi
FILE="$OUT/hoshimono.bundle"

git bundle create "$FILE.tmp" --branches --tags 2>/dev/null
git bundle verify -q "$FILE.tmp" >/dev/null 2>&1
mv -f "$FILE.tmp" "$FILE"
echo "Saved every branch ($(du -h "$FILE" | cut -f1)) to $FILE"
if [ "$OUT" = "backups" ]; then
  echo "Now upload it to Google Drive: drive.google.com, New, File upload."
fi
