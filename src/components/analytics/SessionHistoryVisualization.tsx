/**
 * SessionHistoryVisualization Component
 * Timeline view of therapy sessions with agent involvement and cultural content tracking
 */

'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ComposedChart,
  Line,
  ReferenceLine
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, subDays, isWithinInterval } from 'date-fns';
import { SessionHistoryVisualizationProps, SessionData } from '@/types/analytics';
import { AgentType } from '@/types/chat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Clock,
  Star,
  Users,
  TrendingUp,
  Filter,
  Calendar,
  ChevronRight,
  Heart,
  Brain,
  Globe,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AGENT_COLORS: Record<AgentType, string> = {
  intake: '#6B73FF',
  therapy_coordinator: '#845EC2',
  cultural_adapter: '#00C896',
  crisis_monitor: '#FF6B9D',
  progress_tracker: '#C08552'
};

const AGENT_ICONS: Record<AgentType, React.ComponentType<any>> = {
  intake: Users,
  therapy_coordinator: Heart,
  cultural_adapter: Globe,
  crisis_monitor: AlertTriangle,
  progress_tracker: TrendingUp
};

interface SessionVisualizationData {
  date: string;
  formattedDate: string;
  duration: number;
  satisfaction: number;
  agentCount: number;
  culturalContentCount: number;
  moodImprovement: number;
  sessionId: string;
  agentsInvolved: AgentType[];
  culturalThemes: string[];
  originalSession: SessionData;
}

