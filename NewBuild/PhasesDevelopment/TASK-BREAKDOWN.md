# AiDeepRef AI Agent Task Breakdown

**Purpose**: Executable task list for AI agents with specific commands and file paths
**Format**: Copy-paste ready for immediate execution

---

## Quick Start Commands for Each Team

### Frontend Team Quick Start
```bash
# Initialize your workspace
cd /home/user/AiDeepRef
git checkout -b frontend/phase-0-setup

# Setup React application
cd apps/web
npm install
npm run dev

# Your first tasks (Phase 0):
# 1. Create UI component library structure
mkdir -p src/components/{atoms,molecules,organisms,templates}
mkdir -p src/styles/{themes,utilities,components}
mkdir -p src/hooks
mkdir -p src/utils

# 2. Setup Storybook for component development
npx storybook@latest init --type react_vite
```

### Backend Team Quick Start
```bash
# Initialize your workspace
cd /home/user/AiDeepRef
git checkout -b backend/phase-0-setup

# Setup NestJS application
cd apps/api
npm install
npm run start:dev

# Your first tasks (Phase 0):
# 1. Create modular structure
mkdir -p src/modules/{auth,users,references,notifications}
mkdir -p src/common/{filters,guards,interceptors,pipes}
mkdir -p src/config

# 2. Setup database connection
touch src/config/database.config.ts
touch src/config/app.config.ts
```

### API Team Quick Start
```bash
# Initialize your workspace
cd /home/user/AiDeepRef
git checkout -b api/phase-0-contracts

# Create OpenAPI specifications
mkdir -p api/openapi/{schemas,paths,examples}

# Your first task: Define core API contracts
cat > api/openapi/auth.yaml << 'EOF'
openapi: 3.0.0
info:
  title: AiDeepRef Auth API
  version: 1.0.0
paths:
  /auth/login:
    post:
      summary: User login
      # ... complete specification
EOF
```

### AI Layer Team Quick Start
```bash
# Initialize your workspace
cd /home/user/AiDeepRef
git checkout -b ai/phase-0-setup

# Setup Python AI service
mkdir -p services/ai
cd services/ai
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn langchain openai

# Your first task: Create AI service structure
mkdir -p src/{models,prompts,services,utils}
touch src/main.py
```

### Mobile Team Quick Start
```bash
# Initialize your workspace
cd /home/user/AiDeepRef
git checkout -b mobile/phase-0-setup

# iOS Setup
mkdir -p apps/ios/AiDeepRef
cd apps/ios
# Initialize Xcode project via command or Xcode GUI

# Android Setup
mkdir -p apps/android
cd apps/android
# Initialize with Android Studio or gradle init
```

### DevSecOps Team Quick Start
```bash
# Initialize your workspace
cd /home/user/AiDeepRef
git checkout -b devops/phase-0-infrastructure

# Setup Infrastructure as Code
mkdir -p infrastructure/{terraform,kubernetes,docker}
cd infrastructure/terraform

# Your first task: Create Azure resources
cat > main.tf << 'EOF'
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
  }
}

provider "azurerm" {
  features {}
}
EOF
```

---

## Phase 0: Specific Tasks (Week 1-2)

### DAY 1 TASKS

#### DevSecOps Team - Infrastructure Foundation
```bash
# Task 1: Create Azure Resource Group (2 hours)
cd /home/user/AiDeepRef/infrastructure/terraform

cat > resource_group.tf << 'EOF'
resource "azurerm_resource_group" "main" {
  name     = "rg-aideepref-prod"
  location = "East US"

  tags = {
    environment = "production"
    project     = "aideepref"
  }
}
EOF

# Task 2: Setup AKS Cluster (4 hours)
cat > aks_cluster.tf << 'EOF'
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-aideepref-prod"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "aideepref"

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D2_v2"
  }

  identity {
    type = "SystemAssigned"
  }
}
EOF

terraform init
terraform plan
terraform apply
```

