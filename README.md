# Bookkeeping UAE - Backend API

A robust, scalable backend API for managing bookkeeping operations in the UAE. Built with NestJS, TypeScript, and PostgreSQL for enterprise-grade performance and reliability.

## 🚀 Features

- **Authentication & Authorization** - JWT-based authentication with role-based access control (RBAC)
- **Multi-tenant Architecture** - Support for multiple companies with data isolation
- **Invoicing System** - Create, manage, and track invoices with payment recording
- **Expense Management** - Track and categorize business expenses
- **Vendor Bills** - Manage vendor bills and payments
- **Chart of Accounts** - Comprehensive account management system
- **General Ledger** - Double-entry bookkeeping with audit trail
- **Journal Entries** - Manual journal entry creation and management
- **Financial Reports** - Balance sheet, P&L, trial balance, cash flow statements
- **Bank Reconciliation** - Match and reconcile bank transactions
- **VAT Returns** - Generate VAT return reports for UAE compliance
- **OCR Integration** - Extract data from invoice images using Tesseract.js
- **AI Assistant** - Google Gemini AI integration for intelligent assistance
- **Audit Logging** - Comprehensive audit trail for all operations
- **Inbox Management** - Document inbox for processing receipts and invoices

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PostgreSQL** (v15 or higher) - Or use Docker (recommended)
- **Docker & Docker Compose** (optional, for easy PostgreSQL setup)

## 🛠️ Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/inteletra/book-keeping-ui.git
cd book-keeping-ui
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup PostgreSQL Database

#### Option A: Using Docker (Recommended)

Start PostgreSQL using Docker Compose:

```bash
docker-compose up -d
```

This will start PostgreSQL on port 5432 with the following credentials:
- **Host**: localhost
- **Port**: 5432
- **Database**: bookkeeping
- **User**: postgres
- **Password**: postgres

#### Option B: Using Local PostgreSQL

If you have PostgreSQL installed locally:

1. Create a database named `bookkeeping`
2. Update the `.env` file with your PostgreSQL credentials

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=bookkeeping

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration (Optional)
PORT=3000

# AI Configuration (Optional - for AI features)
GEMINI_API_KEY=your-gemini-api-key-here
```

> **Important**: Change `JWT_SECRET` to a strong, random string in production!

### 5. Run Database Migration and Seeding

This single command will:
- Create all database tables (migration)
- Populate the database with demo data (seeding)

```bash
npm run migrate:seed
```

**What gets created:**
- ✅ All database tables and schema
- ✅ Demo user account (demo@bookkeeping.com / Demo123!)
- ✅ Super admin account (admin@bookkeeping.com / Admin123!)
- ✅ Chart of accounts (Assets, Liabilities, Equity, Revenue, Expenses)
- ✅ 5 sample invoices with different statuses
- ✅ 7 sample expenses across various categories
- ✅ Opening balance journal entry

### 6. Start the Development Server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

## 📦 Available Scripts

### Development
- `npm run start:dev` - Start development server with hot reload
- `npm run start:debug` - Start in debug mode
- `npm run start` - Start in production mode

### Database
- `npm run migrate:seed` - Run database migration and seed demo data (recommended for first setup)
- `npm run seed` - Seed demo data only (deprecated, use migrate:seed instead)

### Build & Production
- `npm run build` - Build for production
- `npm run start:prod` - Start production server

### Code Quality
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:cov` - Run tests with coverage

## 🏗️ Tech Stack

- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe JavaScript
- **PostgreSQL** - Relational database
- **TypeORM** - ORM for database operations
- **Passport JWT** - Authentication strategy
- **bcrypt** - Password hashing
- **class-validator** - DTO validation
- **class-transformer** - Object transformation
- **Tesseract.js** - OCR for invoice scanning
- **Google Generative AI** - AI assistant integration
- **csv-parser** - CSV file parsing

## 📁 Project Structure

