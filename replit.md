# Overview

Foundry Deployer is a full-stack web application that provides smart contract deployment and multi-transaction sending capabilities for the Monad blockchain network. The application enables users to deploy ERC-20, ERC-721, and ERC-1155 smart contracts through an intuitive web interface, as well as send tokens to multiple recipients in batch transactions. Built with modern web technologies, it combines a React-based frontend with an Express.js backend and integrates with Web3 wallet providers for blockchain interactions.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript in single-page application (SPA) mode
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design system
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management and API data fetching
- **Web3 Integration**: Web3.js library for blockchain interactions and wallet connectivity
- **Build Tool**: Vite for fast development and optimized production builds

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON request/response format
- **Database Integration**: Drizzle ORM configured for PostgreSQL with type-safe database operations
- **Development Server**: Custom Vite integration for seamless full-stack development experience

## Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless database provider
- **ORM**: Drizzle ORM for type-safe database queries and schema management
- **Schema Design**: Two main entities - deployments table for contract deployment tracking and multisend_transactions table for batch transaction management
- **Fallback Storage**: In-memory storage implementation for development/testing scenarios

## Authentication and Authorization
- **Wallet-Based Authentication**: MetaMask and compatible Web3 wallets for user identity
- **Network Management**: Automatic network switching to Monad Testnet (Chain ID: 10143)
- **Session Management**: Browser-based wallet connection state with automatic reconnection

## Smart Contract Management
- **Contract Generation**: Dynamic Solidity code generation for ERC-20, ERC-721, and ERC-1155 standards
- **Compilation**: Foundry integration for contract compilation and deployment
- **Template System**: Modular contract templates with customizable parameters (name, symbol, supply, metadata URI)

## User Interface Design
- **Component System**: shadcn/ui components with Radix UI primitives for accessibility
- **Theme**: Dark mode design with custom color palette optimized for blockchain applications
- **Responsive Design**: Mobile-first approach with tablet and desktop optimizations
- **Interactive Elements**: Real-time code preview, form validation, and deployment status tracking

# External Dependencies

## Blockchain Infrastructure
- **Monad Testnet**: Primary blockchain network for smart contract deployment and transactions
- **Web3 Providers**: MetaMask and compatible wallet providers for transaction signing and account management

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling and automatic scaling
- **Connect-PG-Simple**: PostgreSQL session store for Express.js session management

## Development Tools
- **Foundry**: Ethereum development toolkit for smart contract compilation, testing, and deployment
- **Drizzle Kit**: Database migration and schema management tools
- **ESBuild**: JavaScript bundler for production server builds

## UI/UX Libraries
- **Radix UI**: Unstyled, accessible UI primitives for complex components
- **Lucide React**: Icon library with consistent styling and accessibility features
- **React Hook Form**: Form state management with validation support
- **Date-fns**: Date manipulation and formatting utilities

## Monitoring and Development
- **Replit Integration**: Development environment integration with runtime error handling
- **Vite Plugins**: Development experience enhancements including error overlays and hot module replacement