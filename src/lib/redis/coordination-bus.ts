/**
 * FACET Redis Coordination Bus
 * HIPAA-compliant event-driven agent communication with encryption
 */

import Redis, { Redis as RedisClient } from 'ioredis';
import { EventEmitter } from 'events';
import { nanoid } from 'nanoid';
import crypto from 'crypto';
import { RedisMessage, CoordinationEvent } from '../agents/agent-types';

export interface EncryptionConfig {
  enabled: boolean;
  key?: string;
  algorithm?: string;
}

export interface CoordinationBusConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
    retryDelayOnFailover?: number;
    maxRetriesPerRequest?: number;
    lazyConnect?: boolean;
  };
  encryption: EncryptionConfig;
  messageRetention: {
    ttlSeconds: number;
    maxMessages: number;
  };
  performance: {
    batchSize: number;
    flushInterval: number;
    compressionEnabled: boolean;
  };
}

export class CoordinationBus extends EventEmitter {
  private readonly config: CoordinationBusConfig;
  private readonly publisher: RedisClient;
  private readonly subscriber: RedisClient;
  private readonly client: RedisClient;
  private readonly subscriptions: Map<string, Set<(channel: string, message: string) => void>> = new Map();
  private readonly messageQueue: RedisMessage[] = [];
  private readonly performanceMetrics = {
    messagesPublished: 0,
    messagesReceived: 0,
    totalLatency: 0,
    errorCount: 0,
    lastHealthCheck: Date.now(),
  };
  
  private flushTimer?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(config: CoordinationBusConfig) {
    super();
    this.config = config;

    // Initialize Redis clients
    const redisConfig = {
      ...config.redis,
      retryDelayOnFailover: config.redis.retryDelayOnFailover || 100,
      maxRetriesPerRequest: config.redis.maxRetriesPerRequest || 3,
      lazyConnect: config.redis.lazyConnect || true,
    };

    this.publisher = new Redis(redisConfig);
    this.subscriber = new Redis(redisConfig);
    this.client = new Redis(redisConfig);

    this.setupEventHandlers();
    this.startFlushTimer();
  }

  // ============================================================================
  // PUBLIC INTERFACE
  // ============================================================================

