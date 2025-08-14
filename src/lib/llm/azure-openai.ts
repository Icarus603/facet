/**
 * FACET Azure OpenAI Client
 * HIPAA-compliant LLM integration for therapy agent responses
 */

import OpenAI from 'openai';
import { nanoid } from 'nanoid';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  metadata?: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
  requestId: string;
  timestamp: number;
}

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey: string;
  apiVersion: string;
  deployment?: {
    gpt4o: string;
    gpt4oMini: string;
    gpt35Turbo: string;
    embedding: string;
  };
  hipaaCompliance: {
    enabled: boolean;
    auditLogging: boolean;
    dataResidency: string;
    encryptionInTransit: boolean;
  };
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    maxRetries: number;
    retryDelay: number;
  };
  monitoring: {
    enabled: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    metricsRetention: number;
  };
}

export class AzureOpenAIClient {
  private readonly client: OpenAI;
  private readonly config: AzureOpenAIConfig;
  private readonly requestQueue: Array<{ request: LLMRequest; resolve: Function; reject: Function }> = [];
  private readonly rateLimitTracker = {
    requests: new Map<string, number[]>(),
    tokens: new Map<string, number[]>(),
  };
  
  private readonly metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalTokensUsed: 0,
    totalCostUsd: 0,
    averageResponseTime: 0,
    lastHealthCheck: Date.now(),
  };

  private processingQueue = false;

  constructor(config: AzureOpenAIConfig) {
    this.config = config;
    
    // Initialize Azure OpenAI client
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: `${config.endpoint}/openai/deployments`,
      defaultQuery: { 'api-version': config.apiVersion },
    });

    // Start rate limit cleanup interval
    setInterval(() => this.cleanupRateLimitTracking(), 60000); // Every minute
  }

  // ============================================================================
  // PUBLIC INTERFACE
  // ============================================================================

  /**
   * Generate LLM response with HIPAA compliance and rate limiting
   */
  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const requestId = nanoid();

    try {
      // Validate HIPAA compliance
      this.validateHIPAACompliance(request);

      // Check rate limits
      await this.enforceRateLimit(request);

      // Queue request if necessary
      if (this.shouldQueueRequest()) {
        return await this.queueRequest(request);
      }

      // Generate response
      const response = await this.executeRequest(request, requestId);

      // Update metrics
      this.updateSuccessMetrics(startTime, response.usage?.totalTokens || 0);

      // Log for HIPAA audit if enabled
      if (this.config.hipaaCompliance.auditLogging) {
        await this.logHIPAAAudit(request, response, requestId);
      }

      return response;

    } catch (error) {
      this.updateFailureMetrics(startTime);
      
      if (this.config.monitoring.enabled) {
        console.error(`Azure OpenAI request failed (${requestId}):`, error);
      }

      throw new Error(`LLM generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate embeddings for vector search
   */
  async generateEmbeddings(
    text: string,
    model?: string
  ): Promise<{ embedding: number[]; usage: { totalTokens: number } }> {
    try {
      const embeddingModel = model || this.config.deployment?.embedding || 'text-embedding-ada-002';
      
      const response = await this.client.embeddings.create({
        model: embeddingModel,
        input: text,
      });

      const embedding = response.data[0].embedding;
      const usage = response.usage;

      // Update token usage metrics
      this.metrics.totalTokensUsed += usage.totalTokens;
      this.metrics.totalCostUsd += this.calculateEmbeddingCost(usage.totalTokens, embeddingModel);

      return {
        embedding,
        usage: { totalTokens: usage.totalTokens },
      };

    } catch (error) {
      throw new Error(`Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for Azure OpenAI connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      const healthCheckRequest: LLMRequest = {
        messages: [
          { role: 'system', content: 'You are a health check assistant.' },
          { role: 'user', content: 'Please respond with "OK" if you are functioning properly.' },
        ],
        model: this.config.deployment?.gpt4oMini || 'gpt-4o-mini',
        maxTokens: 10,
        temperature: 0,
      };

      const response = await this.generateResponse(healthCheckRequest);
      const isHealthy = response.content.toLowerCase().includes('ok');

      this.metrics.lastHealthCheck = Date.now();
      return isHealthy;

    } catch (error) {
      if (this.config.monitoring.enabled) {
        console.error('Azure OpenAI health check failed:', error);
      }
      return false;
    }
  }

  /**
   * Get client metrics
   */
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(): {
    requestsUsed: number;
    tokensUsed: number;
    requestsRemaining: number;
    tokensRemaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentRequests = this.rateLimitTracker.requests.get('current')?.filter(time => time > oneMinuteAgo) || [];
    const recentTokens = this.rateLimitTracker.tokens.get('current')?.filter(time => time > oneMinuteAgo) || [];

    return {
      requestsUsed: recentRequests.length,
      tokensUsed: recentTokens.reduce((sum, token) => sum + token, 0),
      requestsRemaining: Math.max(0, this.config.rateLimit.requestsPerMinute - recentRequests.length),
      tokensRemaining: Math.max(0, this.config.rateLimit.tokensPerMinute - recentTokens.reduce((sum, token) => sum + token, 0)),
      resetTime: now + 60000,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Execute the actual LLM request
   */
  private async executeRequest(request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 1000,
        top_p: request.topP || 1.0,
        frequency_penalty: request.frequencyPenalty || 0,
        presence_penalty: request.presencePenalty || 0,
        stop: request.stop,
      });

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No content in LLM response');
      }

      return {
        content: choice.message.content,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
        model: response.model,
        finishReason: choice.finish_reason || 'unknown',
        requestId,
        timestamp: Date.now(),
      };

    } catch (error) {
      if (error instanceof Error && error.message.includes('rate_limit')) {
        // Handle rate limit error with exponential backoff
        const delay = this.config.rateLimit.retryDelay * Math.pow(2, this.metrics.failedRequests % 5);
        await new Promise(resolve => setTimeout(resolve, delay));
        return await this.executeRequest(request, requestId);
      }

      throw error;
    }
  }

  /**
   * Validate HIPAA compliance requirements
   */
  private validateHIPAACompliance(request: LLMRequest): void {
    if (!this.config.hipaaCompliance.enabled) {
      return;
    }

    // Check for PII patterns in messages
    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/, // Phone number
    ];

    for (const message of request.messages) {
      for (const pattern of piiPatterns) {
        if (pattern.test(message.content)) {
          console.warn('Potential PII detected in LLM request - review HIPAA compliance');
          break;
        }
      }
    }

    // Validate encryption in transit
    if (!this.config.hipaaCompliance.encryptionInTransit && !this.config.endpoint.startsWith('https://')) {
      throw new Error('HIPAA compliance requires encryption in transit (HTTPS)');
    }
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(request: LLMRequest): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean up old tracking data
    this.cleanupRateLimitTracking();

    // Get current usage
    const currentRequests = this.rateLimitTracker.requests.get('current') || [];
    const currentTokens = this.rateLimitTracker.tokens.get('current') || [];

    const recentRequests = currentRequests.filter(time => time > oneMinuteAgo);
    const recentTokenUsage = currentTokens.filter(time => time > oneMinuteAgo).reduce((sum, tokens) => sum + tokens, 0);

    // Estimate tokens for this request
    const estimatedTokens = this.estimateTokenUsage(request);

    // Check limits
    if (recentRequests.length >= this.config.rateLimit.requestsPerMinute) {
      const waitTime = Math.min(60000, recentRequests[0] + 60000 - now);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    if (recentTokenUsage + estimatedTokens > this.config.rateLimit.tokensPerMinute) {
      const waitTime = Math.min(60000, currentTokens[0] + 60000 - now);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    // Track this request
    currentRequests.push(now);
    currentTokens.push(estimatedTokens);
    
    this.rateLimitTracker.requests.set('current', currentRequests);
    this.rateLimitTracker.tokens.set('current', currentTokens);
  }

  /**
   * Estimate token usage for a request
   */
  private estimateTokenUsage(request: LLMRequest): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    const inputText = request.messages.map(m => m.content).join(' ');
    const inputTokens = Math.ceil(inputText.length / 4);
    const outputTokens = request.maxTokens || 500;
    
    return inputTokens + outputTokens;
  }

  /**
   * Check if request should be queued
   */
  private shouldQueueRequest(): boolean {
    const status = this.getRateLimitStatus();
    return status.requestsRemaining <= 5 || status.tokensRemaining <= 1000;
  }

  /**
   * Queue request for later processing
   */
  private async queueRequest(request: LLMRequest): Promise<LLMResponse> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ request, resolve, reject });
      
      if (!this.processingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    this.processingQueue = true;

    while (this.requestQueue.length > 0) {
      const { request, resolve, reject } = this.requestQueue.shift()!;
      
      try {
        const response = await this.generateResponse(request);
        resolve(response);
      } catch (error) {
        reject(error);
      }

      // Small delay between queued requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processingQueue = false;
  }

  /**
   * Update success metrics
   */
  private updateSuccessMetrics(startTime: number, tokens: number): void {
    const responseTime = Date.now() - startTime;
    
    this.metrics.totalRequests++;
    this.metrics.successfulRequests++;
    this.metrics.totalTokensUsed += tokens;
    
    // Update average response time (exponential moving average)
    const alpha = 0.1;
    this.metrics.averageResponseTime = 
      alpha * responseTime + (1 - alpha) * this.metrics.averageResponseTime;
  }

  /**
   * Update failure metrics
   */
  private updateFailureMetrics(startTime: number): void {
    this.metrics.totalRequests++;
    this.metrics.failedRequests++;
  }

  /**
   * Calculate token cost
   */
  private calculateTokenCost(tokens: number, model: string): number {
    // Azure OpenAI pricing (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-35-turbo': { input: 0.0005, output: 0.0015 },
    };

    const modelPricing = pricing[model] || pricing['gpt-4o-mini'];
    return (tokens / 1000) * ((modelPricing.input + modelPricing.output) / 2);
  }

  /**
   * Calculate embedding cost
   */
  private calculateEmbeddingCost(tokens: number, model: string): number {
    // Azure OpenAI embedding pricing
    const embeddingPricing: Record<string, number> = {
      'text-embedding-ada-002': 0.0001, // per 1K tokens
      'text-embedding-3-small': 0.00002,
      'text-embedding-3-large': 0.00013,
    };

    const price = embeddingPricing[model] || embeddingPricing['text-embedding-ada-002'];
    return (tokens / 1000) * price;
  }

  /**
   * Clean up rate limit tracking data
   */
  private cleanupRateLimitTracking(): void {
    const oneMinuteAgo = Date.now() - 60000;
    
    for (const [key, times] of this.rateLimitTracker.requests) {
      this.rateLimitTracker.requests.set(key, times.filter(time => time > oneMinuteAgo));
    }
    
    for (const [key, times] of this.rateLimitTracker.tokens) {
      this.rateLimitTracker.tokens.set(key, times.filter(time => time > oneMinuteAgo));
    }
  }

  /**
   * Log HIPAA audit information
   */
  private async logHIPAAAudit(request: LLMRequest, response: LLMResponse, requestId: string): Promise<void> {
    const auditLog = {
      requestId,
      timestamp: new Date().toISOString(),
      agentId: request.metadata?.agentId,
      sessionId: request.metadata?.sessionId,
      model: request.model,
      tokenUsage: response.usage?.totalTokens || 0,
      responseTime: Date.now() - response.timestamp,
      dataResidency: this.config.hipaaCompliance.dataResidency,
      encryptionInTransit: this.config.hipaaCompliance.encryptionInTransit,
    };

    // In production, this would be sent to a HIPAA-compliant logging service
    if (this.config.monitoring.logLevel === 'debug') {
      console.log('HIPAA Audit Log:', auditLog);
    }
  }
}