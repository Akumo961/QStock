#!/bin/bash

###############################################################################
# QR Inventory System - Backup Script
# Automated backup of database, files, and configuration
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_ROOT="/var/backups/qr-inventory"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/backup_$TIMESTAMP"
LOG_FILE="$BACKUP_ROOT/backup.log"
RETENTION_DAYS=30

# Backup settings
BACKUP_DATABASE=true
BACKUP_FILES=true
BACKUP_CONFIG=true
BACKUP_LOGS=false

# S3 settings (optional)
S3_ENABLED=false
S3_BUCKET="${S3_BUCKET:-qr-inventory-backups}"
S3_REGION="${S3_REGION:-us-east-1}"

# Print functions
print_banner() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║         QR INVENTORY SYSTEM - BACKUP SCRIPT                      ║"
    echo "║                                                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1" | tee -a "$LOG_FILE"
}

print_step() {
    echo -e "\n${BLUE}═══ $1 ═══${NC}\n" | tee -a "$LOG_FILE"
}

# Initialize backup
init_backup() {
    print_step "Initializing Backup"

    # Create backup directories
    sudo mkdir -p "$BACKUP_ROOT"
    sudo mkdir -p "$BACKUP_DIR"
    sudo chown -R $(whoami):$(whoami) "$BACKUP_ROOT"

    print_info "Backup directory: $BACKUP_DIR"
    print_info "Starting backup at: $(date '+%Y-%m-%d %H:%M:%S')"
}

# Backup PostgreSQL database
backup_database() {
    if [ "$BACKUP_DATABASE" != "true" ]; then
        print_info "Database backup disabled"
        return
    fi

    print_step "Backing Up Database"

    # Check if Docker is being used
    if command -v docker-compose &> /dev/null && docker-compose ps | grep -q postgres; then
        print_info "Backing up PostgreSQL (Docker)..."

        # Get database credentials from environment
        DB_NAME="${POSTGRES_DB:-qr_inventory}"
        DB_USER="${POSTGRES_USER:-qr_user}"

        # Dump database
        docker-compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/database.sql.gz"

        # Also create a plain SQL backup
        docker-compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/database.sql"

        # Dump globals (users, roles, etc.)
        docker-compose exec -T postgres pg_dumpall -U "$DB_USER" --globals-only | gzip > "$BACKUP_DIR/globals.sql.gz"

    elif command -v pg_dump &> /dev/null; then
        print_info "Backing up PostgreSQL (local)..."

        # Load database URL from environment
        source "$PROJECT_ROOT/backend/.env" 2>/dev/null || true

        if [ -z "$DATABASE_URL" ]; then
            print_error "DATABASE_URL not found in .env"
            return 1
        fi

        # Parse DATABASE_URL
        DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
        DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

        # Dump database
        PGPASSWORD="$DB_PASS" pg_dump -h "$DB_HOST" -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/database.sql.gz"

    else
        print_warning "PostgreSQL not found, skipping database backup"
        return
    fi

    # Get backup size
    DB_SIZE=$(du -sh "$BACKUP_DIR/database.sql.gz" | cut -f1)
    print_success "Database backed up: $DB_SIZE"
}

# Backup uploaded files
backup_files() {
    if [ "$BACKUP_FILES" != "true" ]; then
        print_info "File backup disabled"
        return
    fi

    print_step "Backing Up Files"

    local files_backed_up=0

    # Backup uploaded files
    if [ -d "$PROJECT_ROOT/backend/uploads" ]; then
        print_info "Backing up uploads..."
        tar -czf "$BACKUP_DIR/uploads.tar.gz" -C "$PROJECT_ROOT/backend" uploads/
        FILES_SIZE=$(du -sh "$BACKUP_DIR/uploads.tar.gz" | cut -f1)
        print_success "Uploads backed up: $FILES_SIZE"
        files_backed_up=1
    fi

    # Backup media files
    if [ -d "$PROJECT_ROOT/backend/media" ]; then
        print_info "Backing up media..."
        tar -czf "$BACKUP_DIR/media.tar.gz" -C "$PROJECT_ROOT/backend" media/
        MEDIA_SIZE=$(du -sh "$BACKUP_DIR/media.tar.gz" | cut -f1)
        print_success "Media backed up: $MEDIA_SIZE"
        files_backed_up=1
    fi

    # Backup static files
    if [ -d "$PROJECT_ROOT/frontend/dist" ]; then
        print_info "Backing up frontend build..."
        tar -czf "$BACKUP_DIR/frontend-dist.tar.gz" -C "$PROJECT_ROOT/frontend" dist/
        files_backed_up=1
    fi

    if [ $files_backed_up -eq 0 ]; then
        print_warning "No files found to backup"
    fi
}

