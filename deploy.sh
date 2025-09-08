#!/bin/bash

# Local Deployment Script
# This script deploys the project to a local IC network

set -e  # Exit on any error

echo "🚀 Starting Local IC Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    print_error "dfx is not installed. Please install it first."
    print_status "Visit: https://internetcomputer.org/docs/current/developer-docs/getting-started/install/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install Node.js and npm first."
    exit 1
fi

print_status "Checking dfx status..."

# Check if dfx is running, if not start it
if ! dfx ping > /dev/null 2>&1; then
    print_status "Starting local IC network..."
    dfx start --clean --background
    
    # Wait a moment for dfx to fully start
    sleep 5
    
    # Verify it started
    if ! dfx ping > /dev/null 2>&1; then
        print_error "Failed to start local IC network"
        exit 1
    fi
    print_success "Local IC network started successfully"
else
    print_success "Local IC network is already running"
fi

# Install dependencies
print_status "Installing dependencies..."
npm install --legacy-peer-deps

# Generate candid declarations for backend only
print_status "Generating candid declarations..."
dfx generate backend

# Step 1: Deploy backend first
print_status "Deploying backend canister..."
dfx deploy backend --network local

# Step 2: Get backend canister ID and update environment
BACKEND_CANISTER_ID=$(dfx canister id backend --network local)
print_success "Backend deployed successfully!"
print_status "Backend Canister ID: $BACKEND_CANISTER_ID"

# Step 3: Create .env file with backend canister ID
print_status "Creating environment configuration..."
cat > .env << EOF
# Local Development Environment
DFX_NETWORK=local
VITE_DFX_NETWORK=local

# Canister IDs
CANISTER_ID_BACKEND=$BACKEND_CANISTER_ID
VITE_CANISTER_ID_BACKEND=$BACKEND_CANISTER_ID

# Host configuration
VITE_HOST=http://localhost:4943
EOF

print_success "Environment configuration created with backend canister ID"

# Step 4: Build frontend with backend canister ID available
print_status "Building frontend with backend canister ID..."
npm run build

# Step 5: Deploy frontend
print_status "Deploying frontend canister..."
dfx deploy frontend --network local

# Get frontend canister ID and update .env
FRONTEND_CANISTER_ID=$(dfx canister id frontend --network local)

# Update .env with frontend canister ID
print_status "Updating environment with frontend canister ID..."
cat > .env << EOF
# Local Development Environment
DFX_NETWORK=local
VITE_DFX_NETWORK=local

# Canister IDs
CANISTER_ID_BACKEND=$BACKEND_CANISTER_ID
CANISTER_ID_FRONTEND=$FRONTEND_CANISTER_ID
VITE_CANISTER_ID_BACKEND=$BACKEND_CANISTER_ID
VITE_CANISTER_ID_FRONTEND=$FRONTEND_CANISTER_ID

# Host configuration
VITE_HOST=http://localhost:4943
EOF

print_success "All canisters deployed successfully!"
print_status "Backend Canister ID: $BACKEND_CANISTER_ID"
print_status "Frontend Canister ID: $FRONTEND_CANISTER_ID"

print_success "🎉 Local deployment completed successfully!"

echo
echo "📋 Deployment Summary:"
echo "======================"
echo "Network: Local"
echo "Backend Canister: $BACKEND_CANISTER_ID"
echo "Frontend Canister: $FRONTEND_CANISTER_ID"
echo
echo "🌐 Access your application:"
echo "Frontend: http://$FRONTEND_CANISTER_ID.localhost:4943/"
echo "Backend (Candid): http://127.0.0.1:4943/?canisterId=be2us-64aaa-aaaaa-qaabq-cai&id=$BACKEND_CANISTER_ID"
echo
echo "💻 Development server: npm run dev (http://localhost:5173/)"
echo "🛑 Stop local network: dfx stop"
echo 