  /**
   * Initialize the coordination bus
   */
  async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.publisher.ping(),
        this.subscriber.ping(),
        this.client.ping(),
      ]);

      this.emit('initialized', {
        timestamp: Date.now(),
        config: {
          encryption: this.config.encryption.enabled,
          messageRetention: this.config.messageRetention.ttlSeconds,
        },
      });

    } catch (error) {
      throw new Error(`Failed to initialize coordination bus: ${error}`);
    }
  }

  /**
   * Publish a message to a specific channel
   */
  async publish(channel: string, message: RedisMessage): Promise<void> {
    try {
      const serializedMessage = await this.serializeMessage(message);
      
      if (this.config.performance.batchSize > 1) {
        this.messageQueue.push(message);
        if (this.messageQueue.length >= this.config.performance.batchSize) {
          await this.flushMessageQueue();
        }
      } else {
        await this.publishMessage(channel, serializedMessage);
      }

      this.performanceMetrics.messagesPublished++;

    } catch (error) {
      this.performanceMetrics.errorCount++;
      throw new Error(`Failed to publish message to ${channel}: ${error}`);
    }
  }

  /**
   * Subscribe to a channel pattern
   */
  async subscribe(
    pattern: string,
    handler: (channel: string, message: string) => void
  ): Promise<void> {
    try {
      if (!this.subscriptions.has(pattern)) {
        this.subscriptions.set(pattern, new Set());
        await this.subscriber.psubscribe(pattern);
      }

      this.subscriptions.get(pattern)!.add(handler);

    } catch (error) {
      throw new Error(`Failed to subscribe to pattern ${pattern}: ${error}`);
    }
  }

  /**
   * Unsubscribe from a channel pattern
   */
  async unsubscribe(
    pattern: string,
    handler?: (channel: string, message: string) => void
  ): Promise<void> {
    try {
      const handlers = this.subscriptions.get(pattern);
      if (!handlers) return;

      if (handler) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscriptions.delete(pattern);
          await this.subscriber.punsubscribe(pattern);
        }
      } else {
        this.subscriptions.delete(pattern);
        await this.subscriber.punsubscribe(pattern);
      }

    } catch (error) {
      throw new Error(`Failed to unsubscribe from pattern ${pattern}: ${error}`);
    }
  }

  /**
   * Broadcast coordination event to all agents
   */
  async broadcastCoordinationEvent(event: CoordinationEvent): Promise<void> {
    const message: RedisMessage = {
      type: 'coordination_event',
      correlationId: event.coordinationId || nanoid(),
      payload: event,
      timestamp: Date.now(),
      ttl: this.config.messageRetention.ttlSeconds,
    };

    await this.publish('coordination:broadcast', message);
  }

  /**
   * Send targeted message to specific agent
   */
  async sendToAgent(agentId: string, message: RedisMessage): Promise<void> {
    await this.publish(`agent:${agentId}:messages`, message);
  }

  /**
   * Send coordination request to multiple agents
   */
  async coordinateAgents(
    agentIds: string[],
    coordinationId: string,
    payload: any
  ): Promise<void> {
    const message: RedisMessage = {
      type: 'agent_request',
      correlationId: coordinationId,
      payload: {
        coordinationId,
        targetAgents: agentIds,
        ...payload,
      },
      timestamp: Date.now(),
      ttl: this.config.messageRetention.ttlSeconds,
    };

    // Send to each agent individually for targeted delivery
    await Promise.all(
      agentIds.map(agentId => this.sendToAgent(agentId, message))
    );
  }

  /**
   * Store coordination state for recovery
   */
  async storeCoordinationState(
    coordinationId: string,
    state: any,
    ttlSeconds?: number
  ): Promise<void> {
    const key = `coordination:state:${coordinationId}`;
    const serializedState = JSON.stringify(state);
    const ttl = ttlSeconds || this.config.messageRetention.ttlSeconds;

    if (this.config.encryption.enabled) {
      const encrypted = this.encrypt(serializedState);
      await this.client.setex(key, ttl, encrypted);
    } else {
      await this.client.setex(key, ttl, serializedState);
    }
  }

  /**
   * Retrieve coordination state
   */
  async getCoordinationState(coordinationId: string): Promise<any | null> {
    const key = `coordination:state:${coordinationId}`;
    const data = await this.client.get(key);
    
    if (!data) return null;

    try {
      const decrypted = this.config.encryption.enabled ? this.decrypt(data) : data;
      return JSON.parse(decrypted);
    } catch (error) {
      console.error(`Failed to deserialize coordination state ${coordinationId}:`, error);
      return null;
    }
  }

  /**
   * Health check for Redis connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      await Promise.all([
        this.publisher.ping(),
        this.subscriber.ping(),
        this.client.ping(),
      ]);

      this.performanceMetrics.lastHealthCheck = Date.now();
      return true;

    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): typeof this.performanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    try {
      // Flush any pending messages
      await this.flushMessageQueue();

      // Clear timers
      if (this.flushTimer) {
        clearInterval(this.flushTimer);
      }

      // Close Redis connections
      await Promise.all([
        this.publisher.quit(),
        this.subscriber.quit(),
        this.client.quit(),
      ]);

      this.emit('shutdown', {
        timestamp: Date.now(),
        metrics: this.performanceMetrics,
      });

    } catch (error) {
      console.error('Error during coordination bus shutdown:', error);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    // Handle subscriber messages
    this.subscriber.on('pmessage', async (pattern: string, channel: string, message: string) => {
      try {
        const handlers = this.subscriptions.get(pattern);
        if (handlers) {
          const deserializedMessage = await this.deserializeMessage(message);
          this.performanceMetrics.messagesReceived++;
          
          // Calculate latency
          const latency = Date.now() - deserializedMessage.timestamp;
          this.performanceMetrics.totalLatency += latency;

          handlers.forEach(handler => {
            try {
              handler(channel, message);
            } catch (error) {
              console.error(`Error in subscription handler for ${pattern}:`, error);
            }
          });
        }
      } catch (error) {
        this.performanceMetrics.errorCount++;
        console.error(`Error processing message on ${channel}:`, error);
      }
    });

    // Handle connection events
    this.publisher.on('connect', () => {
      this.emit('redis_connected', { client: 'publisher', timestamp: Date.now() });
    });

    this.subscriber.on('connect', () => {
      this.emit('redis_connected', { client: 'subscriber', timestamp: Date.now() });
    });

    this.client.on('connect', () => {
      this.emit('redis_connected', { client: 'client', timestamp: Date.now() });
    });

    // Handle errors
    [this.publisher, this.subscriber, this.client].forEach((redis, index) => {
      const clientName = ['publisher', 'subscriber', 'client'][index];
      
      redis.on('error', (error) => {
        this.performanceMetrics.errorCount++;
        this.emit('redis_error', {
          client: clientName,
          error: error.message,
          timestamp: Date.now(),
        });
      });

      redis.on('close', () => {
        this.emit('redis_disconnected', {
          client: clientName,
          timestamp: Date.now(),
        });
      });
    });
  }

  /**
   * Start message batching timer
   */
  private startFlushTimer(): void {
    if (this.config.performance.batchSize > 1) {
      this.flushTimer = setInterval(
        () => this.flushMessageQueue(),
        this.config.performance.flushInterval
      );
    }
  }

  /**
   * Flush queued messages
   */
  private async flushMessageQueue(): Promise<void> {
    if (this.messageQueue.length === 0 || this.isShuttingDown) return;

    try {
      const messages = this.messageQueue.splice(0);
      const pipeline = this.publisher.pipeline();

      for (const message of messages) {
        const serialized = await this.serializeMessage(message);
        // Extract channel from message metadata or use default
        const channel = (message.payload as any)?.channel || 'coordination:default';
        pipeline.publish(channel, serialized);
      }

      await pipeline.exec();

    } catch (error) {
      this.performanceMetrics.errorCount++;
      console.error('Error flushing message queue:', error);
    }
  }

  /**
   * Publish individual message
   */
  private async publishMessage(channel: string, message: string): Promise<void> {
    await this.publisher.publish(channel, message);
    
    // Store message for retention if configured
    if (this.config.messageRetention.ttlSeconds > 0) {
      const key = `messages:${channel}:${nanoid()}`;
      await this.client.setex(key, this.config.messageRetention.ttlSeconds, message);
    }
  }

  /**
   * Serialize message with optional encryption and compression
   */
  private async serializeMessage(message: RedisMessage): Promise<string> {
    let serialized = JSON.stringify(message);

    if (this.config.performance.compressionEnabled) {
      // Simple compression could be added here
      // For now, we'll skip compression to maintain simplicity
    }

    if (this.config.encryption.enabled) {
      serialized = this.encrypt(serialized);
    }

    return serialized;
  }

  /**
   * Deserialize message with optional decryption and decompression
   */
  private async deserializeMessage(data: string): Promise<RedisMessage> {
    let processed = data;

    if (this.config.encryption.enabled) {
      processed = this.decrypt(processed);
    }

    if (this.config.performance.compressionEnabled) {
      // Decompression would go here
    }

    return JSON.parse(processed);
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(data: string): string {
    if (!this.config.encryption.key) {
      throw new Error('Encryption key not provided');
    }

    const algorithm = this.config.encryption.algorithm || 'aes-256-gcm';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, this.config.encryption.key);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = (cipher as any).getAuthTag ? (cipher as any).getAuthTag().toString('hex') : '';
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decrypt(encryptedData: string): string {
    if (!this.config.encryption.key) {
      throw new Error('Encryption key not provided');
    }

    const algorithm = this.config.encryption.algorithm || 'aes-256-gcm';
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipher(algorithm, this.config.encryption.key);
    
    if (authTagHex && (decipher as any).setAuthTag) {
      (decipher as any).setAuthTag(Buffer.from(authTagHex, 'hex'));
    }
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}