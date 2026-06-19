#!/bin/bash

###############################################################################
# QR Inventory System - Frontend Setup Script
# This script sets up the frontend development environment
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Print banner
print_banner() {
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║        QR INVENTORY SYSTEM - FRONTEND SETUP              ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if Node.js is installed
check_node() {
    print_info "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed!"
        print_info "Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi

    NODE_VERSION=$(node -v)
    print_success "Node.js found: $NODE_VERSION"
}

# Check if npm is installed
check_npm() {
    print_info "Checking npm installation..."
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed!"
        exit 1
    fi

    NPM_VERSION=$(npm -v)
    print_success "npm found: $NPM_VERSION"
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."

    if [ -f "package.json" ]; then
        npm install
        print_success "Dependencies installed successfully!"
    else
        print_error "package.json not found!"
        exit 1
    fi
}

# Create environment file
create_env_file() {
    print_info "Creating environment file..."

    if [ -f ".env" ]; then
        print_warning ".env file already exists. Skipping..."
    else
        cat > .env << 'EOF'
# API Configuration
VITE_API_URL=http://localhost:8000/api

# Application Configuration
VITE_APP_NAME=QR Inventory System
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=false

# Environment
VITE_ENV=development
EOF
        print_success ".env file created successfully!"
    fi
}

# Create directory structure
create_directories() {
    print_info "Creating directory structure..."

    directories=(
        "src/components/common"
        "src/components/layout"
        "src/components/users"
        "src/components/items"
        "src/components/transactions"
        "src/components/admin"
        "src/pages"
        "src/pages/admin"
        "src/hooks"
        "src/services"
        "src/types"
        "src/utils"
        "src/assets"
        "src/assets/images"
        "src/assets/icons"
        "public/icons"
    )

    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_info "Created: $dir"
        fi
    done

    print_success "Directory structure created!"
}

# Setup Git hooks (optional)
setup_git_hooks() {
    print_info "Setting up Git hooks..."

    if [ -d ".git" ]; then
        # Pre-commit hook
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
npm run lint
EOF
        chmod +x .git/hooks/pre-commit
        print_success "Git hooks configured!"
    else
        print_warning "Not a git repository. Skipping Git hooks..."
    fi
}

# Verify installation
verify_installation() {
    print_info "Verifying installation..."

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_error "node_modules directory not found!"
        return 1
    fi

    # Check if key packages are installed
    if [ ! -d "node_modules/react" ]; then
        print_error "React is not installed!"
        return 1
    fi

    if [ ! -d "node_modules/vite" ]; then
        print_error "Vite is not installed!"
        return 1
    fi

    print_success "Installation verified!"
}

# Display next steps
display_next_steps() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    SETUP COMPLETE!                       ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo ""
    echo "  1. Start the development server:"
    echo -e "     ${YELLOW}npm run dev${NC}"
    echo ""
    echo "  2. Build for production:"
    echo -e "     ${YELLOW}npm run build${NC}"
    echo ""
    echo "  3. Preview production build:"
    echo -e "     ${YELLOW}npm run preview${NC}"
    echo ""
    echo "  4. Run tests:"
    echo -e "     ${YELLOW}npm run test${NC}"
    echo ""
    echo "  5. Lint code:"
    echo -e "     ${YELLOW}npm run lint${NC}"
    echo ""
    echo -e "${BLUE}Default URL:${NC} http://localhost:5173"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
    echo ""
}

# Main execution
main() {
    print_banner

    # Navigate to frontend directory if not already there
    if [ ! -f "package.json" ]; then
        if [ -d "frontend" ]; then
            cd frontend
            print_info "Changed directory to frontend/"
        else
            print_error "Frontend directory not found!"
            exit 1
        fi
    fi

    # Run setup steps
    check_node
    check_npm
    create_env_file
    create_directories
    install_dependencies
    verify_installation
    setup_git_hooks

    # Display completion message
    display_next_steps
}

# Run main function
main

exit 0