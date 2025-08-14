/**
 * FACET Chat History Management
 * Session storage, search, and persistence utilities
 */

import { ChatSession, ChatMessage } from './types';

export class ChatHistoryManager {
  private storageKey = 'facet_chat_sessions';
  private maxSessions = 50;
  private maxMessagesPerSession = 1000;

  /**
   * Save a chat session to local storage
   */
  saveSession(session: ChatSession): void {
    try {
      const sessions = this.getAllSessions();
      const existingIndex = sessions.findIndex(s => s.id === session.id);
      
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.unshift(session);
      }

      // Limit number of sessions
      const limitedSessions = sessions.slice(0, this.maxSessions);
      
      // Limit messages per session to prevent storage bloat
      const optimizedSessions = limitedSessions.map(s => ({
        ...s,
        messages: s.messages.slice(-this.maxMessagesPerSession)
      }));

      localStorage.setItem(this.storageKey, JSON.stringify(optimizedSessions));
    } catch (error) {
      console.error('Failed to save chat session:', error);
    }
  }

  /**
   * Load a specific chat session
   */
  getSession(sessionId: string): ChatSession | null {
    try {
      const sessions = this.getAllSessions();
      return sessions.find(s => s.id === sessionId) || null;
    } catch (error) {
      console.error('Failed to load chat session:', error);
      return null;
    }
  }

  /**
   * Get all chat sessions for a user
   */
  getAllSessions(): ChatSession[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];

      const sessions = JSON.parse(stored) as ChatSession[];
      
      // Convert timestamps back to Date objects
      return sessions.map(session => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : undefined,
        messages: session.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })),
        agentHandoffs: session.agentHandoffs.map(handoff => ({
          ...handoff,
          timestamp: new Date(handoff.timestamp)
        }))
      }));
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      return [];
    }
  }

  /**
   * Delete a specific session
   */
  deleteSession(sessionId: string): void {
    try {
      const sessions = this.getAllSessions();
      const filteredSessions = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredSessions));
    } catch (error) {
      console.error('Failed to delete chat session:', error);
    }
  }

  /**
   * Clear all chat history
   */
  clearAllSessions(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear chat sessions:', error);
    }
  }

  /**
   * Search messages across all sessions
   */
  searchMessages(query: string, options: {
    sessionId?: string;
    agentType?: string;
    maxResults?: number;
    dateRange?: { start: Date; end: Date };
  } = {}): Array<{ session: ChatSession; message: ChatMessage; index: number }> {
    const sessions = options.sessionId 
      ? [this.getSession(options.sessionId)].filter(Boolean) as ChatSession[]
      : this.getAllSessions();

    const results: Array<{ session: ChatSession; message: ChatMessage; index: number }> = [];
    const searchTerm = query.toLowerCase();

    for (const session of sessions) {
      for (let i = 0; i < session.messages.length; i++) {
        const message = session.messages[i];
        
        // Filter by agent type
        if (options.agentType && message.agentType !== options.agentType) {
          continue;
        }

        // Filter by date range
        if (options.dateRange) {
          const messageTime = message.timestamp.getTime();
          const startTime = options.dateRange.start.getTime();
          const endTime = options.dateRange.end.getTime();
          
          if (messageTime < startTime || messageTime > endTime) {
            continue;
          }
        }

        // Search message content
        if (message.content.toLowerCase().includes(searchTerm)) {
          results.push({ session, message, index: i });
          
          if (options.maxResults && results.length >= options.maxResults) {
            return results;
          }
        }
      }
    }

    return results.sort((a, b) => 
      b.message.timestamp.getTime() - a.message.timestamp.getTime()
    );
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): {
    messageCount: number;
    agentSwitches: number;
    duration: number;
    avgResponseTime: number;
    messagesByAgent: Record<string, number>;
  } | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const messageCount = session.messages.length;
    const agentSwitches = session.agentHandoffs.length;
    const duration = session.endTime 
      ? session.endTime.getTime() - session.startTime.getTime()
      : Date.now() - session.startTime.getTime();

    // Calculate average response time between user messages and agent responses
    const responseTimes: number[] = [];
    for (let i = 0; i < session.messages.length - 1; i++) {
      const current = session.messages[i];
      const next = session.messages[i + 1];
      
      if (current.type === 'user' && next.type === 'agent') {
        responseTimes.push(next.timestamp.getTime() - current.timestamp.getTime());
      }
    }

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    // Count messages by agent
    const messagesByAgent: Record<string, number> = {};
    session.messages.forEach(msg => {
      if (msg.agentType) {
        messagesByAgent[msg.agentType] = (messagesByAgent[msg.agentType] || 0) + 1;
      }
    });

    return {
      messageCount,
      agentSwitches,
      duration,
      avgResponseTime,
      messagesByAgent
    };
  }

  /**
   * Export session data for backup or sharing
   */
  exportSession(sessionId: string): string | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    return JSON.stringify(session, null, 2);
  }

  /**
   * Import session data from backup
   */
  importSession(sessionData: string): boolean {
    try {
      const session = JSON.parse(sessionData) as ChatSession;
      this.saveSession(session);
      return true;
    } catch (error) {
      console.error('Failed to import session:', error);
      return false;
    }
  }

  /**
   * Get recent sessions
   */
  getRecentSessions(limit = 10): ChatSession[] {
    const sessions = this.getAllSessions();
    return sessions
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, limit);
  }

  /**
   * Get session summary for quick preview
   */
  getSessionSummary(sessionId: string): {
    id: string;
    startTime: Date;
    endTime?: Date;
    messageCount: number;
    lastMessage?: string;
    primaryAgent?: string;
    status: 'active' | 'paused' | 'ended';
  } | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const lastMessage = session.messages[session.messages.length - 1];
    const primaryAgent = session.messages
      .filter(m => m.agentType)
      .reduce((acc, msg) => {
        const agent = msg.agentType!;
        acc[agent] = (acc[agent] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const mostActiveAgent = Object.entries(primaryAgent)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    return {
      id: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      messageCount: session.messages.length,
      lastMessage: lastMessage?.content.slice(0, 100) + (lastMessage?.content.length > 100 ? '...' : ''),
      primaryAgent: mostActiveAgent,
      status: session.status
    };
  }
}

// Singleton instance
export const chatHistory = new ChatHistoryManager();