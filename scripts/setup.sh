#!/bin/bash

###############################################################################
# QR Inventory System - Complete Setup Script
# This script automates the complete setup of the QR Inventory System
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Print functions
print_banner() {
    clear
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║         QR INVENTORY SYSTEM - COMPLETE SETUP                     ║"
    echo "║         Scouts Musulmans de Montréal - Kashef                    ║"
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
    echo -e "\n${CYAN}═══ $1 ═══${NC}\n"
}

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        print_warning "Running as root. This is not recommended for development."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check system requirements
check_system_requirements() {
    print_step "Checking System Requirements"

    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        print_info "Detected OS: Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        print_info "Detected OS: macOS"
    else
        OS="other"
        print_warning "Detected OS: $OSTYPE (may not be fully supported)"
    fi

    # Check Python
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
        print_success "Python 3 found: $PYTHON_VERSION"

        # Check if version is 3.9 or higher
        PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d'.' -f1)
        PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d'.' -f2)

        if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 9 ]); then
            print_error "Python 3.9+ required. Found: $PYTHON_VERSION"
            exit 1
        fi
    else
        print_error "Python 3 is not installed!"
        print_info "Please install Python 3.9 or higher:"
        print_info "  Ubuntu/Debian: sudo apt install python3.11"
        print_info "  macOS: brew install python@3.11"
        exit 1
    fi

    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"

        # Extract major version
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -lt 18 ]; then
            print_error "Node.js 18+ required. Found: $NODE_VERSION"
            exit 1
        fi
    else
        print_error "Node.js is not installed!"
        print_info "Please install Node.js 18 or higher:"
        print_info "  Visit: https://nodejs.org/"
        exit 1
    fi

    # Check npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm is not installed!"
        exit 1
    fi

    # Check PostgreSQL (optional)
    if command -v psql &> /dev/null; then
        PSQL_VERSION=$(psql --version | cut -d' ' -f3)
        print_success "PostgreSQL found: $PSQL_VERSION"
        HAS_POSTGRES=true
    else
        print_warning "PostgreSQL not found (optional)"
        HAS_POSTGRES=false
    fi

    # Check Docker (optional)
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
        print_success "Docker found: $DOCKER_VERSION"
        HAS_DOCKER=true
    else
        print_warning "Docker not found (optional)"
        HAS_DOCKER=false
    fi

    print_success "System requirements check passed!"
}

# Setup mode selection
select_setup_mode() {
    print_step "Select Setup Mode"

    echo "1) Full Setup (Backend + Frontend + Database)"
    echo "2) Backend Only"
    echo "3) Frontend Only"
    echo "4) Docker Setup (Recommended for production)"
    echo "5) Development Setup (Quick start for developers)"
    echo
    read -p "Select mode (1-5): " MODE

    case $MODE in
        1) SETUP_MODE="full" ;;
        2) SETUP_MODE="backend" ;;
        3) SETUP_MODE="frontend" ;;
        4) SETUP_MODE="docker" ;;
        5) SETUP_MODE="dev" ;;
        *) print_error "Invalid selection"; exit 1 ;;
    esac

    print_info "Setup mode: $SETUP_MODE"
}

# Setup backend
setup_backend() {
    print_step "Setting Up Backend"

    cd "$PROJECT_ROOT/backend" || exit 1

    # Create virtual environment
    print_info "Creating Python virtual environment..."
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        print_success "Virtual environment created"
    else
        print_warning "Virtual environment already exists"
    fi

    # Activate virtual environment
    source venv/bin/activate

    # Upgrade pip
    print_info "Upgrading pip..."
    pip install --upgrade pip > /dev/null 2>&1

    # Install dependencies
    print_info "Installing Python dependencies..."
    if [ -f "requirements.txt" ]; then
        pip install -r requirements.txt
        print_success "Dependencies installed"
    else
        print_error "requirements.txt not found!"
        exit 1
    fi

    # Create .env file
    if [ ! -f ".env" ]; then
        print_info "Creating .env file..."
        if [ -f ".env.example" ]; then
            cp .env.example .env

            # Generate secret key
            SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")

            # Update .env with generated secret key
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
            else
                sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
            fi

            print_success ".env file created"
            print_warning "Please update DATABASE_URL in .env file"
        else
            print_error ".env.example not found!"
        fi
    else
        print_warning ".env file already exists"
    fi

    print_success "Backend setup completed!"
}

