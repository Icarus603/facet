# FACET Development Environment Setup

This guide will help you set up the FACET mental health platform for local development.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Git
- Supabase account (for database and auth)
- OpenAI API key (for AI models)
- Pinecone account (for vector memory)

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd facet
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Fill in your environment variables (see Environment Variables section below).

3. **Database Setup**
   - Create a new Supabase project
   - Run the migration: `supabase/migrations/001_initial_schema.sql`
   - Update your `.env.local` with Supabase credentials

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env.local` file with these variables:

### Required Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration  
OPENAI_API_KEY=your_openai_api_key

# NextAuth Configuration
NEXTAUTH_SECRET=your_generated_secret
NEXTAUTH_URL=http://localhost:3000
```

### Optional Variables

```bash
# Anthropic (for Claude models)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Pinecone (for memory system)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=facet-memory-dev

# Redis (for session management)
REDIS_URL=redis://localhost:6379

# Development flags
NODE_ENV=development
ENABLE_DEBUG_LOGGING=true
```

## Database Setup

### Using Supabase (Recommended)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > Database and copy your connection details
3. In the SQL Editor, run the migration file: `supabase/migrations/001_initial_schema.sql`
4. Enable Row Level Security (RLS) for all tables
5. Update your `.env.local` with the project URL and keys

### Local Supabase (Advanced)

1. Install Supabase CLI: `npm install supabase --global`
2. Initialize: `supabase init`
3. Start local instance: `supabase start`
4. Apply migrations: `supabase db reset`

## AI Services Setup

### OpenAI API

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Add to `.env.local` as `OPENAI_API_KEY`
3. Ensure you have access to GPT-4 models for best performance

### Anthropic Claude (Optional)

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to `.env.local` as `ANTHROPIC_API_KEY`
3. Used as fallback and for specialized therapeutic responses

### Pinecone Vector Database (Optional)

1. Create account at [pinecone.io](https://pinecone.io)
2. Create an index named `facet-memory-dev` with dimension 1536
3. Add API key and index name to `.env.local`
4. Used for long-term memory and personalization

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Format code
npm run format

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Test coverage
npm run test:coverage
```

## Project Structure

```
facet/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── auth/              # Authentication pages
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── chat/              # Chat interface components
│   │   ├── dashboard/         # Dashboard components
│   │   ├── layout/            # Layout components
│   │   └── ui/                # UI components (shadcn/ui)
│   └── lib/                   # Utilities and business logic
│       ├── agents/            # Multi-agent AI system
│       ├── hooks/             # React hooks
│       ├── supabase/          # Database client and types
│       └── types/             # TypeScript type definitions
├── supabase/                  # Database migrations and config
├── public/                    # Static assets
└── backup-frontend/           # Previous version components
```

## Multi-Agent System Architecture

FACET uses a sophisticated multi-agent AI system:

- **Smart Router**: Routes conversations to appropriate agents
- **Emotion Analyzer**: Detects and analyzes emotional states
- **Crisis Assessor**: Identifies and responds to mental health crises
- **Therapeutic Advisor**: Provides evidence-based therapeutic guidance
- **Memory Manager**: Maintains long-term context and personalization

### Workflow Modes

- **Light Mode** (<1s): Simple interactions, greetings
- **Standard Mode** (<3s): Regular therapeutic conversations  
- **Crisis Mode** (<2s): Emergency mental health situations
- **Deep Mode** (<8s): Complex therapeutic work

## Testing

### Unit Tests
```bash
npm run test
```

### Integration Tests
```bash
npm run test:integration
```

### Crisis Detection Testing
The crisis detection system includes comprehensive test cases for safety-critical functionality.

## Security & Privacy

### HIPAA/GDPR Compliance
- All user data is encrypted at rest and in transit
- Row Level Security (RLS) enforced on all database tables
- Audit logging for sensitive data access
- Data retention policies implemented

### Crisis Safety
- Multi-layer crisis detection (keyword + contextual analysis)
- <100ms rapid crisis keyword detection
- Immediate escalation protocols
- Professional referral pathways

## Debugging

### Enable Debug Logging
Set `ENABLE_DEBUG_LOGGING=true` in `.env.local`

### Agent Performance Monitoring  
The orchestrator logs performance metrics for each workflow mode:
- Response times
- Agent selection reasoning
- Confidence scores
- Intervention tracking

### Database Queries
Use Supabase dashboard or enable query logging for debugging database interactions.

## Troubleshooting

### Common Issues

1. **Authentication errors**: Check Supabase keys and URL
2. **Database connection**: Verify RLS policies are properly configured
3. **AI API errors**: Check API keys and rate limits
4. **Performance issues**: Enable performance logging to identify bottlenecks

### Getting Help

1. Check the [SPECS.md](./SPECS.md) for detailed technical specifications
2. Review error logs in the browser console and terminal
3. Check Supabase dashboard for database issues
4. Verify all environment variables are set correctly

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new features
3. Update documentation for any changes
4. Ensure all performance targets are met
5. Test crisis detection functionality thoroughly

## Performance Targets

- Light Mode: <1 second response time
- Standard Mode: <3 seconds response time  
- Crisis Mode: <2 seconds response time
- Deep Mode: <8 seconds response time
- 99.9% uptime SLA
- Crisis detection: <100ms keyword analysis

## Next Steps

After setup, you can:

1. Visit `http://localhost:3000` to see the landing page
2. Sign up for a new account
3. Complete the onboarding flow
4. Start a therapy session in the chat interface
5. Test the multi-agent system responses
6. Monitor performance and agent behavior

The platform is designed to provide immediate value while maintaining the highest standards for mental health support and user safety.