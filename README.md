# QR Inventory System

**Modern Inventory Management with QR Code Technology**

*Built for Scouts Musulmans de Montréal - Kashef*

---

## 📖 Overview

QR Inventory System is a comprehensive inventory management solution designed to streamline equipment tracking, borrowing, and returns using QR code technology.

### ✨ Key Features

- 📱 **QR Code Integration** - Instant item identification and tracking
- 🔐 **Secure Authentication** - JWT-based user authentication
- 📊 **Real-time Dashboard** - Live inventory statistics and analytics
- 📱 **PWA Support** - Install as mobile app on iOS & Android
- 🎨 **Modern UI** - Beautiful Material-UI interface
- 🔄 **Transaction Management** - Track borrows and returns
- ⭐ **Review System** - Rate and review borrowed items
- 📈 **Reports & Analytics** - Generate detailed reports
- 👥 **User Management** - Role-based access control
- 🤖 **AI Inventory Assistant** - Ask natural language questions about your inventory (English & French)

---

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/qr-inventory-system.git
cd qr-inventory-system

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

**Default Login:**
- Email: `admin@example.com`
- Password: `admin123`

⚠️ **IMPORTANT:** Change these credentials immediately in production!

### Manual Setup

See [Setup Guide](docs/setup.md) for detailed installation instructions.

---

## 📚 Documentation

Complete documentation is available in the `docs/` directory:

- 📖 **[Setup Guide](docs/setup.md)** - Installation and configuration
- 👤 **[User Guide](docs/user-guide.md)** - End-user documentation
- 👨‍💼 **[Admin Guide](docs/admin-guide.md)** - Administrator manual
- 🔌 **[API Documentation](docs/api.md)** - Complete API reference

---

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Reliable relational database
- **SQLAlchemy** - SQL toolkit and ORM
- **Alembic** - Database migrations
- **Pydantic** - Data validation
- **JWT** - Secure authentication
- **python-qrcode** - QR code generation
- **httpx** - Async HTTP client (used for OpenAI / Ollama AI provider calls)

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Material-UI** - Component library
- **React Router** - Client-side routing
- **date-fns** - Date utilities
- **html5-qrcode** - QR code scanning

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Web server and reverse proxy
- **PostgreSQL** - Database server

---

## 📁 Project Structure

```
qr-inventory-system/
├── backend/                 # FastAPI backend
│   ├── src/
│   │   ├── models/         # Database models (SQLAlchemy)
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── api/
│   │   │   └── endpoints/  # API route handlers
│   │   ├── core/           # Config, database, security, QR generation
│   │   ├── ai/             # AI Inventory Assistant (SQL generation, providers, safety guard)
│   │   ├── utils/          # Utilities
│   │   └── main.py         # Application entry
│   ├── env.example         # Environment variable template
│   └── requirements.txt    # Python dependencies
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # API services
│   │   └── utils/         # Utilities
│   ├── public/            # Static assets
│   └── package.json       # Node dependencies
│
├── docs/                   # Documentation
│   ├── setup.md           # Setup guide
│   ├── user-guide.md      # User manual
│   ├── admin-guide.md     # Admin manual
│   └── api.md             # API reference
│
├── scripts/                # Automation scripts
│   ├── setup.sh           # Setup script
│   ├── deploy.sh          # Deployment script
│   ├── backup.sh          # Backup script
│   └── init-db.sh         # Database initialization
│
├── docker-compose.yml      # Docker orchestration
├── .gitignore             # Git ignore rules
├── README.md              # This file
└── LICENSE                # MIT License
```

---

## 🎯 Features in Detail

### For End Users

- 📱 **Mobile QR Scanning** - Use phone camera to scan item QR codes
- 📦 **Browse Inventory** - Search and filter available items
- 🔄 **Quick Borrowing** - Scan user QR + item QR to borrow instantly
- 📊 **Personal Dashboard** - Track your active borrows and history
- ⏰ **Due Date Reminders** - Email notifications before due dates
- ⭐ **Item Reviews** - Rate and review borrowed items
- 📱 **PWA Installation** - Install app on your mobile device
- 🤖 **AI Assistant** - Ask plain-language questions about inventory ("How many laptops do we have?") in English or French

### For Administrators

- 👥 **User Management** - Create, edit, and manage user accounts
- 📦 **Inventory Control** - Add, edit, and track all items
- 🏷️ **QR Code Generation** - Generate and print QR codes for items
- 📊 **Analytics Dashboard** - View usage statistics and trends
- 📈 **Report Generation** - Export data in CSV, PDF formats
- ⚙️ **System Configuration** - Customize settings and preferences
- 🔔 **Notification System** - Send bulk notifications to users
- 🔒 **Access Control** - Manage user roles and permissions
- 🤖 **AI-Powered Insights** - Query inventory data conversationally instead of writing reports manually

