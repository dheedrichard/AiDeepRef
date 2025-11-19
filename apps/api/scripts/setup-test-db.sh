#!/bin/bash

# Setup Test Database Script
# This script creates the test database for integration tests

set -e

echo "Setting up test database..."

# Database credentials
DB_NAME="deepref_test"
DB_USER="deepref_test"
DB_PASSWORD="test_password"

# Check if PostgreSQL is running
if ! pg_isready -q; then
    echo "Error: PostgreSQL is not running"
    exit 1
fi

# Drop database if it exists
echo "Dropping existing test database (if any)..."
psql -U postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true

# Drop user if exists
echo "Dropping existing test user (if any)..."
psql -U postgres -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true

# Create user
echo "Creating test database user..."
psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || {
    echo "Warning: User might already exist"
}

# Create database
echo "Creating test database..."
psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || {
    echo "Error: Failed to create database"
    exit 1
}

# Grant privileges
echo "Granting privileges..."
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

echo "✓ Test database setup complete!"
echo ""
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Password: $DB_PASSWORD"
echo ""
echo "You can now run: npm run test:e2e"
