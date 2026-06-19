#!/bin/bash

###############################################################################
# QR Inventory System - Production Deployment Script
# Automated deployment to production servers
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_ENV="${DEPLOY_ENV:-production}"
BACKUP_DIR="/var/backups/qr-inventory"
LOG_FILE="/var/log/qr-inventory-deploy.log"

# Print functions
print_banner() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║         QR INVENTORY SYSTEM - DEPLOYMENT SCRIPT                  ║"
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

# Check if running as appropriate user
check_user() {
    if [ "$EUID" -eq 0 ]; then
        print_error "Do not run this script as root!"
        print_info "Use: sudo -u <deploy_user> $0"
        exit 1
    fi
}

# Confirm deployment
confirm_deployment() {
    print_step "Deployment Confirmation"

    echo -e "${YELLOW}You are about to deploy to: ${RED}$DEPLOY_ENV${NC}"
    echo -e "${YELLOW}Current branch: ${NC}$(git branch --show-current)"
    echo -e "${YELLOW}Current commit: ${NC}$(git rev-parse --short HEAD)"
    echo

    read -p "Are you sure you want to proceed? (yes/NO): " -r
    if [ "$REPLY" != "yes" ]; then
        print_info "Deployment cancelled"
        exit 0
    fi
}

# Pre-deployment checks
pre_deployment_checks() {
    print_step "Running Pre-Deployment Checks"

    # Check Git status
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "Working directory is not clean"
        git status --short
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # Check if on correct branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$DEPLOY_ENV" = "production" ] && [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
        print_warning "Not on main/master branch: $CURRENT_BRANCH"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    # Check required commands
    local required_commands=("docker" "docker-compose" "git")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            print_error "$cmd is required but not installed"
            exit 1
        fi
    done

    print_success "Pre-deployment checks passed"
}

# Backup current deployment
backup_deployment() {
    print_step "Creating Backup"

    BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/backup_$BACKUP_TIMESTAMP"

    print_info "Backing up to: $BACKUP_PATH"

    # Create backup directory
    sudo mkdir -p "$BACKUP_PATH"

    # Backup database
    print_info "Backing up database..."
    if docker-compose ps | grep -q postgres; then
        docker-compose exec -T postgres pg_dump -U qr_user qr_inventory | gzip > "$BACKUP_PATH/database.sql.gz"
        print_success "Database backed up"
    else
        print_warning "Database container not running, skipping backup"
    fi

    # Backup environment files
    print_info "Backing up configuration..."
    [ -f "backend/.env" ] && sudo cp backend/.env "$BACKUP_PATH/backend.env"
    [ -f "frontend/.env" ] && sudo cp frontend/.env "$BACKUP_PATH/frontend.env"
    [ -f "docker-compose.yml" ] && sudo cp docker-compose.yml "$BACKUP_PATH/"

    # Backup uploaded files
    if [ -d "backend/uploads" ]; then
        print_info "Backing up uploaded files..."
        sudo tar -czf "$BACKUP_PATH/uploads.tar.gz" backend/uploads/
        print_success "Uploads backed up"
    fi

    # Store git commit hash
    git rev-parse HEAD > "$BACKUP_PATH/commit.txt"

    sudo chown -R $(whoami):$(whoami) "$BACKUP_PATH"

    print_success "Backup created: $BACKUP_PATH"

    # Clean old backups (keep last 10)
    print_info "Cleaning old backups..."
    cd "$BACKUP_DIR"
    ls -t | tail -n +11 | xargs -I {} sudo rm -rf {}
    print_success "Old backups cleaned"
}

# Pull latest code
pull_code() {
    print_step "Pulling Latest Code"

    cd "$PROJECT_ROOT"

    # Fetch latest changes
    print_info "Fetching latest changes..."
    git fetch origin

    # Pull code
    CURRENT_BRANCH=$(git branch --show-current)
    print_info "Pulling $CURRENT_BRANCH..."
    git pull origin "$CURRENT_BRANCH"

    # Show changes
    print_info "Latest commits:"
    git log --oneline -5

    print_success "Code updated to $(git rev-parse --short HEAD)"
}

# Build Docker images
build_images() {
    print_step "Building Docker Images"

    cd "$PROJECT_ROOT"

    print_info "Building images..."
    docker-compose build --no-cache

    print_success "Images built successfully"
}

# Database migrations
run_migrations() {
    print_step "Running Database Migrations"

    cd "$PROJECT_ROOT"

    print_info "Running migrations..."
    docker-compose run --rm backend alembic upgrade head

    print_success "Migrations completed"
}

# Stop services
stop_services() {
    print_step "Stopping Services"

    cd "$PROJECT_ROOT"

    print_info "Stopping containers..."
    docker-compose down

    print_success "Services stopped"
}

# Start services
start_services() {
    print_step "Starting Services"

    cd "$PROJECT_ROOT"

    print_info "Starting containers..."
    docker-compose up -d

    print_info "Waiting for services to be ready..."
    sleep 10

    # Check service health
    if docker-compose ps | grep -q "Up"; then
        print_success "Services started successfully"
    else
        print_error "Some services failed to start"
        docker-compose ps
        exit 1
    fi
}