```
src/
├── accounts/           # Chart of accounts module
├── ai/                 # AI assistant integration
├── audit/              # Audit logging module
├── auth/               # Authentication & authorization
├── banking/            # Bank reconciliation
├── common/             # Shared utilities, DTOs, decorators
│   ├── decorators/     # Custom decorators
│   ├── dto/            # Common DTOs
│   ├── entities/       # Base entities
│   ├── guards/         # Auth guards
│   └── interceptors/   # Logging interceptors
├── companies/          # Multi-tenant company management
├── database/           # Database configuration
├── expenses/           # Expense tracking
├── inbox/              # Document inbox
├── invoices/           # Invoice management
├── journal-entries/    # Manual journal entries
├── ledger/             # General ledger
├── ocr/                # OCR service
├── reports/            # Financial reports
├── users/              # User management
├── vendor-bills/       # Vendor bill management
├── app.module.ts       # Root module
├── main.ts             # Application entry point
└── migrate-and-seed.ts # Migration and seeding script
```

## 🔌 API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/profile` - Get current user profile

### Invoices
- `GET /invoices` - List all invoices (with pagination)
- `POST /invoices` - Create new invoice
- `GET /invoices/:id` - Get invoice by ID
- `PATCH /invoices/:id` - Update invoice
- `DELETE /invoices/:id` - Delete invoice
- `POST /invoices/:id/send` - Send invoice to customer
- `POST /invoices/:id/payments` - Record payment
- `POST /invoices/import` - Import invoices from CSV

### Expenses
- `GET /expenses` - List all expenses
- `POST /expenses` - Create new expense
- `GET /expenses/:id` - Get expense by ID
- `PATCH /expenses/:id` - Update expense
- `DELETE /expenses/:id` - Delete expense

### Accounts
- `GET /accounts` - List chart of accounts
- `POST /accounts` - Create new account
- `GET /accounts/:id` - Get account by ID
- `PATCH /accounts/:id` - Update account
- `DELETE /accounts/:id` - Delete account

### Reports
- `GET /reports/balance-sheet` - Generate balance sheet
- `GET /reports/profit-loss` - Generate P&L statement
- `GET /reports/trial-balance` - Generate trial balance
- `GET /reports/cash-flow` - Generate cash flow statement
- `GET /reports/vat-return` - Generate VAT return

### Journal Entries
- `GET /journal-entries` - List journal entries
- `POST /journal-entries` - Create journal entry
- `GET /journal-entries/:id` - Get journal entry by ID

### Vendor Bills
- `GET /vendor-bills` - List vendor bills
- `POST /vendor-bills` - Create vendor bill
- `GET /vendor-bills/:id` - Get vendor bill by ID
- `PATCH /vendor-bills/:id` - Update vendor bill
- `POST /vendor-bills/:id/payments` - Record payment

### Banking
- `GET /banking/transactions` - List bank transactions
- `POST /banking/reconcile` - Reconcile transactions

### Audit Logs
- `GET /audit` - List audit logs (admin only)

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. After logging in, include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### User Roles

- **SUPER_ADMIN** - Full system access, manage all companies
- **ADMIN** - Full access to their company's data
- **USER** - Limited access to their company's data

## 🌐 CORS Configuration

CORS is enabled by default for all origins in development. For production, update the CORS configuration in `main.ts`:

```typescript
app.enableCors({
  origin: 'https://your-frontend-domain.com',
  credentials: true,
});
```

## 🗄️ Database Schema

The application uses TypeORM with automatic schema synchronization in development. Key entities include:

- **User** - User accounts
- **Company** - Multi-tenant companies
- **Account** - Chart of accounts
- **Invoice** - Customer invoices
- **InvoiceItem** - Invoice line items
- **InvoicePayment** - Payment records
- **Expense** - Business expenses
- **VendorBill** - Vendor bills
- **JournalEntry** - Manual journal entries
- **JournalLine** - Journal entry lines
- **LedgerEntry** - General ledger entries
- **BankTransaction** - Bank transactions
- **AuditLog** - Audit trail
- **InboxItem** - Document inbox items

