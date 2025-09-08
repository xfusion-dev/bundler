#!/bin/bash

# IC Mainnet Deployment Script
# This script deploys the project to the Internet Computer mainnet

set -e  # Exit on any error

echo "🌐 Starting IC Mainnet Deployment..."

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

# Verify identity and wallet setup
print_status "Checking identity and wallet..."
IDENTITY=$(dfx identity whoami)
if [ "$IDENTITY" = "anonymous" ]; then
    print_error "You are using the anonymous identity. Please create or use a real identity:"
    print_status "dfx identity new <your-name>"
    print_status "dfx identity use <your-name>"
    exit 1
fi

print_success "Using identity: $IDENTITY"

# Check wallet balance (if available)
print_warning "⚠️  Make sure you have sufficient ICP for deployment!"
print_status "Check your cycles balance at: https://nns.ic0.app/"

# Prompt for confirmation
echo
read -p "🚨 You are about to deploy to IC MAINNET. This will consume ICP cycles. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Deployment cancelled."
    exit 0
fi

# Install dependencies
print_status "Installing dependencies..."
npm install --legacy-peer-deps

# Generate candid declarations for backend only
print_status "Generating candid declarations..."
dfx generate backend

# Create wallet if it doesn't exist
if ! dfx canister id __Pocketic > /dev/null 2>&1; then
    print_status "Creating cycles wallet..."
    dfx wallet create --network ic
fi

# Step 1: Deploy backend to IC mainnet first
print_status "Deploying backend canister to IC mainnet..."
print_warning "This may take several minutes and will consume cycles..."
dfx deploy backend --network ic --with-cycles 1000000000000

# Step 2: Get backend canister ID and create environment
BACKEND_CANISTER_ID=$(dfx canister id backend --network ic)
print_success "Backend deployed to IC mainnet successfully!"
print_status "Backend Canister ID: $BACKEND_CANISTER_ID"

# Step 3: Create .env.production file with backend canister ID
print_status "Creating production environment configuration..."
cat > .env.production << EOF
# Production Environment (IC Mainnet)
DFX_NETWORK=ic
VITE_DFX_NETWORK=ic

# Canister IDs
CANISTER_ID_BACKEND=$BACKEND_CANISTER_ID
VITE_CANISTER_ID_BACKEND=$BACKEND_CANISTER_ID

# Host configuration
VITE_HOST=https://ic0.app
EOF

# Step 4: Build frontend with backend canister ID available
print_status "Building frontend for production with backend canister ID..."
cp .env.production .env
npm run build

# Step 5: Deploy frontend to IC mainnet
print_status "Deploying frontend canister to IC mainnet..."
dfx deploy frontend --network ic

# Get frontend canister ID and update environment
FRONTEND_CANISTER_ID=$(dfx canister id frontend --network ic)

# Update .env.production with frontend canister ID
print_status "Updating production environment with frontend canister ID..."
cat > .env.production << EOF
# Production Environment (IC Mainnet)
DFX_NETWORK=ic
VITE_DFX_NETWORK=ic

# Canister IDs
CANISTER_ID_BACKEND=$BACKEND_CANISTER_ID
CANISTER_ID_FRONTEND=$FRONTEND_CANISTER_ID
VITE_CANISTER_ID_BACKEND=$BACKEND_CANISTER_ID
VITE_CANISTER_ID_FRONTEND=$FRONTEND_CANISTER_ID

# Host configuration
VITE_HOST=https://ic0.app
EOF

print_success "All canisters deployed to IC mainnet successfully!"
print_status "Backend Canister ID: $BACKEND_CANISTER_ID"
print_status "Frontend Canister ID: $FRONTEND_CANISTER_ID"

print_success "🎉 IC Mainnet deployment completed successfully!"

echo
echo "📋 Deployment Summary:"
echo "======================"
echo "Network: IC Mainnet"
echo "Backend Canister: $BACKEND_CANISTER_ID"
echo "Frontend Canister: $FRONTEND_CANISTER_ID"
echo
echo "🌐 Access your application:"
echo "Frontend: https://$FRONTEND_CANISTER_ID.ic0.app/"
echo "Backend (Candid): https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.ic0.app/?id=$BACKEND_CANISTER_ID"
echo
echo "📱 Share your app:"
echo "https://$FRONTEND_CANISTER_ID.ic0.app/"
echo
echo "💡 Useful commands:"
echo "dfx canister status --all --network ic  # Check canister status"
echo "dfx canister top-up <canister-id> --amount <amount> --network ic  # Add cycles"
echo "dfx wallet balance --network ic  # Check wallet balance"
echo
print_warning "Remember to monitor your cycles consumption at: https://nns.ic0.app/"
echo 