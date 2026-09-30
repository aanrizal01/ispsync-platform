#!/usr/bin/env bash
# ==============================================================================
# ISP Billing Platform — Database & Configuration Backup Script
# Usage: ./deploy/scripts/backup.sh
# Cron example (Daily at 02:00 AM):
# 0 2 * * * /path/to/GOGIGABILL/deploy/scripts/backup.sh >> /var/log/isp-backup.log 2>&1
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-isp-prod-postgres}"
POSTGRES_USER="${POSTGRES_USER:-isp_admin}"
POSTGRES_DB="${POSTGRES_DB:-isp_billing}"
RETENTION_DAYS=14

mkdir -p "${BACKUP_DIR}"

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Starting backup process..."

# 1. Dump PostgreSQL Database (compressed gzip)
DB_BACKUP_FILE="${BACKUP_DIR}/db_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Dumping PostgreSQL database to ${DB_BACKUP_FILE}..."
docker exec -t "${POSTGRES_CONTAINER}" pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" --clean --if-exists | gzip > "${DB_BACKUP_FILE}"

# 2. Archive FreeRADIUS configs & Keys
CONFIG_BACKUP_FILE="${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz"
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Archiving keys and radius configs to ${CONFIG_BACKUP_FILE}..."
tar -czf "${CONFIG_BACKUP_FILE}" keys/ docker/freeradius/ 2>/dev/null || true

# 3. Clean up backups older than RETENTION_DAYS
echo "[$(date +'%Y-%m-%d %H:%M:%S')] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "*.gz" -mtime +${RETENTION_DAYS} -exec rm -f {} \;

echo "[$(date +'%Y-%m-%d %H:%M:%S')] Backup completed successfully!"
ls -lh "${DB_BACKUP_FILE}" "${CONFIG_BACKUP_FILE}"
