# XFusion Bundler

Decentralized token portfolio bundling platform on the Internet Computer. Create, trade, and manage custom token bundles as single tradeable assets with AI-powered generation.

## Overview

XFusion allows users to create custom token bundles (portfolios) that are represented by ICRC-151 NAV (Net Asset Value) tokens. Each bundle tracks the underlying portfolio value and can be traded as a single asset.

**Key Features:**
- 🎯 Create custom multi-asset bundles
- 🤖 AI-powered bundle generation
- 💱 Buy/sell bundles as single tokens
- 📊 Real-time NAV calculation
- 🔐 Decentralized execution on Internet Computer
- 💰 Automatic fee distribution
- 🎁 Points reward system

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (React)                        │
│               https://xfusion.finance                    │
│  - Bundle creation UI                                    │
│  - Portfolio management                                  │
│  - Trading interface                                     │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │      AI Bundler API            │
        │  https://ai-api.xfusion.finance│
        │  - GPT-4 bundle generation     │
        │  - Strategy validation         │
        └────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Backend Canister (Rust)                     │
│           dk3fi-vyaaa-aaaae-qfycq-cai                   │
│  - Bundle management                                     │
│  - Quote execution                                       │
│  - NAV calculation                                       │
│  - Holdings tracking                                     │
└─────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Coordinator  │    │   XFusion    │    │  ICRC-2 &    │
│   Service    │    │    Oracle    │    │  ICRC-151    │
│  (Off-chain) │    │ (zutfo-...)  │    │   Ledgers    │
└──────────────┘    └──────────────┘    └──────────────┘
```

## Project Structure

```
xfusion-bundler/
├── src/
│   ├── backend/                 # Rust backend canister
│   │   ├── src/
│   │   │   ├── lib.rs          # Main entry point & API
│   │   │   ├── bundle_manager.rs    # Bundle CRUD & activation
│   │   │   ├── quote_manager.rs     # Quote validation & execution
│   │   │   ├── buy_flow.rs          # Buy orchestration
│   │   │   ├── sell_flow.rs         # Sell orchestration
│   │   │   ├── nav_calculator.rs    # NAV computation
│   │   │   ├── holdings_tracker.rs  # Asset holdings
│   │   │   ├── oracle.rs            # Price oracle integration
│   │   │   ├── icrc2_client.rs      # ICRC-2 token operations
│   │   │   ├── icrc151_client.rs    # ICRC-151 multi-token ops
│   │   │   ├── transaction_manager.rs   # Transaction states
│   │   │   ├── asset_registry.rs    # Asset management
│   │   │   ├── admin.rs             # Admin functions
│   │   │   ├── memory.rs            # Stable storage
│   │   │   ├── types.rs             # Type definitions
│   │   │   └── ...
│   │   ├── Cargo.toml          # Rust dependencies
│   │   └── README.md           # Backend documentation
│   │
│   ├── frontend/               # React TypeScript frontend
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── Home.tsx            # Landing page
│   │   │   │   ├── Portfolio.tsx       # User portfolio view
│   │   │   │   ├── BundleBuilder.tsx   # Create bundles (with AI)
│   │   │   │   ├── BundleDetails.tsx   # Bundle info & trading
│   │   │   │   └── Discover.tsx        # Browse bundles
│   │   │   ├── components/
│   │   │   │   ├── ui/             # Reusable UI components
│   │   │   │   └── layout/         # Layout components
│   │   │   ├── lib/
│   │   │   │   ├── ic-service.ts   # Backend canister client
│   │   │   │   ├── ai-service.ts   # AI API client
│   │   │   │   └── auth.ts         # IC authentication
│   │   │   ├── hooks/          # React hooks
│   │   │   ├── App.tsx         # App root
│   │   │   └── main.tsx        # Entry point
│   │   ├── dist/               # Build output (deployed as asset canister)
│   │   ├── vite.config.ts      # Vite configuration
│   │   └── tailwind.config.js  # Tailwind CSS config
│   │
│   └── ai-bundler-api/         # AI bundle generator (NestJS)
│       ├── src/
│       │   ├── ai/
│       │   │   ├── ai.controller.ts    # API endpoints
│       │   │   ├── ai.service.ts       # OpenAI GPT-4 integration
│       │   │   └── dto/                # Request/response types
│       │   └── main.ts         # NestJS app entry
│       ├── Dockerfile          # Docker deployment
│       ├── .env                # Environment variables
│       └── package.json        # Node dependencies
│
├── deploy.sh                   # Local deployment script
├── deploy-ic.sh                # Mainnet deployment script
├── dfx.json                    # DFX canister configuration
├── package.json                # Frontend dependencies
├── tsconfig.json               # TypeScript config
└── README.md                   # This file
```

## Components

### Backend Canister (`src/backend/`)

Rust smart contract on Internet Computer handling all core logic.

**Main Responsibilities:**
- Bundle creation, activation, and management
- Quote signature verification and execution
- Asset deposit and NAV token minting (Buy flow)
- NAV token redemption and asset withdrawal (Sell flow)
- Real-time NAV calculation from oracle prices
- Holdings tracking and fee distribution
- Admin controls and platform management

**Key Modules:**
- `bundle_manager.rs` - Bundle lifecycle (create, activate, deactivate)
- `quote_manager.rs` - Quote validation and transaction initiation
- `buy_flow.rs` - Asset deposit orchestration
- `sell_flow.rs` - Asset redemption orchestration
- `nav_calculator.rs` - Net asset value computation
- `oracle.rs` - Price data integration

**Documentation:** See [src/backend/README.md](src/backend/README.md) for detailed architecture

**Canister ID (mainnet):** `dk3fi-vyaaa-aaaae-qfycq-cai`

### Frontend App (`src/frontend/`)

React + TypeScript web application with Tailwind CSS.

**Main Features:**
- 🏠 **Home** - Landing page and platform overview
- 🔍 **Discover** - Browse all active bundles
- 📊 **Portfolio** - View your bundles and positions
- ✨ **Bundle Builder** - Create custom bundles (with AI)
- 💱 **Bundle Details** - Trade and view bundle info

**Key Technologies:**
- React 19 with TypeScript
- Tailwind CSS 4 (beta)
- React Query for state management
- Framer Motion for animations
- @dfinity/agent for IC integration
- @dfinity/auth-client for authentication
- Recharts for data visualization

**Build Output:** `src/frontend/dist/` (deployed as asset canister)

### AI Bundler API (`src/ai-bundler-api/`)

NestJS API service using OpenAI GPT-4 for intelligent bundle generation.

**Features:**
- GPT-4 function calling for structured responses
- Asset validation against supported assets
- Strategy reasoning and explanation
- Invalid request rejection

**Deployment:** Dockerized service on VPS

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v16+)
- [DFX](https://internetcomputer.org/docs/current/developer-docs/getting-started/install/) (Internet Computer SDK)
- [Rust](https://www.rust-lang.org/tools/install) (for backend canister)


### Development Server (Frontend Only)

```bash
npm run dev
```

Runs Vite dev server on `http://localhost:5173` with hot reload.

