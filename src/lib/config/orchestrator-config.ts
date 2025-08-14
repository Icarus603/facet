/**
 * FACET Agent Orchestrator Configuration
 * Environment-based configuration for production deployment
 */

import { z } from 'zod';
import { AgentType, OrchestratorConfig, AgentConfig } from '../agents/agent-types';

// ============================================================================
// ENVIRONMENT VARIABLES SCHEMA
// ============================================================================

const EnvironmentSchema = z.object({
  // Redis Configuration
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).default('0'),

  // Azure OpenAI Configuration
  AZURE_OPENAI_ENDPOINT: z.string().url(),
  AZURE_OPENAI_API_KEY: z.string().min(1),
  AZURE_OPENAI_API_VERSION: z.string().default('2024-02-01'),
  AZURE_OPENAI_GPT4O_DEPLOYMENT: z.string().default('gpt-4o'),
  AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT: z.string().default('gpt-4o-mini'),
  AZURE_OPENAI_GPT35_TURBO_DEPLOYMENT: z.string().default('gpt-35-turbo'),
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: z.string().default('text-embedding-ada-002'),

  // Orchestrator Configuration
  MAX_CONCURRENT_COORDINATIONS: z.string().transform(Number).default('50'),
  DEFAULT_COORDINATION_TIMEOUT_MS: z.string().transform(Number).default('30000'),
  AGENT_HEALTH_CHECK_INTERVAL_MS: z.string().transform(Number).default('30000'),

  // Security Configuration
  ENCRYPTION_ENABLED: z.string().transform(val => val === 'true').default('true'),
  ENCRYPTION_KEY: z.string().min(32).optional(),
  HIPAA_AUDIT_LOGGING: z.string().transform(val => val === 'true').default('true'),

  // Performance Configuration
  PERFORMANCE_METRICS_RETENTION_DAYS: z.string().transform(Number).default('7'),
  AUDIT_LOG_RETENTION_DAYS: z.string().transform(Number).default('30'),
  RATE_LIMIT_REQUESTS_PER_MINUTE: z.string().transform(Number).default('100'),
  RATE_LIMIT_TOKENS_PER_MINUTE: z.string().transform(Number).default('50000'),

  // Agent Configuration
  AGENT_MAX_CONCURRENT_SESSIONS: z.string().transform(Number).default('5'),
  AGENT_RESPONSE_TIMEOUT_MS: z.string().transform(Number).default('30000'),
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.string().transform(Number).default('5'),
  CIRCUIT_BREAKER_SUCCESS_THRESHOLD: z.string().transform(Number).default('3'),
  CIRCUIT_BREAKER_TIMEOUT_MS: z.string().transform(Number).default('60000'),

  // LLM Configuration
  LLM_TEMPERATURE: z.string().transform(Number).min(0).max(2).default('0.7'),
  LLM_MAX_TOKENS: z.string().transform(Number).default('1000'),
  LLM_TOP_P: z.string().transform(Number).min(0).max(1).default('1.0'),
  LLM_FREQUENCY_PENALTY: z.string().transform(Number).min(-2).max(2).default('0'),
  LLM_PRESENCE_PENALTY: z.string().transform(Number).min(-2).max(2).default('0'),

  // Environment
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

type Environment = z.infer<typeof EnvironmentSchema>;

// ============================================================================
// CONFIGURATION FACTORY
// ============================================================================

export class OrchestratorConfigFactory {
  private static instance: OrchestratorConfigFactory;
  private config: Environment;

  private constructor() {
    this.config = this.validateEnvironment();
  }

  public static getInstance(): OrchestratorConfigFactory {
    if (!OrchestratorConfigFactory.instance) {
      OrchestratorConfigFactory.instance = new OrchestratorConfigFactory();
    }
    return OrchestratorConfigFactory.instance;
  }

  /**
   * Get orchestrator configuration
   */
  public getOrchestratorConfig(): OrchestratorConfig {
    return {
      maxConcurrentCoordinations: this.config.MAX_CONCURRENT_COORDINATIONS,
      defaultTimeoutMs: this.config.DEFAULT_COORDINATION_TIMEOUT_MS,
      redisConnectionString: this.config.REDIS_URL,
      azureOpenAiEndpoint: this.config.AZURE_OPENAI_ENDPOINT,
      azureOpenAiApiKey: this.config.AZURE_OPENAI_API_KEY,
      azureOpenAiApiVersion: this.config.AZURE_OPENAI_API_VERSION,
      performanceMetricsRetention: this.config.PERFORMANCE_METRICS_RETENTION_DAYS * 86400, // Convert to seconds
      auditLogRetention: this.config.AUDIT_LOG_RETENTION_DAYS * 86400,
      encryptionEnabled: this.config.ENCRYPTION_ENABLED,
      encryptionKey: this.config.ENCRYPTION_KEY,
    };
  }

  /**
   * Get agent configuration for specific agent type
   */
  public getAgentConfig(agentType: AgentType, agentId?: string): AgentConfig {
    const id = agentId || this.generateAgentId(agentType);

    return {
      id,
      type: agentType,
      capabilities: this.getAgentCapabilities(agentType),
      maxConcurrentSessions: this.config.AGENT_MAX_CONCURRENT_SESSIONS,
      responseTimeoutMs: this.config.AGENT_RESPONSE_TIMEOUT_MS,
      healthCheckIntervalMs: this.config.AGENT_HEALTH_CHECK_INTERVAL_MS,
      circuitBreaker: {
        failureThreshold: this.config.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
        successThreshold: this.config.CIRCUIT_BREAKER_SUCCESS_THRESHOLD,
        timeoutMs: this.config.CIRCUIT_BREAKER_TIMEOUT_MS,
        halfOpenMaxRequests: 2,
      },
      llmConfig: {
        model: this.selectModelForAgent(agentType),
        temperature: this.getTemperatureForAgent(agentType),
        maxTokens: this.getMaxTokensForAgent(agentType),
        systemPrompt: this.getSystemPromptForAgent(agentType),
      },
      culturalSettings: this.getCulturalSettingsForAgent(agentType),
    };
  }

  /**
   * Get Azure OpenAI client configuration
   */
  public getAzureOpenAIConfig() {
    return {
      endpoint: this.config.AZURE_OPENAI_ENDPOINT,
      apiKey: this.config.AZURE_OPENAI_API_KEY,
      apiVersion: this.config.AZURE_OPENAI_API_VERSION,
      deployment: {
        gpt4o: this.config.AZURE_OPENAI_GPT4O_DEPLOYMENT,
        gpt4oMini: this.config.AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT,
        gpt35Turbo: this.config.AZURE_OPENAI_GPT35_TURBO_DEPLOYMENT,
        embedding: this.config.AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
      },
      hipaaCompliance: {
        enabled: true,
        auditLogging: this.config.HIPAA_AUDIT_LOGGING,
        dataResidency: 'US',
        encryptionInTransit: true,
      },
      rateLimit: {
        requestsPerMinute: this.config.RATE_LIMIT_REQUESTS_PER_MINUTE,
        tokensPerMinute: this.config.RATE_LIMIT_TOKENS_PER_MINUTE,
        maxRetries: 3,
        retryDelay: 1000,
      },
      monitoring: {
        enabled: true,
        logLevel: this.config.LOG_LEVEL,
        metricsRetention: this.config.PERFORMANCE_METRICS_RETENTION_DAYS * 86400,
      },
    };
  }

  /**
   * Get Redis coordination bus configuration
   */
  public getRedisConfig() {
    const url = new URL(this.config.REDIS_URL);
    
    return {
      redis: {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || this.config.REDIS_PASSWORD,
        db: this.config.REDIS_DB,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      },
      encryption: {
        enabled: this.config.ENCRYPTION_ENABLED,
        key: this.config.ENCRYPTION_KEY,
      },
      messageRetention: {
        ttlSeconds: 3600, // 1 hour
        maxMessages: 10000,
      },
      performance: {
        batchSize: 10,
        flushInterval: 1000,
        compressionEnabled: false,
      },
    };
  }

  /**
   * Get environment-specific settings
   */
  public getEnvironmentConfig() {
    return {
      nodeEnv: this.config.NODE_ENV,
      logLevel: this.config.LOG_LEVEL,
      isDevelopment: this.config.NODE_ENV === 'development',
      isProduction: this.config.NODE_ENV === 'production',
      isStaging: this.config.NODE_ENV === 'staging',
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Validate environment variables
   */
  private validateEnvironment(): Environment {
    try {
      return EnvironmentSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingVars = error.errors.map(e => e.path.join('.')).join(', ');
        throw new Error(`Missing or invalid environment variables: ${missingVars}`);
      }
      throw error;
    }
  }

  /**
   * Generate unique agent ID
   */
  private generateAgentId(agentType: AgentType): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${agentType}_${timestamp}_${random}`;
  }

  /**
   * Get agent capabilities by type
   */
  private getAgentCapabilities(agentType: AgentType): string[] {
    const capabilities: Record<AgentType, string[]> = {
      intake: [
        'initial_assessment',
        'crisis_detection',
        'cultural_assessment',
        'therapy_pathway_determination',
        'rapport_building',
      ],
      therapy_coordinator: [
        'session_orchestration',
        'treatment_planning',
        'agent_coordination',
        'therapeutic_intervention',
        'progress_monitoring',
      ],
      crisis_monitor: [
        'suicide_risk_assessment',
        'crisis_intervention',
        'safety_planning',
        'emergency_coordination',
        'risk_monitoring',
      ],
      cultural_adapter: [
        'cultural_assessment',
        'cultural_adaptation',
        'traditional_healing_integration',
        'bias_detection',
        'cultural_content_selection',
      ],
      progress_tracker: [
        'outcome_measurement',
        'progress_analysis',
        'goal_tracking',
        'treatment_effectiveness',
        'recommendation_generation',
      ],
    };

    return capabilities[agentType] || [];
  }

  /**
   * Select optimal model for agent type
   */
  private selectModelForAgent(agentType: AgentType): string {
    const modelSelection: Record<AgentType, string> = {
      intake: this.config.AZURE_OPENAI_GPT4O_DEPLOYMENT, // Complex reasoning for assessment
      therapy_coordinator: this.config.AZURE_OPENAI_GPT4O_DEPLOYMENT, // Complex coordination
      crisis_monitor: this.config.AZURE_OPENAI_GPT4O_DEPLOYMENT, // Critical decisions
      cultural_adapter: this.config.AZURE_OPENAI_GPT4O_DEPLOYMENT, // Nuanced cultural understanding
      progress_tracker: this.config.AZURE_OPENAI_GPT4O_MINI_DEPLOYMENT, // Data analysis focused
    };

    return modelSelection[agentType];
  }

  /**
   * Get temperature setting for agent type
   */
  private getTemperatureForAgent(agentType: AgentType): number {
    const temperatureSettings: Record<AgentType, number> = {
      intake: 0.7, // Balanced creativity and consistency
      therapy_coordinator: 0.6, // Slightly more consistent
      crisis_monitor: 0.3, // Very consistent for safety
      cultural_adapter: 0.8, // More creative for cultural nuance
      progress_tracker: 0.4, // Analytical and consistent
    };

    return temperatureSettings[agentType] || this.config.LLM_TEMPERATURE;
  }

  /**
   * Get max tokens for agent type
   */
  private getMaxTokensForAgent(agentType: AgentType): number {
    const tokenLimits: Record<AgentType, number> = {
      intake: 1200, // Comprehensive assessments
      therapy_coordinator: 1000, // Balanced responses
      crisis_monitor: 800, // Focused crisis response
      cultural_adapter: 1500, // Detailed cultural explanations
      progress_tracker: 600, // Concise progress reports
    };

    return tokenLimits[agentType] || this.config.LLM_MAX_TOKENS;
  }

  /**
   * Get system prompt for agent type
   */
  private getSystemPromptForAgent(agentType: AgentType): string {
    const systemPrompts: Record<AgentType, string> = {
      intake: 'You are an intake specialist for FACET, a culturally-aware AI therapy platform. Your role is to conduct comprehensive initial assessments, identify cultural backgrounds, detect safety concerns, and establish therapeutic rapport.',
      
      therapy_coordinator: 'You are the therapy coordinator for FACET, responsible for orchestrating comprehensive, culturally-informed therapy sessions. Integrate input from all specialized agents and coordinate therapeutic interventions.',
      
      crisis_monitor: 'You are the crisis monitoring specialist for FACET, responsible for detecting, assessing, and responding to mental health emergencies. Prioritize safety while maintaining cultural sensitivity.',
      
      cultural_adapter: 'You are the cultural adaptation specialist for FACET, ensuring all therapeutic interventions are culturally relevant, sensitive, and effective. Integrate traditional healing and address cultural barriers.',
      
      progress_tracker: 'You are the progress tracking specialist for FACET, monitoring therapeutic progress, measuring outcomes, and optimizing treatment effectiveness with cultural considerations.',
    };

    return systemPrompts[agentType];
  }

  /**
   * Get cultural settings for agent type
   */
  private getCulturalSettingsForAgent(agentType: AgentType): Record<string, any> | undefined {
    if (agentType === 'cultural_adapter') {
      return {
        supportedCultures: [
          'Mexican', 'Chinese', 'Indian', 'African American', 'Native American',
          'Arab', 'Korean', 'Vietnamese', 'Salvadoran', 'Cuban', 'Dominican',
        ],
        culturalFrameworks: [
          'collectivism_individualism',
          'high_context_low_context',
          'power_distance',
          'uncertainty_avoidance',
          'long_term_orientation',
        ],
        traditionalHealingPractices: [
          'curanderismo',
          'traditional_chinese_medicine',
          'ayurveda',
          'indigenous_healing',
          'spiritual_practices',
        ],
      };
    }

    return undefined;
  }
}

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

export const AGENT_TYPES: AgentType[] = [
  'intake',
  'therapy_coordinator',
  'crisis_monitor',
  'cultural_adapter',
  'progress_tracker',
];

export const DEFAULT_COORDINATION_STRATEGIES = {
  crisis_response: 'hierarchical' as const,
  cultural_adaptation: 'consensus' as const,
  regular_therapy: 'parallel' as const,
  progress_evaluation: 'sequential' as const,
};

export const PERFORMANCE_THRESHOLDS = {
  responseTime: {
    excellent: 1000, // 1 second
    good: 2000, // 2 seconds
    acceptable: 5000, // 5 seconds
  },
  successRate: {
    excellent: 0.98,
    good: 0.95,
    acceptable: 0.90,
  },
  coordinationEfficiency: {
    excellent: 0.90,
    good: 0.80,
    acceptable: 0.70,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get configuration instance
 */
export function getOrchestratorConfig(): OrchestratorConfig {
  return OrchestratorConfigFactory.getInstance().getOrchestratorConfig();
}

/**
 * Get agent configuration
 */
export function getAgentConfig(agentType: AgentType, agentId?: string): AgentConfig {
  return OrchestratorConfigFactory.getInstance().getAgentConfig(agentType, agentId);
}

/**
 * Get Azure OpenAI configuration
 */
export function getAzureOpenAIConfig() {
  return OrchestratorConfigFactory.getInstance().getAzureOpenAIConfig();
}

/**
 * Get Redis configuration
 */
export function getRedisConfig() {
  return OrchestratorConfigFactory.getInstance().getRedisConfig();
}

/**
 * Check if environment is production
 */
export function isProduction(): boolean {
  return OrchestratorConfigFactory.getInstance().getEnvironmentConfig().isProduction;
}

/**
 * Validate required environment variables are set
 */
export function validateEnvironment(): boolean {
  try {
    OrchestratorConfigFactory.getInstance();
    return true;
  } catch (error) {
    console.error('Environment validation failed:', error);
    return false;
  }
}