# Online Corporate Travel Desk - Backend API

A comprehensive MERN stack backend for managing corporate travel bookings with integrated TBO API for flights and hotels.

## 🚀 Features

- **Corporate Onboarding**: Complete KYC and verification system
- **SSO Integration**: Google Workspace, Microsoft 365, Zoho
- **Dual Payment Models**: Prepaid (Wallet) and Postpaid (Credit)
- **Flight & Hotel Booking**: Integrated with TBO API
- **Approval Workflow**: Multi-level approval system
- **Role-based Access**: Employee, Travel Admin, Manager, Super Admin
- **Comprehensive Dashboards**: Real-time analytics and reporting
- **Offline Vouchers**: Manual voucher creation capability
- **Wallet Management**: Recharge and transaction tracking
- **Credit Monitoring**: Automated alerts and limits
- **PDF Generation**: Automated voucher and invoice generation

## 📋 Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 5.0
- Redis (optional, for caching)
- NPM >= 9.0.0

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env
```

4. **Configure environment variables** (see .env.example)

5. **Start the server**

Development:
```bash
npm run dev
```

Production:
```bash
npm start
```

With PM2:
```bash
npm run pm2:start
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Route controllers
│   ├── middlewares/     # Custom middlewares
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── utils/           # Utility functions
│   ├── validations/     # Input validations
│   ├── jobs/            # Cron jobs
│   └── app.js           # App entry point
├── uploads/             # File uploads
├── logs/                # Application logs
└── tests/               # Test files
```

## 🔑 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login with credentials
- `GET /api/v1/auth/google` - Google OAuth
- `GET /api/v1/auth/microsoft` - Microsoft OAuth
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/logout` - Logout

### Corporate Management
- `POST /api/v1/corporate/onboard` - Onboard new corporate
- `GET /api/v1/corporate` - Get all corporates
- `GET /api/v1/corporate/:id` - Get corporate details
- `PUT /api/v1/corporate/:id` - Update corporate
- `PUT /api/v1/corporate/:id/approve` - Approve onboarding

### Bookings
- `POST /api/v1/bookings` - Create booking request
- `GET /api/v1/bookings` - Get all bookings
- `GET /api/v1/bookings/:id` - Get booking details
- `POST /api/v1/bookings/:id/confirm` - Confirm booking
- `POST /api/v1/bookings/:id/cancel` - Cancel booking

### Flights
- `POST /api/v1/flights/search` - Search flights
- `POST /api/v1/flights/fare-quote` - Get fare quote
- `POST /api/v1/flights/fare-rules` - Get fare rules

### Hotels
- `POST /api/v1/hotels/search` - Search hotels
- `GET /api/v1/hotels/:hotelCode` - Get hotel details

### Approvals
- `GET /api/v1/approvals` - Get approval requests
- `GET /api/v1/approvals/:id` - Get approval details
- `POST /api/v1/approvals/:id/approve` - Approve request
- `POST /api/v1/approvals/:id/reject` - Reject request

### Dashboard
- `GET /api/v1/dashboard/employee` - Employee dashboard
- `GET /api/v1/dashboard/travel-admin` - Travel admin dashboard
- `GET /api/v1/dashboard/super-admin` - Super admin dashboard

### Wallet
- `GET /api/v1/wallet/balance` - Get wallet balance
- `GET /api/v1/wallet/transactions` - Get transactions
- `POST /api/v1/wallet/recharge` - Initiate recharge
- `POST /api/v1/wallet/verify-payment` - Verify payment

### Users
- `POST /api/v1/users` - Create user
- `GET /api/v1/users` - Get all users
- `GET /api/v1/users/:id` - Get user details
- `PUT /api/v1/users/:id` - Update user
- `PUT /api/v1/users/profile` - Update own profile

### Vouchers
- `POST /api/v1/vouchers` - Create offline voucher
- `GET /api/v1/vouchers` - Get all vouchers
- `GET /api/v1/vouchers/:id` - Get voucher details

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### SSO Flow
1. User initiates SSO login
2. Redirects to OAuth provider
3. Provider validates and returns to callback
4. System creates/updates user
5. Returns JWT token

## 👥 User Roles

- **Employee**: Can create bookings, view own data
- **Travel Admin**: Manage corporate users, approve bookings, view reports
- **Manager**: Approve team member bookings
- **Super Admin**: Manage all corporates, system-wide access

## 💳 Payment Flow

### Prepaid Corporate
1. Admin recharges wallet
2. Booking amount deducted from wallet
3. Transaction recorded

### Postpaid Corporate
1. Booking created
2. Amount added to ledger
3. Credit limit checked
4. Invoice generated on billing cycle

## 📊 TBO API Integration

### Flight Booking Flow
1. Authenticate with TBO
2. Search flights
3. Get fare quote
4. Book ticket
5. Generate e-ticket

### Hotel Booking Flow
1. Search hotels
2. Get hotel details
3. Block room
4. Confirm booking
5. Generate voucher

## 🔔 Notifications

- Email notifications for:
  - Booking confirmations
  - Approval requests
  - Approval status updates
  - Credit limit alerts
  - Travel reminders

## 📈 Monitoring & Logging

- Winston logger with daily rotation
- Separate logs for errors, info, and exceptions
- PM2 for process management
- Health check endpoint: `GET /health`

## 🛡️ Security Features

- Helmet.js for HTTP headers
- Rate limiting
- Input sanitization
- MongoDB injection prevention
- JWT expiration
- Account lockout after failed attempts
- CORS configuration

## 🧪 Testing

Run tests:
```bash
npm test
```

Run with coverage:
```bash
npm run test:coverage
```

## 🚀 Deployment

### Using PM2
```bash
npm run pm2:start
```

### Environment Variables
Ensure all production environment variables are set:
- Database URIs
- API keys (TBO, Razorpay)
- OAuth credentials
- SMTP settings

### Production Checklist
- [ ] Set NODE_ENV=production
- [ ] Configure MongoDB replica set
- [ ] Set up Redis for caching
- [ ] Configure SSL/TLS
- [ ] Set up monitoring (PM2, New Relic)
- [ ] Configure backup strategy
- [ ] Set up CDN for static files
- [ ] Enable rate limiting
- [ ] Configure log rotation

## 📝 Cron Jobs

- **Credit Alerts**: Runs every 6 hours, checks credit utilization
- **Booking Reminders**: Runs daily at 8 AM, sends upcoming travel reminders

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Write tests
4. Submit pull request

## 📄 License

MIT

## 📞 Support

For support, email support@traveldesk.com

## 🔄 Version History

- **v1.0.0** (2024): Initial release
  - Corporate onboarding
  - SSO integration
  - Flight & hotel booking
  - Approval workflow
  - Wallet & ledger management

---

**Developed with ❤️ for Corporate Travel Management**