# Backup configuration
backup_config() {
    if [ "$BACKUP_CONFIG" != "true" ]; then
        print_info "Config backup disabled"
        return
    fi

    print_step "Backing Up Configuration"

    mkdir -p "$BACKUP_DIR/config"

    # Backend configuration
    if [ -f "$PROJECT_ROOT/backend/.env" ]; then
        cp "$PROJECT_ROOT/backend/.env" "$BACKUP_DIR/config/backend.env"
        print_success "Backend config backed up"
    fi

    # Frontend configuration
    if [ -f "$PROJECT_ROOT/frontend/.env" ]; then
        cp "$PROJECT_ROOT/frontend/.env" "$BACKUP_DIR/config/frontend.env"
        print_success "Frontend config backed up"
    fi

    # Docker configuration
    if [ -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        cp "$PROJECT_ROOT/docker-compose.yml" "$BACKUP_DIR/config/"
        print_success "Docker config backed up"
    fi

    # Nginx configuration
    if [ -f "$PROJECT_ROOT/frontend/nginx.conf" ]; then
        cp "$PROJECT_ROOT/frontend/nginx.conf" "$BACKUP_DIR/config/"
        print_success "Nginx config backed up"
    fi

    # Alembic configuration
    if [ -f "$PROJECT_ROOT/backend/alembic.ini" ]; then
        cp "$PROJECT_ROOT/backend/alembic.ini" "$BACKUP_DIR/config/"
        print_success "Alembic config backed up"
    fi
}

# Backup logs
backup_logs() {
    if [ "$BACKUP_LOGS" != "true" ]; then
        return
    fi

    print_step "Backing Up Logs"

    mkdir -p "$BACKUP_DIR/logs"

    # Application logs
    if [ -d "/var/log/qr-inventory" ]; then
        cp -r /var/log/qr-inventory/* "$BACKUP_DIR/logs/" 2>/dev/null || true
        print_success "Application logs backed up"
    fi

    # Docker logs
    if command -v docker-compose &> /dev/null; then
        docker-compose logs > "$BACKUP_DIR/logs/docker-compose.log" 2>&1 || true
        print_success "Docker logs backed up"
    fi
}

# Create metadata file
create_metadata() {
    print_step "Creating Metadata"

    cat > "$BACKUP_DIR/metadata.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "date": "$(date -Iseconds)",
  "hostname": "$(hostname)",
  "user": "$(whoami)",
  "git_commit": "$(cd "$PROJECT_ROOT" && git rev-parse HEAD 2>/dev/null || echo 'N/A')",
  "git_branch": "$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo 'N/A')",
  "backup_size": "$(du -sh "$BACKUP_DIR" | cut -f1)",
  "database_backed_up": $BACKUP_DATABASE,
  "files_backed_up": $BACKUP_FILES,
  "config_backed_up": $BACKUP_CONFIG
}
EOF

    # Also create a simple text file
    cat > "$BACKUP_DIR/README.txt" << EOF
QR Inventory System Backup
===========================

Backup Date: $(date '+%Y-%m-%d %H:%M:%S')
Hostname: $(hostname)
User: $(whoami)
Git Commit: $(cd "$PROJECT_ROOT" && git rev-parse --short HEAD 2>/dev/null || echo 'N/A')

Contents:
  - database.sql.gz: PostgreSQL database dump
  - uploads.tar.gz: User uploaded files
  - config/: Configuration files
  - metadata.json: Backup metadata

Restore Instructions:
  1. Extract configuration: tar -xzf config/*.env
  2. Restore database: gunzip < database.sql.gz | psql -U qr_user qr_inventory
  3. Extract uploads: tar -xzf uploads.tar.gz -C backend/
  4. Restart services: docker-compose restart

For detailed instructions, see docs/setup.md
EOF

    print_success "Metadata created"
}

# Compress backup
compress_backup() {
    print_step "Compressing Backup"

    cd "$BACKUP_ROOT"

    print_info "Creating compressed archive..."
    tar -czf "backup_$TIMESTAMP.tar.gz" "backup_$TIMESTAMP/"

    COMPRESSED_SIZE=$(du -sh "backup_$TIMESTAMP.tar.gz" | cut -f1)
    print_success "Backup compressed: $COMPRESSED_SIZE"

    # Remove uncompressed directory
    rm -rf "backup_$TIMESTAMP"

    print_success "Uncompressed backup removed"
}

# Upload to S3
upload_to_s3() {
    if [ "$S3_ENABLED" != "true" ]; then
        return
    fi

    print_step "Uploading to S3"

    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI not installed, skipping S3 upload"
        return
    fi

    print_info "Uploading to s3://$S3_BUCKET..."

    aws s3 cp "$BACKUP_ROOT/backup_$TIMESTAMP.tar.gz" \
        "s3://$S3_BUCKET/backups/backup_$TIMESTAMP.tar.gz" \
        --region "$S3_REGION"

    print_success "Backup uploaded to S3"
}

# Clean old backups
cleanup_old_backups() {
    print_step "Cleaning Old Backups"

    print_info "Removing backups older than $RETENTION_DAYS days..."

    # Local cleanup
    find "$BACKUP_ROOT" -name "backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete

    local removed=$(find "$BACKUP_ROOT" -name "backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS 2>/dev/null | wc -l)
    print_success "Removed $removed old local backups"

    # S3 cleanup (if enabled)
    if [ "$S3_ENABLED" = "true" ] && command -v aws &> /dev/null; then
        print_info "Cleaning old S3 backups..."

        # This would require listing and filtering by date
        # For now, we'll use lifecycle policies in S3 instead
        print_info "Use S3 lifecycle policies for automatic S3 cleanup"
    fi
}

# Verify backup
verify_backup() {
    print_step "Verifying Backup"

    local backup_file="$BACKUP_ROOT/backup_$TIMESTAMP.tar.gz"

    # Check if file exists
    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        return 1
    fi

    # Check file size
    local size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
    if [ "$size" -lt 1000 ]; then
        print_error "Backup file too small: $size bytes"
        return 1
    fi

    # Test archive integrity
    if tar -tzf "$backup_file" > /dev/null 2>&1; then
        print_success "Backup archive is valid"
    else
        print_error "Backup archive is corrupted"
        return 1
    fi

    # List contents
    print_info "Backup contents:"
    tar -tzf "$backup_file" | head -n 10

    print_success "Backup verification passed"
}

# Send notification
send_notification() {
    local status=$1
    local message=$2

    # Email notification
    if command -v mail &> /dev/null && [ -n "$NOTIFY_EMAIL" ]; then
        echo "$message" | mail -s "QR Inventory Backup: $status" "$NOTIFY_EMAIL"
    fi

    # Slack notification
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"$message\"}" &> /dev/null
    fi
}

# Backup summary
backup_summary() {
    print_step "Backup Summary"

    local backup_file="$BACKUP_ROOT/backup_$TIMESTAMP.tar.gz"
    local size=$(du -sh "$backup_file" | cut -f1)
    local count=$(ls -1 "$BACKUP_ROOT"/backup_*.tar.gz 2>/dev/null | wc -l)

    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              BACKUP SUCCESSFUL!                                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo

    echo -e "${BLUE}Backup Details:${NC}"
    echo "  Timestamp: $TIMESTAMP"
    echo "  File: backup_$TIMESTAMP.tar.gz"
    echo "  Size: $size"
    echo "  Location: $BACKUP_ROOT"
    echo

    echo -e "${BLUE}Backup Contents:${NC}"
    [ "$BACKUP_DATABASE" = "true" ] && echo "  ✓ Database"
    [ "$BACKUP_FILES" = "true" ] && echo "  ✓ Files"
    [ "$BACKUP_CONFIG" = "true" ] && echo "  ✓ Configuration"
    [ "$BACKUP_LOGS" = "true" ] && echo "  ✓ Logs"
    echo

    echo -e "${BLUE}Statistics:${NC}"
    echo "  Total backups: $count"
    echo "  Retention period: $RETENTION_DAYS days"
    echo

    echo -e "${BLUE}Restore Command:${NC}"
    echo "  ./scripts/restore.sh $TIMESTAMP"
    echo
}

# Main backup function
main() {
    local start_time=$(date +%s)

    print_banner

    init_backup
    backup_database
    backup_files
    backup_config
    backup_logs
    create_metadata
    compress_backup
    verify_backup
    upload_to_s3
    cleanup_old_backups

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    backup_summary

    print_success "Backup completed in ${duration}s"

    send_notification "SUCCESS" "Backup completed successfully in ${duration}s"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-database)
            BACKUP_DATABASE=false
            shift
            ;;
        --no-files)
            BACKUP_FILES=false
            shift
            ;;
        --no-config)
            BACKUP_CONFIG=false
            shift
            ;;
        --with-logs)
            BACKUP_LOGS=true
            shift
            ;;
        --s3)
            S3_ENABLED=true
            shift
            ;;
        --retention)
            RETENTION_DAYS=$2
            shift 2
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo
            echo "Options:"
            echo "  --no-database     Skip database backup"
            echo "  --no-files        Skip files backup"
            echo "  --no-config       Skip config backup"
            echo "  --with-logs       Include logs in backup"
            echo "  --s3              Upload to S3"
            echo "  --retention N     Keep backups for N days (default: 30)"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main

exit 0