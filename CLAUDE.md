# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FACET is a sophisticated mental health platform powered by a dynamic multi-agent AI system that provides personalized therapeutic support, crisis intervention, and progress tracking. The platform uses Next.js 15 with OpenAI GPT-5 integration and is designed to transition from fixed workflow modes to a LangChain-powered dynamic orchestration architecture.

## Development Commands

### Development Workflow
```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Code quality
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues automatically
npm run type-check     # Run TypeScript type checking
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting

# Testing
npm run test           # Run tests with Vitest
npm run test:ui        # Run tests with UI
npm run test:coverage  # Run tests with coverage report
```

### Database Management
```bash
# Run specific cleanup script
npx tsx scripts/cleanup-auth.ts

# Supabase CLI commands (if supabase CLI installed)
supabase start         # Start local Supabase
supabase db reset      # Reset local database
supabase migration new # Create new migration
```

## Architecture Overview

### Core Mental Health Multi-Agent System

FACET implements a sophisticated orchestration system with specialized AI agents:

1. **Agent Orchestrator** (`src/lib/agents/orchestrator.ts`) - Central coordination hub that routes conversations through workflow modes (light/standard/crisis/deep) and manages agent collaboration
2. **Smart Router** (`src/lib/agents/smart-router.ts`) - Intelligent routing logic for determining appropriate workflow mode
3. **Emotion Analyzer** (`src/lib/agents/emotion-analyzer.ts`) - VAD (Valence-Arousal-Dominance) emotion detection and analysis
4. **Memory System** (`src/lib/memory/`) - Vector-based memory management using Pinecone for contextual conversation history

### Database Architecture (Supabase)

The system uses a comprehensive PostgreSQL schema designed for mental health applications:

- **Users & Profiles**: User authentication and mental health profiles
- **Therapy Sessions**: Session tracking with workflow modes and emotional context
- **Conversation Messages**: Encrypted message storage with agent metadata
- **Emotion Tracking**: Detailed emotional state tracking with vector representations
- **Crisis Assessments**: Risk assessment data with safety plans
- **Therapeutic Goals**: Goal tracking and progress monitoring

Key enums: `workflow_mode`, `risk_level`, `agent_type`, `message_type`, `goal_status`

### Frontend Architecture

- **App Router**: Next.js 15 with app directory structure
- **Authentication Flow**: Supabase Auth with middleware-protected routes
- **Dashboard**: Collapsible sidebar layout with real-time chat interface
- **Design System**: FACET-branded components with Zapfino font and diamond logo
- **Responsive UI**: Tailwind CSS with custom design tokens

### Environment Configuration

The system supports both current GPT-4 and future GPT-5 models with LangChain integration:

- **AI Models**: Configurable model selection per agent type
- **LangChain**: Orchestration and tracing configuration
- **Performance**: Timeout and parallel execution settings
- **Feature Flags**: Granular feature control for development

## Key Implementation Details

### Authentication & Middleware

- Middleware (`src/middleware.ts`) handles auth state and redirects
- Logged-in users are redirected away from auth pages to `/dashboard`
- Public pages: homepage, about, how-it-works, privacy-policy, terms
- Email confirmation redirects to `/auth/callback`

### Agent Workflow Modes

The orchestrator routes conversations into four modes based on context:

1. **Light Mode** (<1.5s): Simple empathetic responses for routine check-ins
2. **Standard Mode** (<3s): Balanced therapeutic support with emotion-specific interventions  
3. **Crisis Mode** (<2s): Immediate safety-focused responses with professional resources
4. **Deep Mode** (<8s): Comprehensive therapeutic work with memory integration

### Memory System Integration

- **Vector Storage**: Pinecone integration for semantic memory retrieval
- **Memory Types**: event, insight, goal, pattern, preference, crisis
- **Automatic Storage**: Significant conversations stored based on emotional intensity and workflow mode
- **Contextual Retrieval**: Memory-informed responses for therapeutic continuity

### Frontend Component Structure

```
src/components/
├── chat/           # Chat interface components
├── dashboard/      # Dashboard-specific components  
├── layout/         # Layout components (sidebar, etc.)
└── ui/            # Reusable UI components (buttons, cards, etc.)
```

### Crisis Safety Features

- Real-time crisis detection and assessment
- Emergency contact integration and professional referrals
- Safety plan creation and management
- Automatic escalation protocols for high-risk situations

## Development Notes

- The codebase is transitioning from fixed workflows to LangChain-powered dynamic orchestration (see SPECS.md)
- Current implementation uses OpenAI GPT-4o but is configured for GPT-5 migration
- All mental health data is encrypted and follows HIPAA/GDPR compliance patterns
- The system prioritizes user safety with conservative crisis detection
- Memory storage is selective based on therapeutic significance and emotional intensity

## Database Schema Understanding

When working with the database, reference `src/lib/supabase/types.ts` for complete type definitions. The schema is optimized for mental health applications with comprehensive tracking of emotional states, therapeutic progress, and crisis assessments.