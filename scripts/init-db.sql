-- Database initialization script for PostgreSQL
-- This script is run when the PostgreSQL container starts

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE registry_adapter'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'registry_adapter')\gexec

-- Connect to the database
\c registry_adapter;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schema
CREATE SCHEMA IF NOT EXISTS public;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE registry_adapter TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA public TO postgres;

-- Create indexes for better performance
-- These will be created by Prisma migrations, but we can add some custom ones here

-- Log the completion
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
END $$;