# Health check
health_check() {
    print_step "Running Health Checks"

    local max_retries=30
    local retry_count=0

    print_info "Checking backend health..."

    while [ $retry_count -lt $max_retries ]; do
        if curl -f http://localhost:8000/api/health &> /dev/null; then
            print_success "Backend is healthy"
            break
        fi

        retry_count=$((retry_count + 1))
        print_info "Waiting for backend... ($retry_count/$max_retries)"
        sleep 2
    done

    if [ $retry_count -eq $max_retries ]; then
        print_error "Backend health check failed"
        docker-compose logs backend
        exit 1
    fi

    print_info "Checking frontend..."
    if curl -f http://localhost &> /dev/null; then
        print_success "Frontend is healthy"
    else
        print_warning "Frontend may not be ready yet"
    fi

    print_success "Health checks passed"
}

# Cleanup old images
cleanup() {
    print_step "Cleaning Up"

    print_info "Removing old Docker images..."
    docker image prune -f

    print_info "Removing unused volumes..."
    docker volume prune -f

    print_success "Cleanup completed"
}

# Send notification
send_notification() {
    local status=$1
    local message=$2

    # Send email notification (if configured)
    if command -v mail &> /dev/null && [ -n "$NOTIFY_EMAIL" ]; then
        echo "$message" | mail -s "QR Inventory Deployment: $status" "$NOTIFY_EMAIL"
    fi

    # Send Slack notification (if configured)
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"$message\"}" &> /dev/null
    fi
}

# Rollback deployment
rollback() {
    print_step "Rolling Back Deployment"

    print_error "Deployment failed. Initiating rollback..."

    # Find latest backup
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" | head -n 1)

    if [ -z "$LATEST_BACKUP" ]; then
        print_error "No backup found for rollback"
        exit 1
    fi

    print_info "Rolling back to: $LATEST_BACKUP"

    cd "$PROJECT_ROOT"

    # Restore environment files
    sudo cp "$BACKUP_DIR/$LATEST_BACKUP/backend.env" backend/.env
    sudo cp "$BACKUP_DIR/$LATEST_BACKUP/frontend.env" frontend/.env

    # Restore database
    if [ -f "$BACKUP_DIR/$LATEST_BACKUP/database.sql.gz" ]; then
        print_info "Restoring database..."
        gunzip < "$BACKUP_DIR/$LATEST_BACKUP/database.sql.gz" | \
            docker-compose exec -T postgres psql -U qr_user qr_inventory
    fi

    # Checkout previous commit
    if [ -f "$BACKUP_DIR/$LATEST_BACKUP/commit.txt" ]; then
        PREVIOUS_COMMIT=$(cat "$BACKUP_DIR/$LATEST_BACKUP/commit.txt")
        git checkout "$PREVIOUS_COMMIT"
    fi

    # Restart services
    docker-compose down
    docker-compose up -d

    print_success "Rollback completed"
}

# Deployment summary
deployment_summary() {
    print_step "Deployment Summary"

    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              DEPLOYMENT SUCCESSFUL!                              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo

    echo -e "${BLUE}Environment:${NC} $DEPLOY_ENV"
    echo -e "${BLUE}Commit:${NC} $(git rev-parse --short HEAD)"
    echo -e "${BLUE}Branch:${NC} $(git branch --show-current)"
    echo -e "${BLUE}Deployed at:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${BLUE}Backup:${NC} $BACKUP_PATH"
    echo

    echo -e "${BLUE}Services:${NC}"
    docker-compose ps
    echo

    echo -e "${BLUE}URLs:${NC}"
    echo "  Frontend: http://localhost"
    echo "  Backend API: http://localhost:8000"
    echo "  API Docs: http://localhost:8000/docs"
    echo

    echo -e "${BLUE}Logs:${NC}"
    echo "  View logs: docker-compose logs -f"
    echo "  Deploy log: $LOG_FILE"
    echo
}

# Main deployment function
deploy() {
    local start_time=$(date +%s)

    # Setup trap for errors
    trap 'print_error "Deployment failed!"; rollback; exit 1' ERR

    print_banner
    check_user
    confirm_deployment
    pre_deployment_checks
    backup_deployment
    pull_code

    # Stop services before building
    stop_services

    build_images
    run_migrations
    start_services
    health_check
    cleanup

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    deployment_summary

    print_success "Deployment completed in ${duration}s"

    # Send success notification
    send_notification "SUCCESS" "Deployment to $DEPLOY_ENV completed successfully in ${duration}s"
}

# Quick rollback function
quick_rollback() {
    print_banner
    print_warning "Quick rollback initiated"
    rollback
}

# Parse arguments
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    rollback)
        quick_rollback
        ;;
    *)
        echo "Usage: $0 {deploy|rollback}"
        exit 1
        ;;
esac

exit 0