export default function SessionHistoryVisualization({
  sessions,
  timeRange,
  filterBy,
  className,
  onSessionClick
}: SessionHistoryVisualizationProps) {
  const [selectedView, setSelectedView] = useState<'timeline' | 'satisfaction' | 'agents' | 'cultural'>('timeline');
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Process session data for visualization
  const visualizationData = useMemo(() => {
    let filteredSessions = sessions;

    // Apply time range filter
    if (timeRange) {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const endDate = new Date();
      const startDate = subDays(endDate, days);

      filteredSessions = filteredSessions.filter(session => {
        const sessionDate = parseISO(session.date);
        return isWithinInterval(sessionDate, { start: startDate, end: endDate });
      });
    }

    // Apply additional filters
    if (filterBy) {
      if (filterBy.agents?.length) {
        filteredSessions = filteredSessions.filter(session =>
          filterBy.agents!.some(agent => session.agents_involved.includes(agent as AgentType))
        );
      }
      if (filterBy.satisfaction_min !== undefined) {
        filteredSessions = filteredSessions.filter(session =>
          session.satisfaction_rating >= filterBy.satisfaction_min!
        );
      }
      if (filterBy.cultural_themes?.length) {
        filteredSessions = filteredSessions.filter(session =>
          filterBy.cultural_themes!.some(theme =>
            session.cultural_content_used.includes(theme)
          )
        );
      }
    }

    return filteredSessions
      .map(session => ({
        date: session.date,
        formattedDate: format(parseISO(session.date), 'MMM dd'),
        duration: session.duration,
        satisfaction: session.satisfaction_rating,
        agentCount: session.agents_involved.length,
        culturalContentCount: session.cultural_content_used.length,
        moodImprovement: session.mood_after - session.mood_before,
        sessionId: session.session_id,
        agentsInvolved: session.agents_involved,
        culturalThemes: session.cultural_content_used,
        originalSession: session
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions, timeRange, filterBy]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (visualizationData.length === 0) return null;

    const totalSessions = visualizationData.length;
    const avgDuration = visualizationData.reduce((sum, session) => sum + session.duration, 0) / totalSessions;
    const avgSatisfaction = visualizationData.reduce((sum, session) => sum + session.satisfaction, 0) / totalSessions;
    const avgMoodImprovement = visualizationData.reduce((sum, session) => sum + session.moodImprovement, 0) / totalSessions;
    
    const agentUsage = visualizationData.reduce((acc, session) => {
      session.agentsInvolved.forEach(agent => {
        acc[agent] = (acc[agent] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const mostUsedAgent = Object.entries(agentUsage).reduce((max, [agent, count]) =>
      count > max.count ? { agent, count } : max, { agent: '', count: 0 }
    );

    return {
      totalSessions,
      avgDuration: Math.round(avgDuration),
      avgSatisfaction: Math.round(avgSatisfaction),
      avgMoodImprovement: Math.round(avgMoodImprovement),
      mostUsedAgent: mostUsedAgent.agent as AgentType,
      agentUsage
    };
  }, [visualizationData]);

  const handleSessionClick = (data: any) => {
    if (data && data.originalSession) {
      setSelectedSession(data.originalSession);
      onSessionClick?.(data.originalSession);
    }
  };

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-lg max-w-xs"
      >
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-gray-600" />
            <span className="text-sm">{data.duration} minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-3 h-3 text-yellow-500" />
            <span className="text-sm">Satisfaction: {data.satisfaction}%</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span className="text-sm">Mood: +{data.moodImprovement}</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-600 mb-1">Agents Involved:</p>
          <div className="flex flex-wrap gap-1">
            {data.agentsInvolved.map((agent: AgentType) => (
              <Badge 
                key={agent} 
                variant="secondary" 
                className="text-xs"
                style={{ backgroundColor: AGENT_COLORS[agent] + '20', color: AGENT_COLORS[agent] }}
              >
                {agent.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSummaryStats = () => {
    if (!summaryStats) return null;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Sessions</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{summaryStats.totalSessions}</p>
        </div>
        
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800">Avg Duration</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{summaryStats.avgDuration}m</p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Satisfaction</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{summaryStats.avgSatisfaction}%</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Mood Improvement</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">+{summaryStats.avgMoodImprovement}</p>
        </div>
      </div>
    );
  };

  const renderViewSelector = () => (
    <div className="flex gap-2 mb-4">
      {[
        { key: 'timeline', label: 'Timeline', icon: Calendar },
        { key: 'satisfaction', label: 'Satisfaction', icon: Star },
        { key: 'agents', label: 'Agents', icon: Users },
        { key: 'cultural', label: 'Cultural', icon: Globe }
      ].map(({ key, label, icon: Icon }) => (
        <Button
          key={key}
          variant={selectedView === key ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedView(key as any)}
          className="text-xs"
        >
          <Icon className="w-3 h-3 mr-1" />
          {label}
        </Button>
      ))}
    </div>
  );

  const renderChart = () => {
    switch (selectedView) {
      case 'timeline':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={visualizationData} onClick={handleSessionClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="formattedDate" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis yAxisId="duration" orientation="left" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis yAxisId="satisfaction" orientation="right" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip content={renderTooltip} />
              <Bar 
                yAxisId="duration"
                dataKey="duration" 
                fill="#6B73FF" 
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Line 
                yAxisId="satisfaction"
                type="monotone" 
                dataKey="satisfaction" 
                stroke="#00C896" 
                strokeWidth={3}
                dot={{ fill: '#00C896', strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      case 'satisfaction':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={visualizationData} onClick={handleSessionClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="duration" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis dataKey="satisfaction" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip content={renderTooltip} />
              <Scatter dataKey="satisfaction" fill="#FF6B9D">
                {visualizationData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.satisfaction >= 80 ? '#00C896' : entry.satisfaction >= 60 ? '#C08552' : '#FF6B9D'} 
                  />
                ))}
              </Scatter>
              <ReferenceLine y={80} stroke="#00C896" strokeDasharray="5 5" label="Excellent" />
              <ReferenceLine y={60} stroke="#C08552" strokeDasharray="5 5" label="Good" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'agents':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visualizationData} onClick={handleSessionClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="formattedDate" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip content={renderTooltip} />
              <Bar dataKey="agentCount" radius={[4, 4, 0, 0]}>
                {visualizationData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={AGENT_COLORS[entry.agentsInvolved[0]] || '#6B73FF'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'cultural':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={visualizationData} onClick={handleSessionClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="formattedDate" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis yAxisId="count" orientation="left" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis yAxisId="mood" orientation="right" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip content={renderTooltip} />
              <Bar 
                yAxisId="count"
                dataKey="culturalContentCount" 
                fill="#00C896" 
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Line 
                yAxisId="mood"
                type="monotone" 
                dataKey="moodImprovement" 
                stroke="#845EC2" 
                strokeWidth={3}
                dot={{ fill: '#845EC2', strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900">
            Session History & Analysis
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-xs"
          >
            <Filter className="w-4 h-4 mr-1" />
            Filters
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <p className="text-sm font-medium text-gray-700 mb-2">Filter Options</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-600">Min Satisfaction</label>
                  <div className="flex gap-2 mt-1">
                    {[60, 70, 80, 90].map(threshold => (
                      <Button
                        key={threshold}
                        variant={filterBy?.satisfaction_min === threshold ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                      >
                        {threshold}%
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Agents</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(AGENT_COLORS).map(([agent, color]) => (
                      <Badge
                        key={agent}
                        variant="outline"
                        className="text-xs cursor-pointer"
                        style={{ borderColor: color, color }}
                      >
                        {agent.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Cultural Themes</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {['family_dynamics', 'cultural_expression', 'traditional_coping'].map(theme => (
                      <Badge
                        key={theme}
                        variant="outline"
                        className="text-xs cursor-pointer"
                      >
                        {theme.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {renderSummaryStats()}
        {renderViewSelector()}

        <div className="w-full h-80 lg:h-96">
          {renderChart()}
        </div>

        {/* Agent usage summary */}
        {summaryStats && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-3">Agent Involvement Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(summaryStats.agentUsage).map(([agent, count]) => {
                const AgentIcon = AGENT_ICONS[agent as AgentType];
                const percentage = Math.round((count / summaryStats.totalSessions) * 100);
                
                return (
                  <div key={agent} className="flex items-center gap-3 p-3 bg-white rounded border">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: AGENT_COLORS[agent as AgentType] + '20' }}
                    >
                      <AgentIcon 
                        className="w-4 h-4" 
                        style={{ color: AGENT_COLORS[agent as AgentType] }} 
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">
                        {agent.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-600">{count} sessions ({percentage}%)</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected session details */}
        <AnimatePresence>
          {selectedSession && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">
                  Session Details - {format(parseISO(selectedSession.date), 'MMM dd, yyyy')}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Session Metrics</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Duration:</span>
                      <span className="text-sm font-medium">{selectedSession.duration} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Satisfaction:</span>
                      <span className="text-sm font-medium">{selectedSession.satisfaction_rating}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Mood Change:</span>
                      <span className="text-sm font-medium">
                        {selectedSession.mood_before} → {selectedSession.mood_after}
                        <span className="text-emerald-600 ml-1">
                          (+{selectedSession.mood_after - selectedSession.mood_before})
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-800 mb-2">Key Insights</h5>
                  <ul className="space-y-1">
                    {selectedSession.key_insights.map((insight, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Agents Involved</h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedSession.agents_involved.map(agent => (
                        <Badge 
                          key={agent}
                          className="text-xs"
                          style={{ 
                            backgroundColor: AGENT_COLORS[agent] + '20', 
                            color: AGENT_COLORS[agent],
                            borderColor: AGENT_COLORS[agent]
                          }}
                        >
                          {agent.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-gray-800 mb-2">Cultural Content</h5>
                    <div className="flex flex-wrap gap-2">
                      {selectedSession.cultural_content_used.map(content => (
                        <Badge 
                          key={content}
                          variant="outline"
                          className="text-xs"
                        >
                          {content.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}