---

## 🤖 AI Inventory Assistant

Ask plain-language questions about your inventory and get answers without writing a single SQL query.

**Example questions:**
- "How many Dell laptops do we currently have?"
- "Which items have not been used in the last 6 months?"
- "Show me all inventory assigned to Finance."
- "Which items are below critical stock levels?"
- "What inventory was added this month?"

**How it works:**

```
User question → LLM generates SQL → Safety guard validates → PostgreSQL (read-only) → Natural language answer
```

- Works in **English or French** — matches the language currently selected in the app.
- Only `SELECT` statements are ever executed; `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`, `CREATE`, `GRANT`, and `REVOKE` are blocked before reaching the database, as are multi-statement queries.
- Results are capped at 100 rows with a 30-second query timeout.
- Requires authentication — same login as the rest of the app, no separate setup.
- Powered by **OpenAI** or a **local Ollama** model — your choice, configured via environment variables (see [Environment Variables](#environment-variables) below). If neither is configured, the page shows a friendly setup message instead of an error.

> ⚠️ **Docker users:** `docker-compose.yml`'s `backend` service does not yet forward `OPENAI_API_KEY` / `OLLAMA_URL` (etc.) from the root `.env` into the container — only the variables already listed under `backend.environment` in that file reach it. Until `docker-compose.yml` is updated to pass these through, set the AI provider variables directly in `backend/.env` when running the backend outside Docker (`uvicorn`), or add them to the `backend.environment` block in `docker-compose.yml` yourself.

---

## 🔧 Development

### Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher
- PostgreSQL 13 or higher
- Docker & Docker Compose (for containerized deployment)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp env.example .env
# Edit .env with your configuration

# Run migrations
alembic upgrade head

# Start development server
uvicorn src.main:app --reload
```

Backend will be available at: http://localhost:8000

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment
cp env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

Frontend will be available at: http://localhost:5173

---

## 🚢 Deployment

### Production Deployment

```bash
# Using the deployment script
./scripts/deploy.sh

# Or manually with Docker Compose
docker-compose up -d
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
POSTGRES_PASSWORD=your_secure_password

# Backend
SECRET_KEY=your_secret_key_here  # Generate with: openssl rand -hex 32

# Frontend
VITE_API_URL=https://your-domain.com/api

# AI Assistant (optional — choose ONE provider below)
# Option A: OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Option B: Ollama (local LLM, no API key required)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=phi3:mini
```

If neither `OPENAI_API_KEY` nor `OLLAMA_URL` is set, the AI Assistant page remains visible but returns a "not configured" message instead of failing — every other feature is unaffected.

See [Setup Guide](docs/setup.md) for complete deployment instructions.

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
pytest --cov=. --cov-report=html
```

### Frontend Tests

```bash
cd frontend
npm test
npm run test:coverage
```

---

## 📊 Performance

- ⚡ Fast response times (< 100ms average)
- 📦 Optimized bundle size (< 500KB gzipped)
- 🚀 Lighthouse score: 95+
- 📱 Mobile-optimized and responsive
- 💾 Efficient caching with service workers

---

## 🔒 Security

- 🔐 JWT-based authentication
- 🔑 Password hashing with bcrypt
- 🛡️ CORS protection
- 🔒 SQL injection prevention
- 🚫 XSS protection
- 📝 Input validation with Pydantic
- 🔐 HTTPS support in production

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors

**Scouts Musulmans de Montréal - Kashef**

---

## 🙏 Acknowledgments

- FastAPI for the amazing web framework
- React team for the powerful UI library
- Material-UI for beautiful components
- PostgreSQL for reliable database
- All contributors who helped build this project

---

## 📞 Support

- 📧 **Email**: ali_el-sayedali@live.ca
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-org/qr-inventory/issues)
- 📖 **Documentation**: Full Docs

---

## 🗺️ Roadmap

### Version 1.1 (Coming Soon)
- [x] Multi-language support (English / French) — UI and AI Assistant
- [x] AI Inventory Assistant (natural language querying)
- [ ] Mobile native apps
- [ ] Barcode support
- [ ] Advanced analytics

### Version 2.0 (Future)
- [ ] Multi-tenant support
- [ ] Custom workflows
- [ ] API webhooks
- [ ] SSO integration

---

<div align="center">

**Made with ❤️ by Scouts Musulmans de Montréal**

[Documentation](docs/) • [Report Bug](issues) • [Request Feature](issues)

</div>