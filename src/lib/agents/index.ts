/**
 * FACET Multi-Agent Therapy System
 * Exports for all therapeutic agents and related utilities
 */

// Core types and interfaces
export * from './types';

// Base agent class
export { BaseAgent } from './BaseAgent';

// Specialized therapy agents
export { CulturalIntegrationAgent } from './CulturalIntegrationAgent';
export { CrisisInterventionAgent } from './CrisisInterventionAgent';
export { CognitiveBehavioralAgent } from './CognitiveBehavioralAgent';
export { MindfulnessAgent } from './MindfulnessAgent';
export { FamilyTherapyAgent } from './FamilyTherapyAgent';
export { ProgressTrackingAgent } from './ProgressTrackingAgent';

// Agent management
export { AgentRegistry, agentRegistry } from './AgentRegistry';

// Agent system overview for documentation
export const FACET_AGENT_SYSTEM = {
  description: 'FACET Multi-Agent Therapy Platform with 10+ Specialized Therapeutic Agents',
  version: '1.0.0',
  
  agents: [
    {
      id: 'cultural_integration_001',
      name: 'Dr. Maya Patel',
      type: 'Cultural Integration Agent',
      specialty: 'Cross-cultural psychology, cultural identity, acculturation support',
      key_features: [
        'Cultural assessment and formulation',
        'Traditional healing integration',
        'Acculturation stress support',
        'Intergenerational cultural bridging'
      ]
    },
    {
      id: 'crisis_intervention_001', 
      name: 'Dr. Sarah Chen',
      type: 'Crisis Intervention Agent',
      specialty: 'Crisis psychology, suicide prevention, emergency mental health',
      key_features: [
        '24/7 crisis response protocols',
        'Suicide risk assessment',
        'Emergency safety planning',
        'Crisis de-escalation techniques'
      ]
    },
    {
      id: 'cognitive_behavioral_001',
      name: 'Dr. Rebecca Martinez', 
      type: 'Cognitive Behavioral Agent',
      specialty: 'CBT interventions, thought pattern analysis, behavioral change',
      key_features: [
        'Cognitive distortion identification',
        'Thought challenging techniques',
        'Behavioral activation strategies',
        'Skills training and homework'
      ]
    },
    {
      id: 'mindfulness_meditation_001',
      name: 'Dr. Zen Nakamura',
      type: 'Mindfulness & Meditation Agent', 
      specialty: 'Mindfulness-based interventions, contemplative practices',
      key_features: [
        'MBSR and MBCT protocols',
        'Culturally-adapted meditation',
        'Present-moment awareness training',
        'Stress reduction techniques'
      ]
    },
    {
      id: 'family_therapy_001',
      name: 'Dr. Maria Gonzalez-Kim',
      type: 'Family Therapy Agent',
      specialty: 'Family systems therapy, relationship dynamics',
      key_features: [
        'Family systems analysis', 
        'Intergenerational trauma healing',
        'Cultural family integration',
        'Relationship pattern work'
      ]
    },
    {
      id: 'progress_tracking_001',
      name: 'Dr. Angela Data-Chen',
      type: 'Progress Tracking Agent',
      specialty: 'Clinical outcomes, therapeutic progress measurement',
      key_features: [
        'Systematic progress monitoring',
        'Goal achievement tracking',
        'Outcome measurement',
        'Data-driven treatment planning'
      ]
    }
  ],

  capabilities: {
    cultural_responsiveness: [
      'Latino/Hispanic cultural integration',
      'Asian/Pacific Islander family dynamics', 
      'African/Caribbean community healing',
      'Indigenous traditional practices',
      'Middle Eastern/Arab spiritual integration',
      'Multicultural identity support'
    ],
    
    intervention_types: [
      'Crisis intervention and safety planning',
      'Cognitive behavioral therapy techniques',
      'Mindfulness and meditation guidance',
      'Family systems therapy',
      'Cultural healing practices',
      'Progress monitoring and outcome tracking'
    ],

    evidence_base: [
      'Evidence-based therapeutic approaches',
      'Culturally-adapted interventions', 
      'Traditional wisdom integration',
      'Clinical outcome research',
      'Multicultural psychology principles',
      'Trauma-informed care practices'
    ]
  },

  collaboration_features: [
    'Multi-agent consultation and coordination',
    'Automatic crisis escalation protocols',
    'Cross-agent knowledge sharing',
    'Culturally-responsive agent selection',
    'Progress tracking across all interventions',
    'Integrated therapeutic planning'
  ],

  technical_architecture: {
    base_agent_system: 'Extensible BaseAgent class with cultural adaptation',
    agent_registry: 'Centralized agent management and routing',
    interaction_handling: 'Standardized interaction protocols',
    collaboration_framework: 'Agent-to-agent consultation system',
    progress_tracking: 'Integrated outcome measurement',
    cultural_content: 'Extensive cultural wisdom database'
  }
};