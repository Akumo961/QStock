# QR Inventory System - Setup Guide

Complete installation and setup guide for the QR Inventory System.

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Quick Start](#quick-start)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Database Setup](#database-setup)
6. [Docker Setup](#docker-setup)
7. [Environment Configuration](#environment-configuration)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Minimum Requirements

**Backend:**
- Python 3.9 or higher
- PostgreSQL 13+ or MySQL 8+
- 512 MB RAM
- 1 GB disk space

**Frontend:**
- Node.js 18 or higher
- npm 9 or higher
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Recommended Requirements

- Python 3.11+
- PostgreSQL 15+
- Node.js 20+
- 2 GB RAM
- 5 GB disk space
- HTTPS-enabled domain (for PWA features)

---

## Quick Start

### Using Docker (Recommended)

The fastest way to get started:

```bash
# Clone the repository
git clone https://github.com/your-org/qr-inventory-system.git
cd qr-inventory-system

# Start with Docker Compose
docker-compose up -d

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

**Default credentials:**
- Email: `admin@example.com`
- Password: `admin123`

⚠️ **Change these credentials immediately in production!**

---

## Backend Setup

### Step 1: Install Python

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip
```

**macOS:**
```bash
brew install python@3.11
```

**Windows:**
Download from [python.org](https://www.python.org/downloads/)

### Step 2: Clone Repository

```bash
git clone https://github.com/your-org/qr-inventory-system.git
cd qr-inventory-system/backend
```

### Step 3: Create Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate

# Windows:
venv\Scripts\activate
```

### Step 4: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 5: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env file
nano .env
```

**Required variables:**
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/qr_inventory
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Step 6: Initialize Database

```bash
# Run database migrations
alembic upgrade head

# Create initial admin user
python scripts/create_admin.py
```

### Step 7: Start Backend Server

```bash
# Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Production
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**Verify backend:**
- API: http://localhost:8000
- Interactive Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## Frontend Setup

### Step 1: Install Node.js

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**macOS:**
```bash
brew install node@20
```

**Windows:**
Download from [nodejs.org](https://nodejs.org/)

### Step 2: Navigate to Frontend Directory

```bash
cd frontend
```

### Step 3: Run Setup Script

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**Or manually:**

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit environment variables
nano .env
```

### Step 4: Configure Environment

```bash
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=QR Inventory System
VITE_APP_VERSION=1.0.0
VITE_ENABLE_PWA=true
```

### Step 5: Start Development Server

```bash
npm run dev
```

**Access frontend:** http://localhost:5173

### Step 6: Build for Production

```bash
npm run build
```

**Output:** `dist/` directory ready for deployment

---

## Database Setup

### PostgreSQL (Recommended)

#### Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Create Database and User

```bash
# Access PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE qr_inventory;
CREATE USER qr_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE qr_inventory TO qr_user;
\q
```

#### Update Connection String

```bash
DATABASE_URL=postgresql://qr_user:secure_password@localhost:5432/qr_inventory
```

### MySQL Alternative

#### Install MySQL

```bash
sudo apt install mysql-server
sudo mysql_secure_installation
```

#### Create Database

```bash
mysql -u root -p

CREATE DATABASE qr_inventory CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'qr_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON qr_inventory.* TO 'qr_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Update Connection String

```bash
DATABASE_URL=mysql+pymysql://qr_user:secure_password@localhost:3306/qr_inventory
```

---

## Docker Setup

### Prerequisites

Install Docker and Docker Compose:

**Ubuntu:**
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

**macOS/Windows:**
Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)

### Build and Run

#### Backend Only

```bash
cd backend

# Build image
docker build -t qr-inventory-backend .

# Run container
docker run -d \
  -p 8000:8000 \
  --env-file .env \
  --name qr-backend \
  qr-inventory-backend
```

#### Frontend Only

```bash
cd frontend

# Build image
docker build -t qr-inventory-frontend .

# Run container
docker run -d \
  -p 80:80 \
  --name qr-frontend \
  qr-inventory-frontend
```

#### Full Stack with Docker Compose

```bash
# In project root
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild
docker-compose up -d --build
```

**docker-compose.yml example:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: qr_inventory
      POSTGRES_USER: qr_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://qr_user:secure_password@postgres:5432/qr_inventory
    ports:
      - "8000:8000"

  frontend:
    build: ./frontend
    depends_on:
      - backend
    ports:
      - "80:80"

volumes:
  postgres_data:
```

---

## Environment Configuration

### Backend Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/qr_inventory

# Security
SECRET_KEY=your-long-random-secret-key-here-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@qrinventory.com

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_BUCKET_NAME=qr-inventory-files
AWS_REGION=us-east-1

# Application
DEBUG=false
ENVIRONMENT=production
```

### Frontend Environment Variables

```bash
# API
VITE_API_URL=http://localhost:8000/api

# Application
VITE_APP_NAME=QR Inventory System
VITE_APP_VERSION=1.0.0

# Features
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=false

# Environment
VITE_ENV=production
```

### Generate Secret Key

```bash
# Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# OpenSSL
openssl rand -base64 32
```

---

## Production Deployment

### 1. Prepare Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Configure Nginx

```nginx
# /etc/nginx/sites-available/qr-inventory

server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API Documentation
    location /docs {
        proxy_pass http://localhost:8000/docs;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/qr-inventory /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Setup SSL with Let's Encrypt

```bash
sudo certbot --nginx -d your-domain.com
sudo systemctl reload nginx
```

### 4. Setup Systemd Services

**Backend Service:**
```ini
# /etc/systemd/system/qr-backend.service

[Unit]
Description=QR Inventory Backend
After=network.target postgresql.service

[Service]
Type=notify
User=www-data
WorkingDirectory=/var/www/qr-inventory/backend
Environment="PATH=/var/www/qr-inventory/backend/venv/bin"
ExecStart=/var/www/qr-inventory/backend/venv/bin/gunicorn \
    main:app \
    -w 4 \
    -k uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable qr-backend
sudo systemctl start qr-backend
```

### 5. Setup Database Backups

```bash
# Create backup script
cat > /usr/local/bin/backup-qr-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=/var/backups/qr-inventory
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
pg_dump qr_inventory | gzip > $BACKUP_DIR/backup_$DATE.sql.gz
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-qr-db.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup-qr-db.sh" | sudo crontab -
```

---

## Troubleshooting

### Backend Issues

#### Port Already in Use
```bash
# Find process using port 8000
lsof -i :8000

# Kill process
kill -9 <PID>
```

#### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check connection
psql -U qr_user -d qr_inventory -h localhost

# Check credentials in .env file
```

#### Import Errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Check Python version
python --version
```

### Frontend Issues

#### Port 5173 in Use
```bash
# Kill process
npx kill-port 5173

# Or use different port
npm run dev -- --port 3000
```

#### Build Errors
```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

#### API Connection Failed
```bash
# Check backend is running
curl http://localhost:8000/api/health

# Check VITE_API_URL in .env
cat .env | grep VITE_API_URL
```

### Docker Issues

#### Container Won't Start
```bash
# View logs
docker logs qr-backend
docker logs qr-frontend

# Check container status
docker ps -a
```

#### Permission Denied
```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Database Issues

#### Migrations Failed
```bash
# Reset database (⚠️ DELETES DATA)
alembic downgrade base
alembic upgrade head

# Or create fresh database
dropdb qr_inventory
createdb qr_inventory
alembic upgrade head
```

---

## Next Steps

After setup is complete:

1. ✅ Change default admin credentials
2. ✅ Configure email settings
3. ✅ Setup database backups
4. ✅ Configure SSL certificate
5. ✅ Review security settings
6. ✅ Test PWA installation
7. ✅ Read [User Guide](user-guide.md)
8. ✅ Read [Admin Guide](admin-guide.md)

---

## Support

Need help?

- 📧 Email: support@qrinventory.com
- 📖 Documentation: https://docs.qrinventory.com
- 🐛 Issues: https://github.com/your-org/qr-inventory/issues
- 💬 Discord: https://discord.gg/qrinventory