/**
 * FACET Agent Registry
 * Central registry for managing all therapeutic agents
 */

import { BaseAgent } from './BaseAgent';
import { CulturalIntegrationAgent } from './CulturalIntegrationAgent';
import { CrisisInterventionAgent } from './CrisisInterventionAgent';
import { CognitiveBehavioralAgent } from './CognitiveBehavioralAgent';
import { MindfulnessAgent } from './MindfulnessAgent';
import { FamilyTherapyAgent } from './FamilyTherapyAgent';
import { ProgressTrackingAgent } from './ProgressTrackingAgent';
import { TherapeuticAgent, AgentInteraction, AgentCollaboration } from './types';

export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private agentCollaborations: AgentCollaboration[] = [];

  constructor() {
    this.initializeAgents();
  }

  /**
   * Initialize all therapeutic agents
   */
  private initializeAgents(): void {
    const agentInstances = [
      new CulturalIntegrationAgent(),
      new CrisisInterventionAgent(),
      new CognitiveBehavioralAgent(),
      new MindfulnessAgent(),
      new FamilyTherapyAgent(),
      new ProgressTrackingAgent()
    ];

    agentInstances.forEach(agent => {
      this.agents.set(agent['agent'].id, agent);
    });

    console.log(`Initialized ${this.agents.size} therapeutic agents`);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get agent by type
   */
  getAgentByType(agentType: string): BaseAgent | undefined {
    for (const agent of this.agents.values()) {
      if (agent['agent'].type === agentType) {
        return agent;
      }
    }
    return undefined;
  }

  /**
   * Get all agents
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by specialization
   */
  getAgentsBySpecialization(specialization: string): BaseAgent[] {
    return Array.from(this.agents.values()).filter(agent => 
      agent['agent'].cultural_specializations.some(spec => 
        spec.toLowerCase().includes(specialization.toLowerCase())
      )
    );
  }

  /**
   * Route user input to appropriate agent(s)
   */
  async routeInteraction(
    userInput: string,
    context: Record<string, any>,
    sessionId: string,
    userId: string
  ): Promise<AgentInteraction[]> {
    const interactions: AgentInteraction[] = [];
    const selectedAgents = this.selectAppropriateAgents(userInput, context);

    // Primary agent handles main interaction
    if (selectedAgents.primary) {
      const interaction = await selectedAgents.primary.interact(
        sessionId,
        userId,
        userInput,
        context
      );
      interactions.push(interaction);

      // Check if collaboration is needed
      if (interaction.escalation_required || selectedAgents.supporting.length > 0) {
        const collaborationResult = await this.coordinateAgentCollaboration(
          selectedAgents.primary,
          selectedAgents.supporting,
          interaction,
          context
        );
        
        if (collaborationResult) {
          interactions.push(...collaborationResult.interactions);
          this.agentCollaborations.push(collaborationResult.collaboration);
        }
      }
    }

    return interactions;
  }

  /**
   * Select appropriate agents based on user input and context
   */
  private selectAppropriateAgents(
    userInput: string,
    context: Record<string, any>
  ): { primary: BaseAgent | null; supporting: BaseAgent[] } {
    const agents = Array.from(this.agents.values());
    const agentScores: { agent: BaseAgent; score: number }[] = [];

    // Score each agent based on trigger keywords and context
    agents.forEach(agent => {
      let score = 0;

      // Check trigger keywords
      agent['agent'].intervention_triggers.forEach(trigger => {
        if (userInput.toLowerCase().includes(trigger.replace('_', ' '))) {
          score += 10;
        }
      });

      // Check response patterns
      agent['agent'].response_patterns.forEach(pattern => {
        pattern.trigger_keywords.forEach(keyword => {
          if (userInput.toLowerCase().includes(keyword.toLowerCase())) {
            score += 5;
          }
        });
      });

      // Check cultural specializations
      if (context.cultural_background) {
        agent['agent'].cultural_specializations.forEach(spec => {
          if (spec.toLowerCase().includes(context.cultural_background.toLowerCase())) {
            score += 15;
          }
        });
      }

      // Priority agents for specific situations
      if (this.isCrisisSituation(userInput)) {
        if (agent['agent'].type === 'crisis_intervention') score += 50;
      }

      if (this.isProgressInquiry(userInput)) {
        if (agent['agent'].type === 'progress_tracking') score += 30;
      }

      agentScores.push({ agent, score });
    });

    // Sort by score
    agentScores.sort((a, b) => b.score - a.score);

    // Select primary and supporting agents
    const primary = agentScores[0]?.score > 0 ? agentScores[0].agent : null;
    const supporting = agentScores
      .slice(1, 3)
      .filter(item => item.score > 5)
      .map(item => item.agent);

    return { primary, supporting };
  }

  /**
   * Coordinate collaboration between agents
   */
  private async coordinateAgentCollaboration(
    primaryAgent: BaseAgent,
    supportingAgents: BaseAgent[],
    primaryInteraction: AgentInteraction,
    context: Record<string, any>
  ): Promise<{
    interactions: AgentInteraction[];
    collaboration: AgentCollaboration;
  } | null> {
    
    if (supportingAgents.length === 0 && !primaryInteraction.escalation_required) {
      return null;
    }

    const collaborationInteractions: AgentInteraction[] = [];
    
    // If escalation required, involve crisis agent
    if (primaryInteraction.escalation_required) {
      const crisisAgent = this.getAgentByType('crisis_intervention');
      if (crisisAgent && crisisAgent !== primaryAgent) {
        const crisisInteraction = await crisisAgent.interact(
          primaryInteraction.session_id,
          primaryInteraction.user_id,
          `Escalation from ${primaryAgent['agent'].type}: ${primaryInteraction.response}`,
          { ...context, escalation_context: primaryInteraction }
        );
        collaborationInteractions.push(crisisInteraction);
      }
    }

    // Involve supporting agents for consultation
    for (const supportingAgent of supportingAgents.slice(0, 2)) { // Limit to 2 supporting agents
      if (this.shouldCollaborate(primaryAgent, supportingAgent, context)) {
        const consultation = await this.requestConsultation(
          supportingAgent,
          primaryInteraction,
          context
        );
        
        if (consultation) {
          collaborationInteractions.push(consultation);
        }
      }
    }

    const collaboration: AgentCollaboration = {
      primary_agent: primaryAgent['agent'].id,
      supporting_agents: supportingAgents.map(agent => agent['agent'].id),
      collaboration_type: primaryInteraction.escalation_required ? 'handoff' : 'consultation',
      context: `Primary interaction: ${primaryInteraction.interaction_type}`,
      outcome: `Generated ${collaborationInteractions.length} collaborative responses`,
      timestamp: new Date().toISOString()
    };

    return {
      interactions: collaborationInteractions,
      collaboration
    };
  }

  /**
   * Request consultation from supporting agent
   */
  private async requestConsultation(
    consultingAgent: BaseAgent,
    primaryInteraction: AgentInteraction,
    context: Record<string, any>
  ): Promise<AgentInteraction | null> {
    
    const consultationPrompt = `Consultation request from ${primaryInteraction.agent_id}. 
    User context: ${primaryInteraction.trigger}
    Primary response approach: ${primaryInteraction.interaction_type}
    Please provide complementary perspective or specialized insight.`;

    try {
      const consultation = await consultingAgent.interact(
        primaryInteraction.session_id,
        primaryInteraction.user_id,
        consultationPrompt,
        { ...context, consultation_mode: true, primary_agent: primaryInteraction.agent_id }
      );

      return consultation;
    } catch (error) {
      console.error(`Failed to get consultation from ${consultingAgent['agent'].type}:`, error);
      return null;
    }
  }

  /**
   * Determine if agents should collaborate
   */
  private shouldCollaborate(
    primaryAgent: BaseAgent,
    supportingAgent: BaseAgent,
    context: Record<string, any>
  ): boolean {
    const primaryType = primaryAgent['agent'].type;
    const supportingType = supportingAgent['agent'].type;

    // Check collaboration preferences
    const primaryPreferences = primaryAgent['agent'].collaboration_preferences;
    const supportingPreferences = supportingAgent['agent'].collaboration_preferences;

    return (
      primaryPreferences.includes(supportingType) ||
      supportingPreferences.includes(primaryType) ||
      primaryPreferences.includes('all_therapy_agents') ||
      supportingPreferences.includes('all_therapy_agents')
    );
  }

  /**
   * Check if situation requires crisis intervention
   */
  private isCrisisSituation(userInput: string): boolean {
    const crisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'hurt myself', 'self-harm',
      'overdose', 'can\'t go on', 'better off dead', 'no point living'
    ];

    return crisisKeywords.some(keyword => 
      userInput.toLowerCase().includes(keyword)
    );
  }

  /**
   * Check if user is asking about progress
   */
  private isProgressInquiry(userInput: string): boolean {
    const progressKeywords = [
      'am I getting better', 'progress', 'how am I doing', 'improvement',
      'goals', 'milestones', 'better', 'worse', 'stuck'
    ];

    return progressKeywords.some(keyword => 
      userInput.toLowerCase().includes(keyword)
    );
  }

  /**
   * Get agent statistics
   */
  getAgentStats(): {
    total_agents: number;
    active_agents: number;
    agent_types: string[];
    cultural_specializations: string[];
    total_collaborations: number;
  } {
    const agents = Array.from(this.agents.values());
    
    return {
      total_agents: agents.length,
      active_agents: agents.filter(agent => agent['agent'].active).length,
      agent_types: [...new Set(agents.map(agent => agent['agent'].type))],
      cultural_specializations: [
        ...new Set(agents.flatMap(agent => agent['agent'].cultural_specializations))
      ],
      total_collaborations: this.agentCollaborations.length
    };
  }

  /**
   * Get recent collaborations
   */
  getRecentCollaborations(limit: number = 10): AgentCollaboration[] {
    return this.agentCollaborations
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistry();