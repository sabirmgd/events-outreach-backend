#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Script Configuration ---
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &>/dev/null && pwd)/.."
ENV_FILE="$PROJECT_DIR/.env"

# --- Helper Functions ---
print_info() {
  echo "INFO: $1"
}

print_error() {
  echo "ERROR: $1" >&2
  exit 1
}

# --- Pre-flight Checks ---
# 1. Check for .env file
if [ ! -f "$ENV_FILE" ]; then
  print_error ".env file not found at '$ENV_FILE'. Please create it based on the provided template."
fi

# Load environment variables from .env file
print_info "Loading environment variables from .env file..."
set -a # automatically export all variables
source "$ENV_FILE"
set +a

# 2. Check for Docker and Docker Compose
if ! command -v docker &> /dev/null; then
  print_error "Docker could not be found. Please install Docker."
fi

if ! command -v docker-compose &> /dev/null; then
  print_error "Docker Compose could not be found. Please install Docker Compose."
fi

# --- Main Execution ---
print_info "Navigating to project directory: $PROJECT_DIR"
cd "$PROJECT_DIR"

print_info "Starting PostgreSQL container via Docker Compose..."
docker-compose up -d postgres redis

print_info "Waiting for PostgreSQL to be ready..."
# This is a simple loop; a more robust solution might use pg_isready
until docker-compose exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" -q; do
  print_info "PostgreSQL is unavailable - sleeping"
  sleep 1
done


print_info "Starting NestJS application in development mode..."
npm run start:dev 