## 📊 Demo Data

After running `npm run migrate:seed`, you'll have access to:

### Demo User Account
- **Email**: demo@bookkeeping.com
- **Password**: Demo123!
- **Company**: Demo General Trading LLC

### Super Admin Account
- **Email**: admin@bookkeeping.com
- **Password**: Admin123!

### Sample Data
- 5 invoices (various statuses: draft, sent, overdue)
- 7 expenses (rent, utilities, software, etc.)
- Complete chart of accounts
- Opening balance journal entry

## 🚀 Production Deployment

### 1. Build the Application

```bash
npm run build
```

### 2. Set Production Environment Variables

Update `.env` with production values:

```env
DATABASE_HOST=your-production-db-host
DATABASE_PORT=5432
DATABASE_USER=your-db-user
DATABASE_PASSWORD=your-secure-password
DATABASE_NAME=bookkeeping_prod
JWT_SECRET=your-very-secure-random-jwt-secret
NODE_ENV=production
```

### 3. Run Migrations

```bash
npm run migrate:seed
```

### 4. Start Production Server

```bash
npm run start:prod
```

## 🐛 Troubleshooting

### Database Connection Issues

**Error**: `ECONNREFUSED` or connection timeout

**Solution**:
- Verify PostgreSQL is running: `docker ps` (if using Docker)
- Check `.env` file has correct database credentials
- Ensure PostgreSQL is accepting connections on port 5432

### Migration Errors

**Error**: `relation already exists`

**Solution**:
- This is normal if tables already exist
- The migration script will skip existing tables

### Port Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:
- Change the port in `.env`: `PORT=3001`
- Or kill the process using port 3000: `lsof -ti:3000 | xargs kill`

### TypeORM Synchronization Issues

**Error**: Schema synchronization problems

**Solution**:
- In development, TypeORM auto-syncs the schema
- For production, disable synchronize and use migrations
- Update `app.module.ts` TypeORM config: `synchronize: false`

## 📝 Development Guidelines

### Code Style
- Follow NestJS best practices
- Use TypeScript strict mode
- Implement proper error handling
- Use DTOs for validation
- Keep controllers thin, services fat

### Database
- Use transactions for multi-step operations
- Always use parameterized queries (TypeORM handles this)
- Index frequently queried columns
- Use soft deletes where appropriate

### Security
- Never commit `.env` file
- Use strong JWT secrets
- Hash passwords with bcrypt
- Validate all input with class-validator
- Implement rate limiting for production

## 📄 Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_HOST` | PostgreSQL host | localhost | Yes |
| `DATABASE_PORT` | PostgreSQL port | 5432 | Yes |
| `DATABASE_USER` | Database user | postgres | Yes |
| `DATABASE_PASSWORD` | Database password | postgres | Yes |
| `DATABASE_NAME` | Database name | bookkeeping | Yes |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `PORT` | Server port | 3000 | No |
| `GEMINI_API_KEY` | Google Gemini API key | - | No |

## 🧪 Testing

### Run Unit Tests

```bash
npm run test
```

### Run E2E Tests

```bash
npm run test:e2e
```

### Run Tests with Coverage

```bash
npm run test:cov
```

## 📞 API Documentation

Once the server is running, you can explore the API using tools like:

- **Postman** - Import the API endpoints
- **Insomnia** - REST client
- **curl** - Command line testing

Example login request:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@bookkeeping.com","password":"Demo123!"}'
```

## 🔄 Database Reset

To reset the database and start fresh:

```bash
# Stop the API server
# Drop and recreate the database
docker-compose down -v
docker-compose up -d

# Run migration and seeding again
npm run migrate:seed
```

## 📄 License

This project is proprietary software. All rights reserved.

## 👥 Contributors

Developed by the Inteletra team.

## 📞 Support

For issues or questions, please contact the development team or create an issue in the repository.

---

**Happy Coding! 🚀**