# Setup frontend
setup_frontend() {
    print_step "Setting Up Frontend"

    cd "$PROJECT_ROOT/frontend" || exit 1

    # Install dependencies
    print_info "Installing Node.js dependencies..."
    npm install
    print_success "Dependencies installed"

    # Create .env file
    if [ ! -f ".env" ]; then
        print_info "Creating .env file..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success ".env file created"
        else
            print_error ".env.example not found!"
        fi
    else
        print_warning ".env file already exists"
    fi

    # Create necessary directories
    print_info "Creating directory structure..."
    mkdir -p public/icons
    mkdir -p src/{components,pages,hooks,services,utils,types}
    print_success "Directories created"

    print_success "Frontend setup completed!"
}

# Setup database
setup_database() {
    print_step "Setting Up Database"

    if [ "$HAS_POSTGRES" = false ]; then
        print_warning "PostgreSQL not installed. Skipping database setup."
        print_info "You can use SQLite for development or install PostgreSQL."
        return
    fi

    read -p "Do you want to create a new database? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Database name (default: qr_inventory): " DB_NAME
        DB_NAME=${DB_NAME:-qr_inventory}

        read -p "Database user (default: qr_user): " DB_USER
        DB_USER=${DB_USER:-qr_user}

        read -sp "Database password: " DB_PASS
        echo

        print_info "Creating database..."

        # Create database and user
        sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF

        print_success "Database created: $DB_NAME"

        # Update .env file
        DB_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
        cd "$PROJECT_ROOT/backend"

        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" .env
        else
            sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" .env
        fi

        print_success "Database URL updated in .env"
    fi
}

# Initialize database
initialize_database() {
    print_step "Initializing Database"

    cd "$PROJECT_ROOT/backend" || exit 1
    source venv/bin/activate

    # Check if alembic is configured
    if [ -f "alembic.ini" ]; then
        print_info "Running database migrations..."
        alembic upgrade head
        print_success "Database migrations completed"
    else
        print_warning "Alembic not configured. Skipping migrations."
    fi

    # Create admin user
    read -p "Create admin user? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "scripts/create_admin.py" ]; then
            python scripts/create_admin.py
            print_success "Admin user created"
        else
            print_warning "create_admin.py script not found"
        fi
    fi
}

# Docker setup
setup_docker() {
    print_step "Setting Up with Docker"

    if [ "$HAS_DOCKER" = false ]; then
        print_error "Docker is not installed!"
        print_info "Please install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi

    cd "$PROJECT_ROOT" || exit 1

    if [ -f "docker-compose.yml" ]; then
        print_info "Building Docker images..."
        docker-compose build

        print_info "Starting services..."
        docker-compose up -d

        print_success "Docker services started!"

        print_info "Waiting for services to be ready..."
        sleep 10

        print_info "Running database migrations..."
        docker-compose exec backend alembic upgrade head

        print_success "Docker setup completed!"
    else
        print_error "docker-compose.yml not found!"
        exit 1
    fi
}

# Development setup (quick start)
setup_dev() {
    print_step "Development Setup (Quick Start)"

    # Backend with SQLite
    print_info "Setting up backend with SQLite..."
    cd "$PROJECT_ROOT/backend" || exit 1

    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip > /dev/null 2>&1
    pip install -r requirements.txt

    # Create .env with SQLite
    cat > .env << EOF
DATABASE_URL=sqlite:///./qr_inventory.db
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DEBUG=true
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
EOF

    print_success "Backend setup completed (using SQLite)"

    # Frontend
    print_info "Setting up frontend..."
    cd "$PROJECT_ROOT/frontend" || exit 1
    npm install

    cat > .env << EOF
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=QR Inventory System
VITE_APP_VERSION=1.0.0
VITE_ENABLE_PWA=true
VITE_ENV=development
EOF

    print_success "Frontend setup completed"

    print_success "Development setup completed!"
}

