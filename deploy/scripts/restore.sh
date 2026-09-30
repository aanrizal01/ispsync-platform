#!/usr/bin/env bash
# ==============================================================================
# ISP Billing Platform — Database Restore Script
# Usage: ./deploy/scripts/restore.sh <path_to_backup.sql.gz>
# ==============================================================================

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Usage: $0 <path_to_backup.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-isp-prod-postgres}"
POSTGRES_USER="${POSTGRES_USER:-isp_admin}"
POSTGRES_DB="${POSTGRES_DB:-isp_billing}"

if [ ! -f "${BACKUP_FILE}" ]; then
    echo "Error: Backup file '${BACKUP_FILE}' does not exist."
    exit 1
fi

read -p "WARNING: This will overwrite database '${POSTGRES_DB}'. Are you sure? (y/N): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Restoring database from ${BACKUP_FILE}..."
gunzip -c "${BACKUP_FILE}" | docker exec -i "${POSTGRES_CONTAINER}" psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Database restore completed successfully!"
