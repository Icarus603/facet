/**
 * FACET Analytics Store
 * Zustand store for managing analytics and visualization data
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  ProgressMetric, 
  SessionData, 
  CulturalMetric, 
  AgentStatus,
  AgentCoordinationFlow,
  AgentPerformanceMetric,
  CrisisAlert,
  TherapyAnalytics,
  DashboardMetrics,
  CulturalProfile,
  SafetyPlan
} from '@/types/analytics';

interface AnalyticsState {
  // Data
  progressMetrics: ProgressMetric[];
  sessionHistory: SessionData[];
  culturalMetrics: CulturalMetric[];
  agentStatuses: AgentStatus[];
  coordinationFlows: AgentCoordinationFlow[];
  performanceMetrics: AgentPerformanceMetric[];
  crisisAlerts: CrisisAlert[];
  therapyAnalytics: TherapyAnalytics | null;
  dashboardMetrics: DashboardMetrics | null;
  culturalProfile: CulturalProfile | null;
  safetyPlan: SafetyPlan | null;
  
  // UI State
  selectedTimeRange: '7d' | '30d' | '90d' | '1y';
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Real-time updates
  realtimeEnabled: boolean;
  updateInterval: number;
  
  // Filters
  filters: {
    agents?: string[];
    culturalThemes?: string[];
    riskLevels?: string[];
    dateRange?: { start: Date; end: Date };
  };
  
  // Actions
  setProgressMetrics: (metrics: ProgressMetric[]) => void;
  addProgressMetric: (metric: ProgressMetric) => void;
  setSessionHistory: (sessions: SessionData[]) => void;
  addSession: (session: SessionData) => void;
  setCulturalMetrics: (metrics: CulturalMetric[]) => void;
  setAgentStatuses: (statuses: AgentStatus[]) => void;
  updateAgentStatus: (agentId: string, status: Partial<AgentStatus>) => void;
  addCoordinationFlow: (flow: AgentCoordinationFlow) => void;
  setPerformanceMetrics: (metrics: AgentPerformanceMetric[]) => void;
  setCrisisAlerts: (alerts: CrisisAlert[]) => void;
  addCrisisAlert: (alert: CrisisAlert) => void;
  resolveCrisisAlert: (alertId: string, resolution: string) => void;
  setTherapyAnalytics: (analytics: TherapyAnalytics) => void;
  setDashboardMetrics: (metrics: DashboardMetrics) => void;
  setCulturalProfile: (profile: CulturalProfile) => void;
  setSafetyPlan: (plan: SafetyPlan) => void;
  updateSafetyPlan: (updates: Partial<SafetyPlan>) => void;
  
  // UI Actions
  setTimeRange: (range: '7d' | '30d' | '90d' | '1y') => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<AnalyticsState['filters']>) => void;
  clearFilters: () => void;
  
  // Real-time Actions
  enableRealtime: () => void;
  disableRealtime: () => void;
  setUpdateInterval: (interval: number) => void;
  
  // Data Actions
  refreshData: () => Promise<void>;
  exportData: (format: 'csv' | 'json' | 'pdf') => Promise<void>;
  calculateTrends: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    progressMetrics: [],
    sessionHistory: [],
    culturalMetrics: [],
    agentStatuses: [],
    coordinationFlows: [],
    performanceMetrics: [],
    crisisAlerts: [],
    therapyAnalytics: null,
    dashboardMetrics: null,
    culturalProfile: null,
    safetyPlan: null,
    
    selectedTimeRange: '30d',
    isLoading: false,
    error: null,
    lastUpdated: null,
    
    realtimeEnabled: false,
    updateInterval: 30000, // 30 seconds
    
    filters: {},
    
    // Data Actions
    setProgressMetrics: (metrics) => set({ progressMetrics: metrics, lastUpdated: new Date() }),
    
    addProgressMetric: (metric) => set((state) => ({
      progressMetrics: [...state.progressMetrics, metric].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
      lastUpdated: new Date()
    })),
    
    setSessionHistory: (sessions) => set({ sessionHistory: sessions, lastUpdated: new Date() }),
    
    addSession: (session) => set((state) => ({
      sessionHistory: [...state.sessionHistory, session].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      lastUpdated: new Date()
    })),
    
    setCulturalMetrics: (metrics) => set({ culturalMetrics: metrics, lastUpdated: new Date() }),
    
    setAgentStatuses: (statuses) => set({ agentStatuses: statuses, lastUpdated: new Date() }),
    
    updateAgentStatus: (agentId, statusUpdate) => set((state) => ({
      agentStatuses: state.agentStatuses.map(agent => 
        agent.agent_id === agentId ? { ...agent, ...statusUpdate } : agent
      ),
      lastUpdated: new Date()
    })),
    
    addCoordinationFlow: (flow) => set((state) => ({
      coordinationFlows: [...state.coordinationFlows, flow].slice(-100), // Keep last 100 flows
      lastUpdated: new Date()
    })),
    
    setPerformanceMetrics: (metrics) => set({ performanceMetrics: metrics, lastUpdated: new Date() }),
    
    setCrisisAlerts: (alerts) => set({ crisisAlerts: alerts, lastUpdated: new Date() }),
    
    addCrisisAlert: (alert) => set((state) => ({
      crisisAlerts: [alert, ...state.crisisAlerts],
      lastUpdated: new Date()
    })),
    
    resolveCrisisAlert: (alertId, resolution) => set((state) => ({
      crisisAlerts: state.crisisAlerts.map(alert => 
        alert.alert_id === alertId 
          ? { ...alert, resolved_at: new Date().toISOString(), resolution_method: resolution }
          : alert
      ),
      lastUpdated: new Date()
    })),
    
    setTherapyAnalytics: (analytics) => set({ therapyAnalytics: analytics, lastUpdated: new Date() }),
    
    setDashboardMetrics: (metrics) => set({ dashboardMetrics: metrics, lastUpdated: new Date() }),
    
    setCulturalProfile: (profile) => set({ culturalProfile: profile }),
    
    setSafetyPlan: (plan) => set({ safetyPlan: plan }),
    
    updateSafetyPlan: (updates) => set((state) => ({
      safetyPlan: state.safetyPlan ? { ...state.safetyPlan, ...updates } : null
    })),
    
    // UI Actions
    setTimeRange: (range) => set({ selectedTimeRange: range }),
    
    setLoading: (loading) => set({ isLoading: loading }),
    
    setError: (error) => set({ error }),
    
    setFilters: (filters) => set((state) => ({
      filters: { ...state.filters, ...filters }
    })),
    
    clearFilters: () => set({ filters: {} }),
    
    // Real-time Actions
    enableRealtime: () => set({ realtimeEnabled: true }),
    
    disableRealtime: () => set({ realtimeEnabled: false }),
    
    setUpdateInterval: (interval) => set({ updateInterval: interval }),
    
    // Data Actions
    refreshData: async () => {
      const state = get();
      set({ isLoading: true, error: null });
      
      try {
        // In a real implementation, these would be API calls
        // For now, we'll simulate data loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate mock data based on time range
        const { selectedTimeRange } = state;
        const days = selectedTimeRange === '7d' ? 7 : 
                    selectedTimeRange === '30d' ? 30 : 
                    selectedTimeRange === '90d' ? 90 : 365;
        
        const mockProgressMetrics = generateMockProgressMetrics(days);
        const mockSessions = generateMockSessions(days);
        const mockCulturalMetrics = generateMockCulturalMetrics();
        
        set({
          progressMetrics: mockProgressMetrics,
          sessionHistory: mockSessions,
          culturalMetrics: mockCulturalMetrics,
          isLoading: false,
          lastUpdated: new Date()
        });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to refresh data',
          isLoading: false 
        });
      }
    },
    
    exportData: async (format) => {
      const state = get();
      set({ isLoading: true });
      
      try {
        // In a real implementation, this would call an export API
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const data = {
          progressMetrics: state.progressMetrics,
          sessionHistory: state.sessionHistory,
          culturalMetrics: state.culturalMetrics,
          exportedAt: new Date().toISOString()
        };
        
        // Simulate file download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `facet-analytics-${format}.${format === 'json' ? 'json' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        set({ isLoading: false });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to export data',
          isLoading: false 
        });
      }
    },
    
    calculateTrends: () => {
      const state = get();
      const { progressMetrics } = state;
      
      if (progressMetrics.length < 2) return;
      
      // Calculate trends for mood, anxiety, cultural integration
      const recent = progressMetrics.slice(-7); // Last 7 data points
      const older = progressMetrics.slice(-14, -7); // Previous 7 data points
      
      const recentAvg = {
        mood: recent.reduce((sum, m) => sum + m.mood_score, 0) / recent.length,
        anxiety: recent.reduce((sum, m) => sum + m.anxiety_level, 0) / recent.length,
        cultural: recent.reduce((sum, m) => sum + m.cultural_integration, 0) / recent.length
      };
      
      const olderAvg = {
        mood: older.reduce((sum, m) => sum + m.mood_score, 0) / older.length,
        anxiety: older.reduce((sum, m) => sum + m.anxiety_level, 0) / older.length,
        cultural: older.reduce((sum, m) => sum + m.cultural_integration, 0) / older.length
      };
      
      const trends = {
        user_progress: recentAvg.mood > olderAvg.mood ? 'up' : 
                      recentAvg.mood < olderAvg.mood ? 'down' : 'stable',
        system_performance: 'stable', // Would be calculated from agent metrics
        cultural_integration: recentAvg.cultural > olderAvg.cultural ? 'up' : 
                             recentAvg.cultural < olderAvg.cultural ? 'down' : 'stable'
      } as const;
      
      set((state) => ({
        dashboardMetrics: state.dashboardMetrics ? {
          ...state.dashboardMetrics,
          trends
        } : null
      }));
    }
  }))
);

// Mock data generators for development
function generateMockProgressMetrics(days: number): ProgressMetric[] {
  const metrics: ProgressMetric[] = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const baseProgress = Math.min(50 + (days - i) * 0.5, 85); // Gradual improvement
    const variance = 10;
    
    metrics.push({
      date: date.toISOString().split('T')[0],
      mood_score: Math.max(0, Math.min(100, baseProgress + (Math.random() - 0.5) * variance)),
      anxiety_level: Math.max(0, Math.min(100, 100 - baseProgress + (Math.random() - 0.5) * variance)),
      cultural_integration: Math.max(0, Math.min(100, baseProgress * 0.8 + (Math.random() - 0.5) * variance)),
      therapeutic_alliance: Math.max(0, Math.min(100, baseProgress * 0.9 + (Math.random() - 0.5) * variance)),
      session_satisfaction: Math.max(0, Math.min(100, baseProgress * 0.95 + (Math.random() - 0.5) * variance))
    });
  }
  
  return metrics;
}

function generateMockSessions(days: number): SessionData[] {
  const sessions: SessionData[] = [];
  const now = new Date();
  const agents = ['intake', 'therapy_coordinator', 'cultural_adapter', 'crisis_monitor', 'progress_tracker'];
  
  for (let i = days - 1; i >= 0; i -= Math.floor(Math.random() * 3) + 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    sessions.push({
      session_id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: date.toISOString(),
      duration: Math.floor(Math.random() * 45) + 30, // 30-75 minutes
      satisfaction_rating: Math.floor(Math.random() * 40) + 60, // 60-100
      agents_involved: agents.slice(0, Math.floor(Math.random() * 3) + 1) as any,
      cultural_content_used: ['family_dynamics', 'cultural_expression', 'traditional_coping'],
      mood_before: Math.floor(Math.random() * 50) + 30,
      mood_after: Math.floor(Math.random() * 30) + 60,
      key_insights: [
        'Improved emotional regulation through cultural grounding techniques',
        'Strong therapeutic alliance established',
        'Effective integration of family support systems'
      ]
    });
  }
  
  return sessions.reverse();
}

function generateMockCulturalMetrics(): CulturalMetric[] {
  const themes = [
    'Family Dynamics',
    'Traditional Medicine',
    'Spiritual Practices',
    'Community Support',
    'Cultural Expression',
    'Language Integration',
    'Generational Differences',
    'Cultural Identity'
  ];
  
  return themes.map(theme => ({
    cultural_theme: theme,
    relevance_score: Math.random() * 40 + 60, // 60-100
    usage_frequency: Math.random() * 50 + 20, // 20-70
    user_feedback: Math.random() * 30 + 70, // 70-100
    expert_validation: Math.random() > 0.3,
    effectiveness_rating: Math.random() * 30 + 70,
    bias_score: Math.random() * 20 + 10,
    cultural_dimensions: {
      collectivism: Math.random() * 100,
      powerDistance: Math.random() * 100,
      uncertaintyAvoidance: Math.random() * 100,
      masculinity: Math.random() * 100,
      longTermOrientation: Math.random() * 100,
      indulgence: Math.random() * 100
    }
  }));
}

// Subscribe to real-time updates
if (typeof window !== 'undefined') {
  let intervalId: NodeJS.Timeout;
  
  useAnalyticsStore.subscribe(
    (state) => state.realtimeEnabled,
    (realtimeEnabled) => {
      if (realtimeEnabled) {
        const updateInterval = useAnalyticsStore.getState().updateInterval;
        intervalId = setInterval(() => {
          // Simulate real-time updates
          const state = useAnalyticsStore.getState();
          if (Math.random() > 0.7) { // 30% chance of update
            const newMetric = generateMockProgressMetrics(1)[0];
            state.addProgressMetric(newMetric);
          }
        }, updateInterval);
      } else {
        clearInterval(intervalId);
      }
    }
  );
}