# Run tests
run_tests() {
    print_step "Running Tests"

    read -p "Run tests? (y/N): " -n 1 -r
    echo

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Backend tests
        if [ -f "$PROJECT_ROOT/backend/pytest.ini" ]; then
            print_info "Running backend tests..."
            cd "$PROJECT_ROOT/backend"
            source venv/bin/activate
            pytest
            print_success "Backend tests completed"
        fi

        # Frontend tests
        if [ -f "$PROJECT_ROOT/frontend/package.json" ]; then
            print_info "Running frontend tests..."
            cd "$PROJECT_ROOT/frontend"
            npm test
            print_success "Frontend tests completed"
        fi
    fi
}

# Display next steps
display_next_steps() {
    print_step "Setup Complete!"

    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    SETUP SUCCESSFUL!                             ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo

    case $SETUP_MODE in
        "full"|"dev")
            echo -e "${CYAN}Backend:${NC}"
            echo "  1. cd backend"
            echo "  2. source venv/bin/activate"
            echo "  3. uvicorn main:app --reload"
            echo "     → http://localhost:8000"
            echo "     → http://localhost:8000/docs (API documentation)"
            echo
            echo -e "${CYAN}Frontend:${NC}"
            echo "  1. cd frontend"
            echo "  2. npm run dev"
            echo "     → http://localhost:5173"
            echo
            ;;
        "backend")
            echo -e "${CYAN}Backend:${NC}"
            echo "  1. cd backend"
            echo "  2. source venv/bin/activate"
            echo "  3. uvicorn main:app --reload"
            echo "     → http://localhost:8000"
            echo
            ;;
        "frontend")
            echo -e "${CYAN}Frontend:${NC}"
            echo "  1. cd frontend"
            echo "  2. npm run dev"
            echo "     → http://localhost:5173"
            echo
            ;;
        "docker")
            echo -e "${CYAN}Docker Services:${NC}"
            echo "  Frontend: http://localhost"
            echo "  Backend: http://localhost:8000"
            echo "  API Docs: http://localhost:8000/docs"
            echo
            echo "  Commands:"
            echo "    View logs: docker-compose logs -f"
            echo "    Stop: docker-compose down"
            echo "    Restart: docker-compose restart"
            echo
            ;;
    esac

    echo -e "${CYAN}Default Admin Credentials:${NC}"
    echo "  Email: admin@example.com"
    echo "  Password: admin123"
    echo -e "  ${RED}⚠️  Change these immediately!${NC}"
    echo

    echo -e "${CYAN}Documentation:${NC}"
    echo "  Setup Guide: docs/setup.md"
    echo "  User Guide: docs/user-guide.md"
    echo "  Admin Guide: docs/admin-guide.md"
    echo "  API Docs: docs/api.md"
    echo

    echo -e "${CYAN}Support:${NC}"
    echo "  📧 Email: support@qrinventory.com"
    echo "  🐛 Issues: https://github.com/your-org/qr-inventory/issues"
    echo

    echo -e "${GREEN}Happy coding! 🚀${NC}"
}

# Main execution
main() {
    print_banner

    check_root
    check_system_requirements
    select_setup_mode

    case $SETUP_MODE in
        "full")
            setup_backend
            setup_frontend
            setup_database
            initialize_database
            ;;
        "backend")
            setup_backend
            setup_database
            initialize_database
            ;;
        "frontend")
            setup_frontend
            ;;
        "docker")
            setup_docker
            ;;
        "dev")
            setup_dev
            ;;
    esac

    run_tests
    display_next_steps
}

# Run main function
main

exit 0