# FACET

A personalized mental health platform with multi-agent AI system providing 24/7 therapeutic support, crisis intervention, and progress tracking.

## Current Implementation Status

**✅ Foundation (70% Complete)**
- **Authentication**: Supabase auth with signup/signin flows
- **Database**: PostgreSQL schema with users, sessions, conversations, and memory tables
- **UI Framework**: Next.js 15 with FACET design system (warm cream aesthetic, custom fonts)
- **Basic Agents**: Emotion Analyzer, Memory Manager, Crisis Monitor, Therapy Advisor
- **Dashboard**: User greeting, quick actions, progress tracking components

**🚧 In Development (30% Remaining)**
- **Dynamic Orchestration**: Transitioning from fixed workflows to LangChain-powered agent coordination
- **Chat Interface**: Core `/api/chat` endpoint and real-time conversation UI
- **Agent Transparency**: Expandable reasoning display showing multi-agent collaboration
- **Crisis Integration**: PHQ-9/GAD-7 assessment with emergency protocols

## Architecture

**Multi-Agent System** (4 specialized agents):
- **Smart Router**: Selects workflow mode (Light <1.5s, Standard <3s, Crisis <2s, Deep <8s)
- **Emotion Analyzer**: VAD model emotion detection with trend analysis
- **Memory Manager**: Pinecone vector storage for conversation and progress memory
- **Crisis Monitor**: Real-time risk assessment with intervention protocols

**Tech Stack**:
- Frontend: Next.js 15, Tailwind CSS, TypeScript
- Backend: Supabase (PostgreSQL + Auth)
- AI: OpenAI GPT-5 (all agents), LangChain orchestration
- Memory: Pinecone vector database
- Real-time: WebSocket/SSE for agent status

## Development

```bash
npm run dev          # Start development server
npm run build        # Production build  
npm run lint         # ESLint checking
npm run type-check   # TypeScript validation
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure:
- Supabase URL and anon key
- OpenAI API key (GPT-5 model access)
- Pinecone API key and environment
- LangChain API key for orchestration

## Next Steps

1. Implement core `/api/chat/route.ts` with LangChain orchestration
2. Build transparent agent reasoning UI components
3. Complete crisis assessment system integration
4. Add real-time agent collaboration workflows

See `SPECS.md` for detailed architecture specifications and `CLAUDE.md` for development guidelines.
