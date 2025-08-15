# FACET Project Development Guide

## Project Overview
FACET is a personalized mental health platform with multi-agent AI system providing 24/7 therapeutic support, crisis intervention, and progress tracking.

## Design System Standards

### Brand Colors
- **Primary Background**: `#FAF9F5` (warm cream)
- **Footer Background**: `#141413` (dark charcoal)
- **Footer Text**: `#FAF9F5` (cream on dark)
- **Feature Card Colors**:
  - AI Therapy: `#A5C7E2` (soft blue)
  - Crisis Support: `#D4B6BA` (soft pink)
  - Progress Tracking: `#BCD1CA` (soft green)
  - Trust Section: `#CBCADB` (soft lavender)

### Typography
- **FACET Logo Text**: Zapfino font (`facet-title-zapfino`)
- **Headings**: MesloLGS NF italic (`meslo-font italic`)
- **Logo Gradient**: `text-facet-gradient`

### Universal Header Component (MUST USE ON ALL PAGES)
All pages must use this exact header structure for consistency:

```tsx
<header className="relative sticky top-0 z-50" style={{backgroundColor: '#FAF9F5'}}>
  <div className="w-full pl-2 pr-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center h-24">
        <FacetLogo className="h-24 w-24" />
        <span className="text-2xl text-facet-gradient facet-title-zapfino leading-relaxed m-0 pl-2 pr-12 pt-6 pb-2 -ml-2">FACET</span>
      </div>
      {/* Right side content varies by page - auth buttons for homepage, etc. */}
    </div>
  </div>
</header>
```

**CRITICAL**: This header configuration must be used identically across:
- Homepage (`/`)
- Sign In page (`/auth/signin`)
- Sign Up page (`/auth/signup`)
- All other pages

The logo size (`h-24 w-24`), text positioning (`-ml-3`, `pl-1 pr-4 pt-4`), and gradient styling (`text-facet-gradient`) must remain consistent.

## Authentication Flow Design Decisions

### Registration & Login Logic
- **Email confirmation is DISABLED** for better UX (configured in Supabase dashboard)
- Users register → immediately logged in → redirect to dashboard (same tab)
- Middleware prevents logged-in users from accessing auth pages:
  - `/auth/signin` → redirects to `/dashboard`
  - `/auth/signup` → redirects to `/dashboard`  
  - `/auth/forgot-password` → redirects to `/dashboard`

### Password Reset Logic
- Only available to logged-out users (middleware blocks logged-in users)
- Logged-in users should change passwords through dashboard settings
- Flow: User logs out → forgets password → uses reset functionality
- Email confirmation callback handled at `/auth/callback`

### Session Management
- Uses Supabase auth with automatic session refresh
- `useAuth` hook handles SIGNED_IN events → auto-redirect to dashboard
- Session persists across browser sessions until manual logout

**NOTE: Authentication system is functionally complete but requires UI/UX polish after core multi-agent system implementation.**

### Footer Configuration
The homepage footer with dark background and link structure should be consistent across the platform:

```tsx
<footer className="py-12" style={{backgroundColor: '#141413', color: '#FAF9F5'}}>
  <div className="max-w-7xl mx-auto pl-4 pr-4">
    <div className="grid grid-cols-6 gap-8">
      <div className="flex flex-col justify-between h-full -ml-25">
        <FacetLogo className="h-20 w-20 -mt-12 -ml-6" />
        <div className="text-base" style={{color: '#FAF9F5'}}>
          © 2025 FACET
        </div>
      </div>
      {/* Link columns with -mt-8 for alignment */}
    </div>
  </div>
</footer>
```

## Technical Architecture

### Multi-Agent System
- **Smart Router**: Routes conversations to appropriate therapeutic agents
- **Emotion Analyzer**: VAD (Valence-Arousal-Dominance) emotion detection
- **Crisis Assessor**: Real-time risk evaluation and intervention
- **Therapeutic Advisor**: CBT/DBT-based treatment recommendations
- **Memory Manager**: Vector-based conversation and progress memory

### Workflow Modes
- **Light Mode**: <1s response for basic interactions
- **Standard Mode**: <3s response for therapeutic conversations
- **Crisis Mode**: <2s response for emergency situations
- **Deep Mode**: <8s response for complex analysis

### Technology Stack
- **Frontend**: Next.js 15 with App Router
- **Styling**: Tailwind CSS with custom design tokens
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Vector Memory**: Pinecone
- **AI**: OpenAI GPT-4 with custom agents
- **Real-time**: WebSocket connections

## Development Commands
- **Development**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Type Check**: `npm run type-check`

## Code Standards
- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Implement proper error handling and loading states
- Maintain responsive design principles
- Ensure accessibility compliance (WCAG 2.1)

## Security & Privacy
- HIPAA/GDPR compliant design
- End-to-end encryption for all user data
- Secure authentication flows
- Crisis intervention protocols
- Professional referral systems

---

*Last Updated: 2025-08-15*
*Ensure all team members follow these standards for consistent development.*