#### API Team - Define Core Contracts
```bash
# Task 1: Authentication API Contract (3 hours)
cd /home/user/AiDeepRef/api/openapi

cat > auth.yaml << 'EOF'
openapi: 3.0.0
info:
  title: Authentication API
  version: 1.0.0
servers:
  - url: https://api.aideepref.com/v1
paths:
  /auth/register:
    post:
      summary: Register new user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RegisterRequest'
      responses:
        201:
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
  /auth/login:
    post:
      summary: User login
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LoginRequest'
      responses:
        200:
          description: Login successful
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/AuthResponse'
components:
  schemas:
    RegisterRequest:
      type: object
      required:
        - email
        - password
        - firstName
        - lastName
      properties:
        email:
          type: string
          format: email
        password:
          type: string
          minLength: 8
        firstName:
          type: string
        lastName:
          type: string
    LoginRequest:
      type: object
      required:
        - email
        - password
      properties:
        email:
          type: string
          format: email
        password:
          type: string
    AuthResponse:
      type: object
      properties:
        accessToken:
          type: string
        refreshToken:
          type: string
        user:
          $ref: '#/components/schemas/User'
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
        firstName:
          type: string
        lastName:
          type: string
        role:
          type: string
          enum: [seeker, referrer, employer, admin]
EOF

# Validate the OpenAPI spec
npx @openapitools/openapi-generator-cli validate -i auth.yaml
```

#### Metadata Team - Database Schema Design
```bash
# Task 1: Create Core Database Schema (4 hours)
cd /home/user/AiDeepRef/database/schema

# Users table
cat > 001_create_users.sql << 'EOF'
-- Users table with zero-knowledge architecture support
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,

    -- Profile information (encrypted)
    first_name_encrypted TEXT,
    last_name_encrypted TEXT,
    phone_encrypted TEXT,

    -- Role and permissions
    role VARCHAR(50) NOT NULL DEFAULT 'seeker',
    permissions JSONB DEFAULT '[]'::jsonb,

    -- Account status
    status VARCHAR(50) DEFAULT 'active',
    last_login TIMESTAMP,
    login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    -- Indexes
    INDEX idx_users_email (email),
    INDEX idx_users_status (status),
    INDEX idx_users_role (role)
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
EOF

# References table
cat > 002_create_references.sql << 'EOF'
CREATE TABLE references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seeker_id UUID NOT NULL REFERENCES users(id),

    -- Reference metadata
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    role VARCHAR(255),
    start_date DATE,
    end_date DATE,

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    workflow_state JSONB DEFAULT '{}'::jsonb,

    -- AI-generated content
    ai_questions JSONB,
    ai_insights JSONB,
    reference_score DECIMAL(3,2),

    -- Blockchain verification
    blockchain_tx_hash VARCHAR(255),
    blockchain_verified BOOLEAN DEFAULT FALSE,

    -- Timestamps
    requested_at TIMESTAMP,
    completed_at TIMESTAMP,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_references_seeker (seeker_id),
    INDEX idx_references_status (status),
    INDEX idx_references_created (created_at DESC)
);
EOF

# Referrers table
cat > 003_create_referrers.sql << 'EOF'
CREATE TABLE referrers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_id UUID NOT NULL REFERENCES references(id),

    -- Referrer information
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    title VARCHAR(255),
    company VARCHAR(255),
    relationship VARCHAR(100),

    -- Response tracking
    invite_token VARCHAR(255) UNIQUE,
    invite_sent_at TIMESTAMP,
    response_started_at TIMESTAMP,
    response_completed_at TIMESTAMP,

    -- Response content (encrypted)
    response_type VARCHAR(50), -- text, audio, video
    response_content_encrypted TEXT,
    response_metadata JSONB,

    -- Verification
    email_verified BOOLEAN DEFAULT FALSE,
    identity_verified BOOLEAN DEFAULT FALSE,
    deepfake_check_passed BOOLEAN,

    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    reminder_count INT DEFAULT 0,
    last_reminder_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_referrers_reference (reference_id),
    INDEX idx_referrers_token (invite_token),
    INDEX idx_referrers_email (email)
);
EOF
```

### DAY 2 TASKS

#### Frontend Team - React Project Structure
```bash
# Task 1: Setup Component Library (4 hours)
cd /home/user/AiDeepRef/apps/web/src

# Create atomic design structure
mkdir -p components/atoms
cat > components/atoms/Button.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50';

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    ghost: 'hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg'
  };

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </>
      ) : children}
    </button>
  );
};
EOF

# Create Input component
cat > components/atoms/Input.tsx << 'EOF'
import React from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'block w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500',
            error ? 'border-red-500' : 'border-gray-300',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
EOF
```

#### Backend Team - NestJS Module Structure
```bash
# Task 1: Create Auth Module (4 hours)
cd /home/user/AiDeepRef/apps/api/src

# Create auth module structure
nest g module auth
nest g controller auth
nest g service auth

# Implement JWT Strategy
cat > auth/jwt.strategy.ts << 'EOF'
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
EOF

# Create Auth Service
cat > auth/auth.service.ts << 'EOF'
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(password, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user,
    };
  }

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      passwordHash: hashedPassword,
    });

    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, { expiresIn: '7d' }),
      user,
    };
  }
}
EOF
```

