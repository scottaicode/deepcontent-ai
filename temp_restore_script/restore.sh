#!/bin/bash

# Restore script for backup: 20250323_020610_02_03_backup
# Created: $(date)

echo "Starting restoration of backup: 20250323_020610_02_03_backup"
echo "Creating temporary backup of current src directory"

# Create a backup of the current src directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup_before_restore_${TIMESTAMP}"
mkdir -p $BACKUP_DIR

# Backup current src directory
if [ -d "./src" ]; then
  echo "Backing up current src directory to $BACKUP_DIR/src"
  cp -r ./src $BACKUP_DIR/
  echo "Current src directory backed up successfully"
fi

# Copy .env.local file to backup
if [ -f "./.env.local" ]; then
  echo "Backing up current .env.local to $BACKUP_DIR/.env.local"
  cp ./.env.local $BACKUP_DIR/
fi

# Restore src directory from backup
echo "Restoring src directory from backup"
if [ -d "./saved_backups/20250323_020610_02_03_backup/src" ]; then
  rm -rf ./src
  cp -r ./saved_backups/20250323_020610_02_03_backup/src ./
  echo "src directory restored successfully"
else
  echo "ERROR: Backup src directory not found!"
  exit 1
fi

# Restore .env.local file if it exists in the backup
if [ -f "./saved_backups/20250323_020610_02_03_backup/.env.local" ]; then
  echo "Restoring .env.local file"
  cp ./saved_backups/20250323_020610_02_03_backup/.env.local ./
  echo ".env.local file restored successfully"
fi

# Create restoration summary
echo "Creating restoration summary"
cat > restoration_summary.txt << EOL
Backup Restoration Summary
=========================
Date: $(date)
Backup: 20250323_020610_02_03_backup
Restored directories:
- src
Restored files:
- .env.local (if available in backup)

Previous project state backed up to: $BACKUP_DIR
EOL

echo "Restoration completed successfully"
echo "Summary saved in restoration_summary.txt" 