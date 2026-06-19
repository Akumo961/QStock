#!/bin/bash

###############################################################################
# QR Inventory System - Database Initialization Script
# Initialize database, run migrations, and seed initial data
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Print functions
print_banner() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║         QR INVENTORY SYSTEM - DATABASE INITIALIZATION            ║"
    echo "║                                                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_step() {
    echo -e "\n${BLUE}═══ $1 ═══${NC}\n"
}

# Load environment variables
load_env() {
    if [ -f "$BACKEND_DIR/.env" ]; then
        export $(cat "$BACKEND_DIR/.env" | grep -v '^#' | xargs)
        print_success "Environment variables loaded"
    else
        print_error ".env file not found in $BACKEND_DIR"
        exit 1
    fi
}

# Check database connection
check_database_connection() {
    print_step "Checking Database Connection"

    if [[ $DATABASE_URL == postgresql://* ]]; then
        # PostgreSQL
        DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
        DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
        DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:\/]*\).*/\1/p')
        DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

        print_info "Testing PostgreSQL connection..."
        print_info "Host: $DB_HOST"
        print_info "Database: $DB_NAME"
        print_info "User: $DB_USER"

        if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' 2>/dev/null; then
            print_success "Database connection successful"
        else
            print_error "Cannot connect to database"
            print_info "Please check your DATABASE_URL in .env file"
            exit 1
        fi

    elif [[ $DATABASE_URL == sqlite://* ]]; then
        print_info "Using SQLite database"
        print_success "SQLite database configured"

    else
        print_error "Unsupported database URL: $DATABASE_URL"
        exit 1
    fi
}

# Create database (if needed)
create_database() {
    print_step "Creating Database"

    if [[ $DATABASE_URL == postgresql://* ]]; then
        print_info "Checking if database exists..."

        if PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
            print_warning "Database '$DB_NAME' already exists"
        else
            print_info "Creating database '$DB_NAME'..."
            PGPASSWORD="$DB_PASS" createdb -h "$DB_HOST" -U "$DB_USER" "$DB_NAME"
            print_success "Database created"
        fi
    fi
}

# Initialize Alembic
init_alembic() {
    print_step "Initializing Alembic"

    cd "$BACKEND_DIR"

    if [ ! -d "alembic" ]; then
        print_info "Initializing Alembic..."
        source venv/bin/activate 2>/dev/null || true
        alembic init alembic
        print_success "Alembic initialized"

        print_info "Updating alembic.ini..."
        sed -i.bak "s|sqlalchemy.url = .*|sqlalchemy.url = $DATABASE_URL|" alembic.ini
        print_success "alembic.ini configured"
    else
        print_warning "Alembic already initialized"
    fi
}

# Run migrations
run_migrations() {
    print_step "Running Database Migrations"

    cd "$BACKEND_DIR"
    source venv/bin/activate 2>/dev/null || true

    # Check if migrations exist
    if [ -d "alembic/versions" ] && [ "$(ls -A alembic/versions)" ]; then
        print_info "Running migrations..."
        alembic upgrade head
        print_success "Migrations completed"
    else
        print_warning "No migrations found"
        print_info "Creating initial migration..."
        alembic revision --autogenerate -m "Initial migration"
        alembic upgrade head
        print_success "Initial migration created and applied"
    fi
}

# Create tables (alternative to migrations)
create_tables() {
    print_step "Creating Database Tables"

    cd "$BACKEND_DIR"
    source venv/bin/activate 2>/dev/null || true

    if [ -f "create_tables.py" ]; then
        print_info "Running create_tables.py..."
        python create_tables.py
        print_success "Tables created"
    else
        print_info "Using Alembic migrations instead"
    fi
}

# Seed initial data
seed_data() {
    print_step "Seeding Initial Data"

    cd "$BACKEND_DIR"
    source venv/bin/activate 2>/dev/null || true

    # Create categories
    print_info "Creating item categories..."
    python << 'EOF'
from database import SessionLocal
from models import Category
from sqlalchemy.exc import IntegrityError

db = SessionLocal()

categories = [
    "Electronics", "Tools", "Equipment", "Furniture",
    "Supplies", "Books", "Sports", "Other"
]

for cat_name in categories:
    try:
        category = Category(name=cat_name)
        db.add(category)
        db.commit()
        print(f"  ✓ Created category: {cat_name}")
    except IntegrityError:
        db.rollback()
        print(f"  - Category already exists: {cat_name}")

db.close()
EOF

    print_success "Categories seeded"
}

# Create admin user
create_admin_user() {
    print_step "Creating Admin User"

    cd "$BACKEND_DIR"
    source venv/bin/activate 2>/dev/null || true

    # Check if admin exists
    print_info "Checking for existing admin user..."

    python << 'EOF'
import sys
from database import SessionLocal
from models import User

db = SessionLocal()
admin = db.query(User).filter(User.email == "admin@example.com").first()

if admin:
    print("  - Admin user already exists")
    sys.exit(0)
else:
    sys.exit(1)
EOF

    if [ $? -eq 0 ]; then
        print_warning "Admin user already exists"
        return
    fi

    # Get admin details
    echo
    read -p "Create admin user? (Y/n): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        read -p "Admin email (default: admin@example.com): " ADMIN_EMAIL
        ADMIN_EMAIL=${ADMIN_EMAIL:-admin@example.com}

        read -sp "Admin password (default: admin123): " ADMIN_PASS
        ADMIN_PASS=${ADMIN_PASS:-admin123}
        echo

        read -p "Admin full name (default: System Admin): " ADMIN_NAME
        ADMIN_NAME=${ADMIN_NAME:-"System Admin"}

        print_info "Creating admin user..."

        python << EOF
from database import SessionLocal
from models import User
from auth import get_password_hash

db = SessionLocal()

admin = User(
    email="$ADMIN_EMAIL",
    hashed_password=get_password_hash("$ADMIN_PASS"),
    full_name="$ADMIN_NAME",
    is_admin=True,
    is_active=True
)

db.add(admin)
db.commit()
db.refresh(admin)

print(f"  ✓ Admin user created")
print(f"    Email: {admin.email}")
print(f"    ID: {admin.id}")

db.close()
EOF

        print_success "Admin user created"
        print_warning "Default credentials:"
        print_warning "  Email: $ADMIN_EMAIL"
        print_warning "  Password: $ADMIN_PASS"
        print_warning "⚠️  CHANGE THESE IMMEDIATELY IN PRODUCTION!"
    fi
}

# Create sample data
create_sample_data() {
    print_step "Creating Sample Data"

    read -p "Create sample data for testing? (y/N): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Skipping sample data creation"
        return
    fi

    cd "$BACKEND_DIR"
    source venv/bin/activate 2>/dev/null || true

    print_info "Creating sample users..."
    python << 'EOF'
from database import SessionLocal
from models import User
from auth import get_password_hash

db = SessionLocal()

sample_users = [
    {
        "email": "john.doe@example.com",
        "password": "password123",
        "full_name": "John Doe",
        "department": "IT",
        "phone": "+1234567890",
        "employee_id": "EMP001"
    },
    {
        "email": "jane.smith@example.com",
        "password": "password123",
        "full_name": "Jane Smith",
        "department": "HR",
        "phone": "+1234567891",
        "employee_id": "EMP002"
    }
]

for user_data in sample_users:
    user = User(
        email=user_data["email"],
        hashed_password=get_password_hash(user_data["password"]),
        full_name=user_data["full_name"],
        department=user_data.get("department"),
        phone=user_data.get("phone"),
        employee_id=user_data.get("employee_id"),
        is_active=True,
        is_admin=False
    )
    db.add(user)
    print(f"  ✓ Created user: {user_data['email']}")

db.commit()
db.close()
EOF

    print_info "Creating sample items..."
    python << 'EOF'
from database import SessionLocal
from models import Item

db = SessionLocal()

sample_items = [
    {
        "name": "Dell Laptop XPS 15",
        "item_code": "LAPTOP-001",
        "description": "15-inch laptop with i7 processor",
        "category": "Electronics",
        "quantity": 5,
        "brand": "Dell",
        "model": "XPS 15",
        "location": "Storage Room A"
    },
    {
        "name": "Cordless Drill",
        "item_code": "TOOL-001",
        "description": "18V cordless drill with battery",
        "category": "Tools",
        "quantity": 3,
        "brand": "DeWalt",
        "location": "Tool Shed"
    },
    {
        "name": "Projector",
        "item_code": "PROJ-001",
        "description": "HD projector for presentations",
        "category": "Electronics",
        "quantity": 2,
        "brand": "Epson",
        "location": "Conference Room"
    }
]

for item_data in sample_items:
    item = Item(**item_data)
    db.add(item)
    print(f"  ✓ Created item: {item_data['name']}")

db.commit()
db.close()
EOF

    print_success "Sample data created"
}

# Verify database
verify_database() {
    print_step "Verifying Database"

    cd "$BACKEND_DIR"
    source venv/bin/activate 2>/dev/null || true

    python << 'EOF'
from database import SessionLocal
from models import User, Item

db = SessionLocal()

user_count = db.query(User).count()
item_count = db.query(Item).count()
admin_count = db.query(User).filter(User.is_admin == True).count()

print(f"  Users: {user_count}")
print(f"  Items: {item_count}")
print(f"  Admins: {admin_count}")

db.close()
EOF

    print_success "Database verification completed"
}

# Database summary
database_summary() {
    print_step "Database Summary"

    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              DATABASE INITIALIZATION COMPLETE!                   ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo

    echo -e "${BLUE}Database Information:${NC}"
    echo "  Type: $(echo $DATABASE_URL | cut -d':' -f1)"
    echo "  Location: $DATABASE_URL"
    echo

    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Start backend: cd backend && uvicorn main:app --reload"
    echo "  2. Access API docs: http://localhost:8000/docs"
    echo "  3. Login with admin credentials"
    echo

    echo -e "${BLUE}Documentation:${NC}"
    echo "  Setup Guide: docs/setup.md"
    echo "  API Docs: docs/api.md"
    echo
}

# Reset database
reset_database() {
    print_warning "⚠️  DATABASE RESET WARNING ⚠️"
    echo
    echo "This will:"
    echo "  1. Drop all tables"
    echo "  2. Delete all data"
    echo "  3. Recreate tables"
    echo "  4. Run migrations"
    echo
    read -p "Are you absolutely sure? Type 'yes' to confirm: " -r
    echo

    if [ "$REPLY" != "yes" ]; then
        print_info "Reset cancelled"
        exit 0
    fi

    print_step "Resetting Database"

    cd "$BACKEND_DIR"
    source venv/bin/activate 2>/dev/null || true

    # Downgrade to base
    print_info "Removing all migrations..."
    alembic downgrade base

    # Upgrade to head
    print_info "Reapplying migrations..."
    alembic upgrade head

    print_success "Database reset completed"
}

# Main function
main() {
    print_banner

    load_env
    check_database_connection
    create_database

    # Check if reset flag is set
    if [ "$1" = "--reset" ]; then
        reset_database
        exit 0
    fi

    init_alembic
    run_migrations
    seed_data
    create_admin_user
    create_sample_data
    verify_database
    database_summary

    print_success "Database initialization completed successfully!"
}

# Parse arguments
case "${1:-}" in
    --reset)
        main --reset
        ;;
    --help)
        echo "Usage: $0 [--reset|--help]"
        echo
        echo "Options:"
        echo "  --reset    Reset database (⚠️  deletes all data)"
        echo "  --help     Show this help message"
        exit 0
        ;;
    *)
        main
        ;;
esac

exit 0