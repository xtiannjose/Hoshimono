#!/usr/bin/env bash
# Backup and restore drill (docs/backup-restore.md): dump a database with
# pg_dump, restore the dump into a scratch database, and compare every
# table's row count. Needs only Docker: the client tools come from the
# postgres:17 image.
#
#   SOURCE_URL  database to back up (default: the local dev database)
#   KEEP_DUMP=1 keep the dump in backups/ (default: deleted after the drill)
set -euo pipefail

SOURCE_URL="${SOURCE_URL:-postgresql://postgres:dev@host.docker.internal:5433/hoshimono}"
SCRATCH_URL="postgresql://postgres:dev@host.docker.internal:5433/hoshimono_restore"
mkdir -p backups
# Docker on Windows needs the Windows form of the folder (Git Bash: pwd -W).
DUMP_DIR="$(cd backups && (pwd -W 2>/dev/null || pwd))"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP="hoshimono-$STAMP.dump"

pg() { MSYS_NO_PATHCONV=1 docker run --rm -v "$DUMP_DIR:/backup" postgres:17 "$@"; }

COUNTS="SELECT table_name || ' ' || (xpath('/row/c/text()',
  query_to_xml(format('SELECT count(*) AS c FROM %I', table_name), false, true, '')))[1]::text
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1"

echo "Backing up..."
start=$(date +%s)
pg pg_dump --format=custom --no-owner --no-privileges --file="/backup/$DUMP" "$SOURCE_URL"
echo "  $(du -h "$DUMP_DIR/$DUMP" | cut -f1) in $(( $(date +%s) - start )) s"

echo "Restoring into hoshimono_restore..."
start=$(date +%s)
docker exec hoshimono-db psql -U postgres -qc "DROP DATABASE IF EXISTS hoshimono_restore" \
  -c "CREATE DATABASE hoshimono_restore" >/dev/null
pg pg_restore --no-owner --no-privileges --exit-on-error --dbname="$SCRATCH_URL" "/backup/$DUMP"
echo "  done in $(( $(date +%s) - start )) s"

echo "Comparing row counts..."
pg psql -tAc "$COUNTS" "$SOURCE_URL" > "$DUMP_DIR/source.txt"
pg psql -tAc "$COUNTS" "$SCRATCH_URL" > "$DUMP_DIR/restored.txt"
if diff "$DUMP_DIR/source.txt" "$DUMP_DIR/restored.txt"; then
  echo "  $(wc -l < "$DUMP_DIR/source.txt") tables, every count matches."
else
  echo "  Counts differ (above). The restore is not good." >&2
  exit 1
fi

rm -f "$DUMP_DIR/source.txt" "$DUMP_DIR/restored.txt"
if [ -n "${KEEP_DUMP:-}" ]; then echo "Dump kept: backups/$DUMP"; else rm -f "$DUMP_DIR/$DUMP"; fi