---

## Phase 1: Specific Tasks (Week 3-4)

### DAY 8-10 TASKS

#### Backend Team - User CRUD Operations
```bash
# Task 1: Implement User Service (6 hours)
cd /home/user/AiDeepRef/apps/api/src/users

cat > users.service.ts << 'EOF'
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto } from './dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return await this.usersRepository.save(user);
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;
    const query = this.usersRepository.createQueryBuilder('user');

    if (search) {
      query.where(
        'user.email LIKE :search OR user.firstName LIKE :search OR user.lastName LIKE :search',
        { search: `%${search}%` }
      );
    }

    const [users, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, updateUserDto);
    return await this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);
    user.deletedAt = new Date();
    await this.usersRepository.save(user);
  }
}
EOF
```

#### Frontend Team - Authentication Flow UI
```bash
# Task 1: Create Login Form (4 hours)
cd /home/user/AiDeepRef/apps/web/src/features/auth

cat > LoginForm.tsx << 'EOF'
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Input
        label="Email"
        type="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register('password')}
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center">
          <input type="checkbox" className="mr-2" />
          <span className="text-sm text-gray-600">Remember me</span>
        </label>

        <a href="/forgot-password" className="text-sm text-blue-600 hover:underline">
          Forgot password?
        </a>
      </div>

      <Button type="submit" loading={loading} className="w-full">
        Sign In
      </Button>

      <div className="text-center">
        <span className="text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </span>
      </div>
    </form>
  );
};
EOF
```

---

## Continuous Integration Commands

### For All Teams - Daily Workflow
```bash
# Morning: Start your work
git checkout main
git pull origin main
git checkout -b feature/your-feature-name

# During development: Test frequently
npm test -- --watch
npm run lint
npm run type-check

# Before commit: Run all checks
npm run test
npm run lint:fix
npm run build

# Commit with conventional commits
git add .
git commit -m "feat(module): add new feature"

# Push and create PR
git push -u origin feature/your-feature-name
gh pr create --title "feat: Add new feature" --body "Description of changes"

# After PR approval: Merge
gh pr merge --squash --delete-branch
```

### Integration Testing Between Teams
```bash
# Frontend testing against Backend
cd /home/user/AiDeepRef/apps/web
npm run test:integration

# Backend testing with database
cd /home/user/AiDeepRef/apps/api
docker-compose up -d postgres redis
npm run test:e2e

# Mobile testing against API
cd /home/user/AiDeepRef/apps/ios
xcodebuild test -scheme AiDeepRef -destination 'platform=iOS Simulator,name=iPhone 14'
```

---

## Monitoring Progress

### Daily Status Check Commands
```bash
# Check overall project status
git log --oneline --graph --all -20

# Check test coverage
npm run test:coverage

# Check build status
npm run build:all

# Check for security issues
npm audit
npm run security:check

# Check code quality
npm run lint
npm run sonar
```

### Team Sync Points
```yaml
daily_sync:
  time: "09:00 UTC"
  duration: 15 minutes
  format:
    - What did you complete yesterday?
    - What will you work on today?
    - Any blockers?

weekly_demo:
  time: "Friday 15:00 UTC"
  duration: 1 hour
  format:
    - Demo completed features
    - Review metrics
    - Plan next week
```

---

## Emergency Procedures

### When Blocked
```bash
# 1. Document the blocker
echo "BLOCKER: Description" >> BLOCKERS.md
git add BLOCKERS.md
git commit -m "doc: add blocker for team review"
git push

# 2. Switch to mock implementation
# Create mock service while waiting
mkdir -p mocks
cat > mocks/blocked-service.js << 'EOF'
// Mock implementation for unblocked development
module.exports = {
  mockFunction: () => Promise.resolve({ data: 'mock' })
};
EOF

# 3. Continue with other tasks
git checkout -b feature/alternative-task
```

### Rollback Procedures
```bash
# If deployment fails
kubectl rollout undo deployment/api-deployment
kubectl rollout status deployment/api-deployment

# If database migration fails
npm run migration:revert

# If feature breaks production
git revert HEAD
git push origin main
```

---

This task breakdown provides specific, executable commands that AI agents can run immediately. Each team has clear starting points and can work in parallel using the provided mock interfaces and contracts.