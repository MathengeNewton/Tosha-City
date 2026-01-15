# church360 - Contribution Guide

## Technical Architecture Overview

### Core Principles
1. **Modular Design**: Clear separation of concerns with independent, reusable modules
2. **Scalability**: Built to handle growth in users and data volume
3. **Security**: Robust authentication and authorization at every level
4. **Offline-First**: Mobile app functions without continuous connectivity
5. **Maintainability**: Clean, documented, and tested code

## Module Structure

### 1. Shared Module (`@shared/`)
Core functionalities used across the application

```
shared/
├── auth/               # Authentication & authorization
│   ├── guards/         # Route guards
│   ├── decorators/     # Custom decorators
│   └── strategies/     # Auth strategies
├── common/             # Common utilities
│   ├── filters/       # Exception filters
│   ├── interceptors/  # Request/response interceptors
│   └── pipes/         # Validation pipes
└── entities/          # Shared database entities
```

### 2. Core Module (`@core/`)
Application-wide services and configurations

```
core/
├── config/            # Configuration management
├── database/          # Database connections & migrations
├── logger/            # Centralized logging
└── utils/             # Helper functions
```

### 3. Feature Modules
Independent business domains

#### 3.1 Users Module (`users/`)
- User management
- Role-based access control
- Profile management

#### 3.2 Animals Module (`animals/`)
- Animal registration & management
- Microchip/ID generation
- Health tracking

#### 3.3 Owners Module (`owners/`)
- Owner registration
- Animal ownership management
- Contact information

#### 3.4 Welfare Module (`welfare/`)
- 5 Freedoms assessment
- Welfare scoring
- Historical tracking

#### 3.5 Veterinary Module (`veterinary/`)
- Treatment records
- Medication tracking
- Follow-up scheduling

#### 3.6 Incidents Module (`incidents/`)
- Abuse/theft reporting
- Case management
- Resolution tracking

## Database Schema

### Key Entities

1. **User**
   - id (UUID)
   - email (unique)
   - password (hashed)
   - roles (array of roles)
   - regionId (FK to Regions)

2. **Animal**
   - id (UUID)
   - microchipNumber (format: BR{6}D/H)
   - type (Donkey/Horse)
   - breed
   - gender
   - dateOfBirth
   - ownerId (FK to Owners)
   - regionId (FK to Regions)

3. **WelfareAssessment**
   - id (UUID)
   - animalId (FK to Animals)
   - assessorId (FK to Users)
   - freedomScores (JSON)
   - overallScore
   - notes

4. **VeterinaryVisit**
   - id (UUID)
   - animalId (FK to Animals)
   - vetId (FK to Users)
   - diagnosis
   - treatment
   - followUpDate

## Authentication & Authorization

### Roles
1. **SUPER_ADMIN**: Full system access
2. **ADMIN**: Organization-level administration
3. **VET**: Veterinary staff
4. **FIELD_AGENT**: Field operations
5. **OWNER**: Animal owners (mobile app users)

### Permission System
- Route-level guards for role-based access
- Resource ownership checks
- Activity logging

## API Design

### Base URL
`/api/v1`

### Response Format
```typescript
{
  "success": boolean,
  "data": any,
  "message": string,
  "meta": {
    "page": number,
    "limit": number,
    "total": number
  }
}
```

### Error Handling
```typescript
{
  "statusCode": number,
  "message": string,
  "error": string,
  "timestamp": string,
  "path": string
}
```

## Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (for caching)
- Docker (optional)

### Installation
```bash
# Clone repository
git clone
cd church360

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run start:dev
```

## Testing

### Running Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Code Style
- Follow NestJS best practices
- Use TypeScript strict mode
- Write comprehensive JSDoc comments
- Follow commit message conventions (Conventional Commits)

## Pull Request Process
1. Fork the repository
2. Create a feature branch (`feature/your-feature`)
3. Commit your changes
4. Push to the branch
5. Open a pull request with a clear description

## Deployment

### Environments
- **Development**: `dev.church360.app`
- **Staging**: `staging.church360.app`
- **Production**: `app.church360.app`

### CI/CD
- Automated testing on every push
- Staging deployment on merge to `develop`
- Production deployment on tag creation

## Mobile App Integration
- Offline-first data synchronization
- Background sync when online
- Secure local storage for sensitive data

## Security Considerations
- Data encryption at rest and in transit
- Regular security audits
- Dependency updates
- Rate limiting
- Input validation

## Support
For questions or issues, please open an issue in the repository or contact the development team.

---
*Last updated: 2025-07-27*
