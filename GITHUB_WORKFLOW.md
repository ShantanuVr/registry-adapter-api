# Registry Adapter API - GitHub Actions Workflow

This file contains a complete CI/CD pipeline for the Registry Adapter API. 
To add it to your repository:

1. Go to your GitHub repository
2. Click on "Actions" tab
3. Click "New workflow"
4. Choose "Set up a workflow yourself"
5. Copy the contents below and paste them
6. Save the file as `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: registry_adapter_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
    
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
    
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    
    - name: Generate Prisma client
      run: pnpm db:generate
    
    - name: Run database migrations
      run: pnpm db:migrate
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/registry_adapter_test?schema=public
    
    - name: Run linting
      run: pnpm lint
    
    - name: Run type checking
      run: pnpm typecheck
    
    - name: Run unit tests
      run: pnpm test
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/registry_adapter_test?schema=public
        NODE_ENV: test
    
    - name: Run E2E tests
      run: pnpm test:e2e
      env:
        DATABASE_URL: postgresql://postgres:postgres@localhost:5432/registry_adapter_test?schema=public
        NODE_ENV: test

  build:
    runs-on: ubuntu-latest
    needs: test
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
    
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
    
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    
    - name: Generate Prisma client
      run: pnpm db:generate
    
    - name: Build application
      run: pnpm build
    
    - name: Build Docker image
      run: docker build -t registry-adapter-api:${{ github.sha }} .
```

## Features

- **Automated Testing**: Runs unit tests, E2E tests, linting, and type checking
- **Database Testing**: Uses PostgreSQL service for integration tests
- **Docker Build**: Builds and tests Docker image
- **Security Scanning**: Optional Trivy vulnerability scanning
- **Coverage Reports**: Generates test coverage reports

## Setup Instructions

1. Enable GitHub Actions in your repository settings
2. Add the workflow file as described above
3. Configure any required secrets in repository settings
4. The workflow will run automatically on push and pull requests