**Requirements:**
- Funded DFX wallet with cycles
- Valid IC identity


## Core Workflows

### 1. Create Bundle

**UI:** Bundle Builder page

**Process:**
1. User selects assets and allocations (or uses AI)
2. Frontend calls `create_bundle()` on backend
3. Backend validates allocations sum to 100%
4. ICRC-151 token created for the bundle
5. Bundle stored with `is_active = false`
6. Bundle hidden until initial funding

### 2. Initial Funding (InitialBuy)

**Process:**
1. User gets quote from coordinator
2. User calls `execute_quote()` with signed quote
3. Backend locks user's ckUSDC
4. Resolver deposits assets
5. NAV tokens minted to user
6. **Bundle activated** (`is_active = true`)
7. Bundle now visible in Discover

### 3. Buy Bundle

**UI:** Bundle Details page

**Process:**
1. User requests quote for ckUSDC amount
2. User executes quote
3. Resolver deposits assets to canister
4. NAV tokens minted proportionally
5. Platform fee paid to treasury
6. Resolver paid in ckUSDC

### 4. Sell Bundle

**UI:** Portfolio page

**Process:**
1. User requests sell quote for NAV tokens
2. User executes quote (locks NAV tokens)
3. Assets transferred to resolver
4. User receives ckUSDC
5. NAV tokens burned
6. Holdings updated

## Development Commands

### Backend

```bash
# Build backend
cargo build --target wasm32-unknown-unknown --release

# Generate backend declarations
npm run generate:backend

# Call backend functions
dfx canister call backend <function_name>

# View canister logs
dfx canister logs backend
```

### Frontend

```bash
# Development server
npm run dev

# Build production
npm run build

# Lint code
npm run lint

# Type check
npm run type-check
```

### AI API

```bash
# Start development server
cd src/ai-bundler-api
npm run start:dev

# Build production
npm run build

# Start production
npm run start:prod
```

## Environment Variables

### Frontend (`.env`)

Auto-generated by DFX:

```bash
VITE_DFX_NETWORK=local
VITE_CANISTER_ID_BACKEND=<backend-canister-id>
VITE_CANISTER_ID_FRONTEND=<frontend-canister-id>
```

### AI API (`src/ai-bundler-api/.env`)

```bash
OPENAI_API_KEY=sk-...
AI_SYSTEM_PROMPT=You are an expert...
SUPPORTED_ASSETS=bitcoin,ethereum,...
```

## Documentation

- **Backend Architecture:** [src/backend/README.md](src/backend/README.md)
- **IC Documentation:** [https://internetcomputer.org/docs](https://internetcomputer.org/docs)
- **ICRC-151 Standard:** [https://github.com/xfusion-dev/icrc-151](https://github.com/xfusion-dev/icrc-151)


## Troubleshooting

## License

Proprietary - XFusion Platform

## Support

For issues and feature requests, contact the XFusion team.
