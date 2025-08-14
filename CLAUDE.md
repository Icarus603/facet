# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FACET is a multi-agent AI therapy platform that integrates cultural wisdom, philosophy, and literature for personalized mental health support. Built with Next.js, TypeScript, and Supabase, it features a sophisticated system of specialized therapeutic agents powered by advanced AI orchestration.

## Development Commands

### Core Development
- `npm run dev` - Start development server (Next.js)
- `npm run build` - Production build
- `npm run start` - Start production server
- `npm run type-check` - TypeScript type checking (run before commits)

### Code Quality
- `npm run lint` - ESLint checking
- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check Prettier formatting

### Testing
- `npm run test` - Run Vitest tests
- `npm run test:ui` - Run tests with UI interface
- `npm run test:coverage` - Generate test coverage report

### Database (Prisma + PostgreSQL)
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to development database
- `npm run db:migrate` - Create and run migrations
- `npm run db:reset` - Reset database (development only)
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio database browser

## Architecture Overview

### Multi-Agent Therapy System
The core innovation of FACET is its multi-agent AI architecture located in `src/lib/agents/`:

**Agent Registry (`AgentRegistry.ts`)**: Central coordination hub that routes user interactions to appropriate therapeutic agents based on context, cultural background, and crisis detection.

**Specialized Agents**: Six therapeutic agents implement different approaches:
- **Cultural Integration Agent** - Cross-cultural psychology and cultural identity support
- **Crisis Intervention Agent** - 24/7 crisis response with suicide prevention protocols  
- **Cognitive Behavioral Agent** - CBT interventions and thought pattern analysis
- **Mindfulness Agent** - MBSR/MBCT protocols with culturally-adapted meditation
- **Family Therapy Agent** - Family systems therapy and intergenerational healing
- **Progress Tracking Agent** - Systematic progress monitoring and goal achievement

**Agent Orchestration**: Complex coordination system with intelligent routing, multi-agent consultation, automatic crisis escalation, and cross-agent knowledge sharing.

### Cultural Content Engine
Located in `src/lib/cultural/`, this system provides culturally-responsive therapeutic content:

**Vector Search** (`vector-search.ts`): Semantic search through cultural wisdom database using embeddings for contextual relevance.

**Bias Detection** (`bias-detection.ts`): ML-powered bias detection with expert validation workflows to ensure cultural authenticity.

**Cultural Context Analyzer** (`cultural-context-analyzer.ts`): Analyzes user cultural background to personalize agent selection and content delivery.

### Database Schema (Prisma)
Comprehensive PostgreSQL schema supporting:
- **User Management**: Cultural profiles, emergency contacts, privacy settings
- **Therapy Sessions**: Multi-agent session tracking, interaction logging, real-time communication
- **Cultural Content**: Vector embeddings, expert validation, bias scoring, usage analytics
- **Crisis Safety**: Assessment protocols, intervention tracking, safety planning
- **Progress Analytics**: Outcome measurement, trend analysis, goal tracking
- **Memory Management**: Session continuity, context preservation, agent coordination

### UI Component System
Built with Radix UI primitives and custom FACET design system:

**Brand Colors**: Unified color palette with primary FACET blue (#2C84DB) and wine (#C41E3A) with supporting gradients.

**Chat Interface** (`src/components/chat/`): Real-time therapy session UI with agent switching, typing indicators, cultural content cards, and therapeutic exercises.

**Responsive Design**: Mobile-first approach with Tailwind CSS for consistent cross-platform experience.

## Key Technical Patterns

### Agent Development
When creating new agents, extend `BaseAgent` class and implement:
- Cultural adaptation methods in `getSpecializedResponse()`
- Intervention validation in `validateIntervention()`
- Progress metrics in `getProgressMetrics()`
- Crisis assessment protocols where applicable

### Cultural Responsiveness
All agent interactions must consider user's cultural background through:
- Cultural matching algorithms in agent selection
- Culturally-adapted response templates
- Integration of relevant cultural content
- Respect for cultural communication styles and family dynamics

### Real-time Communication
WebSocket implementation for live therapy sessions with:
- Encrypted message delivery
- Agent switching notifications  
- Session state management
- Crisis escalation protocols

### Memory and Context Management
Session continuity maintained through:
- Encrypted memory contexts between sessions
- Agent coordination logs for handoffs
- Progress tracking across multiple sessions
- Cultural preference preservation

## Environment Configuration

### Required Environment Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Database
DATABASE_URL=postgresql://user:password@host:port/database

# AI/LLM Configuration  
AZURE_OPENAI_API_KEY=your_azure_openai_key
AZURE_OPENAI_ENDPOINT=your_azure_endpoint
OPENAI_API_KEY=your_openai_key

# Redis for Agent Coordination
REDIS_URL=redis://localhost:6379
```

### Demo Mode
Development environment includes demo mode for testing without full backend setup. Authentication and agent responses are simulated for rapid UI development.

## Development Workflow

### Adding New Therapeutic Agents
1. Create agent implementation in `src/lib/agents/implementations/`
2. Define agent configuration with cultural specializations
3. Add to agent registry in `AgentRegistry.ts`
4. Implement crisis detection protocols if applicable
5. Add progress tracking metrics
6. Create tests in `src/lib/agents/__tests__/`

### Cultural Content Development
1. Add content to database via `src/lib/cultural/content-database.ts`
2. Run bias detection validation
3. Generate vector embeddings for semantic search
4. Test cultural matching algorithms
5. Validate with cultural experts where possible

### Database Schema Changes
1. Modify `prisma/schema.prisma`
2. Run `npm run db:generate` to update client
3. Run `npm run db:migrate` to create migration
4. Update TypeScript types accordingly
5. Test with `npm run db:studio`

## Testing Strategy

### Unit Tests
- Agent interaction testing with mock cultural contexts
- Cultural bias detection algorithm validation
- Crisis detection protocol verification
- Vector search accuracy testing

### Integration Tests  
- Multi-agent coordination workflows
- Database operation testing
- Cultural content delivery validation
- Session state management

### E2E Testing
- Complete therapy session workflows
- Crisis intervention protocols
- Cultural adaptation accuracy
- Real-time communication features

## Production Considerations

### Performance
- Vector search optimization for cultural content
- Redis caching for agent coordination
- Database query optimization for session data
- WebSocket connection pooling

### Security
- End-to-end encryption for therapy sessions
- HIPAA compliance for health data
- Secure cultural content validation
- Crisis intervention privacy protocols

### Monitoring
- Agent performance metrics tracking
- Cultural bias detection monitoring  
- Crisis intervention response times
- User satisfaction and outcome tracking

## Code Style and Standards

The project follows strict TypeScript configuration with:
- Path aliasing (`@/*` maps to `src/*`)
- Strict type checking enabled
- ESLint with Next.js configuration
- Prettier for consistent formatting
- Tailwind CSS for styling

Focus on cultural sensitivity, evidence-based therapeutic approaches, and ethical AI practices in all development work.