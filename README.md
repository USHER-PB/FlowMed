# Cameroon Healthcare Marketplace Platform

A comprehensive healthcare marketplace platform designed specifically for Cameroon, featuring a unique 5-tier healthcare provider system that empowers doctors, nurses, certified workers, students, and volunteers to provide accessible healthcare services.

## 🌟 Key Features

### 🏥 5-Tier Healthcare Provider System (Unique!)
- **Tier 1**: Licensed Doctors (full medical services, prescriptions)
- **Tier 2**: Licensed Nurses (basic care, triage, supervision)
- **Tier 3**: Certified Healthcare Workers (unemployed graduates earning income)
- **Tier 4**: Medical/Nursing Students (supervised practice and mentorship)
- **Tier 5**: Community Health Volunteers (health education, referrals)

### 👥 User-Friendly Features
- **Patients**: Simple registration (no KYC), provider search, real-time queue tracking
- **Providers**: Tiered verification, availability management, diagnosis tools
- **Students**: Supervised consultations with mentor approval workflow
- **Medical Centers**: Multi-provider management dashboard

### 🚀 Technical Highlights
- **Real-time Queue Management**: WebSocket-powered position tracking
- **Bilingual Support**: French & English for Cameroon market
- **Offline-First PWA**: Works with unreliable internet connectivity
- **Encrypted Medical Records**: AES-256 encryption for sensitive data
- **Student Supervision**: Comprehensive mentorship and approval system
- **Audit Logging**: Complete compliance and security tracking

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 + TypeScript + TailwindCSS
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: MySQL 8.0
- **Cache/Real-time**: Redis + Socket.io
- **Authentication**: JWT with role-based access control
- **Testing**: Jest + React Testing Library (63 passing tests)
- **Deployment**: Docker + Docker Compose

## 📋 Prerequisites

Before running the application, ensure you have:

- **Node.js** 18+ installed
- **Docker** and **Docker Compose** installed
- **Git** for version control

## 🚀 Quick Start Guide

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd cameroon-healthcare-marketplace
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local with your configuration
nano .env.local  # or use your preferred editor
```

**Required Environment Variables:**
```env
# Database
DATABASE_URL="mysql://healthapp:healthapp123@localhost:3306/healthapp"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT & Encryption
JWT_SECRET="your-super-secret-jwt-key-here"
ENCRYPTION_KEY="your-32-character-encryption-key"

# Next.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"

# Email (Optional for development)
EMAIL_FROM="noreply@healthapp.com"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# SMS (Optional for development)
SMS_API_KEY="your-sms-api-key"
SMS_API_URL="https://api.sms-provider.com"
```

### 4. Start Database Services

```bash
# Start MySQL and Redis using Docker Compose
docker compose up -d

# Verify services are running
docker compose ps
```

You should see:
```
NAME                    IMAGE               STATUS
healthapp-db-1          mysql:8.0          Up
healthapp-redis-1       redis:7-alpine     Up
```

### 5. Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with test data
npm run db:seed
```

### 6. Start the Development Server

```bash
npm run dev
```

The application will be available at: **http://localhost:3000**

## 🧪 Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📱 Test User Accounts

After seeding, you can use these test accounts:

### Patients
- **Email**: `patient@test.com`
- **Password**: `password123`

### Providers
- **Tier 1 Doctor**: `doctor@test.com` / `password123`
- **Tier 2 Nurse**: `nurse@test.com` / `password123`
- **Tier 4 Student**: `student@test.com` / `password123`

### Admin
- **Email**: `admin@test.com`
- **Password**: `password123`

## 🌐 Application Structure

### Patient Portal (`/patient`)
- **Dashboard**: Appointment overview and quick actions
- **Providers**: Search and book appointments with any tier
- **Queue**: Real-time position tracking for appointments
- **History**: Medical records and diagnosis timeline

### Provider Portal (`/provider`)
- **Dashboard**: Queue management and patient overview
- **Availability**: Set working hours and schedule
- **Diagnoses**: Create encrypted medical records
- **Students** (for supervisors): Manage and mentor students

### Key API Endpoints
- `POST /api/auth/login` - User authentication
- `GET /api/providers/search` - Find providers by tier/specialty
- `POST /api/appointments` - Book appointments
- `GET /api/queue/[providerId]` - Real-time queue status
- `POST /api/diagnoses` - Create encrypted diagnoses

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run database migrations
npm run db:push         # Push schema changes
npm run db:seed         # Seed test data
npm run db:studio       # Open Prisma Studio

# Code Quality
npm run lint            # Run ESLint
npm run format          # Format code with Prettier
npm run format:check    # Check code formatting

# Testing
npm test                # Run tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
```

## 🐳 Docker Development

### Full Docker Setup (Alternative)

```bash
# Build and start all services
docker compose up --build

# Run database migrations inside container
docker compose exec app npm run db:migrate

# Seed the database
docker compose exec app npm run db:seed
```

### Individual Services

```bash
# Start only database services
docker compose up -d db redis

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## 🌍 Language Support

The app supports both French and English:

- **French**: Default language for Cameroon
- **English**: Secondary language
- **Language Switcher**: Available in top navigation
- **SMS Templates**: Localized for both languages

## 📊 Real-time Features

### Queue Management
- Patients see their position: "You are #3 in line"
- Estimated wait times based on provider tier
- Real-time updates via WebSocket
- Urgency flagging by nurses (Tier 2)

### WebSocket Events
- `queue_update` - Position changes
- `appointment_status` - Booking confirmations
- `diagnosis_ready` - Medical records available

## 🔒 Security Features

- **JWT Authentication** with secure HTTP-only cookies
- **Role-Based Access Control** (RBAC) for all endpoints
- **AES-256 Encryption** for medical records
- **Rate Limiting** to prevent abuse
- **Audit Logging** for all sensitive operations
- **Input Validation** with Zod schemas

## 🚨 Troubleshooting

### Common Issues

**1. Database Connection Error**
```bash
# Check if MySQL is running
docker compose ps

# Restart database
docker compose restart db

# Check logs
docker compose logs db
```

**2. Redis Connection Error**
```bash
# Restart Redis
docker compose restart redis

# Test Redis connection
docker compose exec redis redis-cli ping
```

**3. Port Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm run dev
```

**4. Prisma Client Issues**
```bash
# Regenerate Prisma client
npm run db:generate

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

### Performance Tips

1. **Enable Redis caching** for better performance
2. **Use database indexes** (already configured in schema)
3. **Optimize images** for mobile users in Cameroon
4. **Enable compression** in production deployment

## 📈 Monitoring

### Health Check
Visit `http://localhost:3000/api/health` to verify all services are running.

### Database Admin
```bash
# Open Prisma Studio
npm run db:studio
```
Access at: `http://localhost:5555`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section above
- Review the test files for usage examples

---

**Built with ❤️ for Cameroon's healthcare system**