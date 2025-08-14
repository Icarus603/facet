import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create test users
  const testUser = await prisma.user.upsert({
    where: { email: 'test@facet.dev' },
    update: {},
    create: {
      email: 'test@facet.dev',
      profile: {
        role: 'user',
        onboarding_completed: true,
      },
      culturalBackground: {
        primary_culture: 'Asian',
        secondary_cultures: ['American'],
        language_preferences: ['English', 'Mandarin'],
        generational_status: 'Second generation',
      },
      subscriptionTier: 'free',
    },
  })

  // Create cultural profile for test user
  await prisma.userCulturalProfile.upsert({
    where: { id: 'test-cultural-profile' },
    update: {},
    create: {
      id: 'test-cultural-profile',
      userId: testUser.id,
      primaryCulture: 'Asian',
      secondaryCultures: ['American'],
      languagePreferences: ['English', 'Mandarin'],
      religiousSpiritualBackground: 'Buddhist',
      generationalStatus: 'Second generation (child of immigrants)',
      culturalValues: {
        therapeutic_goals: 'Understanding cultural identity and family expectations',
        cultural_values: 'Harmony, respect for elders, collective wellbeing',
      },
    },
  })

  // Create professional user
  const professionalUser = await prisma.user.upsert({
    where: { email: 'therapist@facet.dev' },
    update: {},
    create: {
      email: 'therapist@facet.dev',
      profile: {
        role: 'professional',
        onboarding_completed: true,
        credentials: {
          license_type: 'LMFT',
          license_number: 'CA123456',
          specializations: ['Cultural Psychology', 'Family Therapy'],
        },
      },
      subscriptionTier: 'professional',
    },
  })

  // Create admin user
  await prisma.user.upsert({
    where: { email: 'admin@facet.dev' },
    update: {},
    create: {
      email: 'admin@facet.dev',
      profile: {
        role: 'admin',
        onboarding_completed: true,
      },
      subscriptionTier: 'admin',
    },
  })

  // Create sample cultural content
  const culturalContents = [
    {
      contentType: 'proverb',
      cultureTags: ['Chinese'],
      title: '塞翁失马',
      content: 'The story of the old man who lost his horse teaches us that what appears to be misfortune may actually be a blessing in disguise, and vice versa.',
      source: 'Huainanzi',
      author: 'Liu An',
      historicalPeriod: 'Han Dynasty (206 BC - 220 AD)',
      therapeuticThemes: ['Resilience', 'Perspective', 'Acceptance'],
      therapeuticApplications: ['Reframing negative experiences', 'Building resilience', 'Uncertainty tolerance'],
      targetIssues: ['Depression', 'Anxiety', 'Life transitions'],
      expertValidated: true,
      expertValidator: 'Dr. Li Wei, Cultural Psychology PhD',
    },
    {
      contentType: 'story',
      cultureTags: ['Indigenous', 'Native American'],
      title: 'The Two Wolves',
      content: 'An old Cherokee is teaching his grandson about life. "A fight is going on inside me," he says. "It is a terrible fight and it is between two wolves. One is evil – he is anger, envy, sorrow, regret, greed, arrogance, self-pity, guilt, resentment, inferiority, lies, false pride, superiority, and ego." He continues, "The other is good – he is joy, peace, love, hope, serenity, humility, kindness, benevolence, empathy, generosity, truth, compassion, and faith. The same fight is going on inside you – and inside every other person, too." The grandson thinks about it for a minute and then asks his grandfather, "Which wolf will win?" The old Cherokee simply replies, "The one you feed."',
      source: 'Cherokee oral tradition',
      therapeuticThemes: ['Choice', 'Self-awareness', 'Emotional regulation'],
      therapeuticApplications: ['Cognitive behavioral therapy', 'Mindfulness practices', 'Values clarification'],
      targetIssues: ['Anger management', 'Depression', 'Addiction recovery'],
      expertValidated: true,
      expertValidator: 'Dr. Maria Gonzalez, Indigenous Psychology PhD',
    },
  ]

  for (const content of culturalContents) {
    await prisma.culturalContent.create({
      data: content,
    })
  }

  // Create sample therapy session
  await prisma.therapySession.create({
    data: {
      userId: testUser.id,
      sessionType: 'cultural_identity',
      primaryConcern: 'Balancing cultural expectations with personal goals',
      culturalContext: {
        cultural_conflicts: ['Traditional vs modern values', 'Family expectations'],
        relevant_content: ['Chinese proverbs', 'Filial piety concepts'],
      },
      sessionGoals: ['Explore cultural identity', 'Develop coping strategies'],
      status: 'completed',
      durationMinutes: 45,
      satisfactionRating: 4,
      culturalRelevanceRating: 5,
      agentCoordinationSummary: {
        agents_used: ['cultural_wisdom', 'cognitive_behavioral', 'family_systems'],
        coordination_success: true,
        cultural_adaptation_score: 0.85,
      },
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log(`👤 Test user: test@facet.dev`)
  console.log(`👨‍⚕️ Therapist: therapist@facet.dev`)
  console.log(`👑 Admin: admin@facet.dev`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })