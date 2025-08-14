/**
 * CulturalIntegrationMetrics Component
 * Radar chart and heatmap visualization for cultural content effectiveness
 */

'use client';

import React, { useMemo, useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { CulturalIntegrationMetricsProps, CulturalMetric } from '@/types/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Globe,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  BarChart3,
  PieChart as PieChartIcon,
  Radar as RadarIcon,
  Filter,
  Star,
  Users,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CULTURAL_DIMENSION_COLORS = {
  collectivism: '#6B73FF',
  powerDistance: '#845EC2',
  uncertaintyAvoidance: '#00C896',
  masculinity: '#FF6B9D',
  longTermOrientation: '#C08552',
  indulgence: '#FFA726'
};

const BIAS_SEVERITY_COLORS = {
  low: '#00C896',
  medium: '#FFA726',
  high: '#FF6B9D',
  critical: '#F44336'
};

interface ProcessedCulturalData {
  theme: string;
  relevance: number;
  usage: number;
  feedback: number;
  effectiveness: number;
  biasScore: number;
  biasLevel: 'low' | 'medium' | 'high' | 'critical';
  validated: boolean;
  dimensions: Array<{
    dimension: string;
    value: number;
    color: string;
  }>;
  originalMetric: CulturalMetric;
}

export default function CulturalIntegrationMetrics({
  metrics,
  culturalProfile,
  showBiasDetection = true,
  className,
  onMetricClick
}: CulturalIntegrationMetricsProps) {
  const [selectedView, setSelectedView] = useState<'radar' | 'bar' | 'heatmap'>('radar');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [showValidatedOnly, setShowValidatedOnly] = useState(false);
  const [biasThreshold, setBiasThreshold] = useState(30);

  // Process cultural metrics data
  const processedData = useMemo(() => {
    let filteredMetrics = metrics;

    if (showValidatedOnly) {
      filteredMetrics = filteredMetrics.filter(metric => metric.expert_validation);
    }

    return filteredMetrics.map(metric => {
      const biasLevel: 'low' | 'medium' | 'high' | 'critical' = 
        metric.bias_score <= 15 ? 'low' :
        metric.bias_score <= 30 ? 'medium' :
        metric.bias_score <= 50 ? 'high' : 'critical';

      return {
        theme: metric.cultural_theme,
        relevance: metric.relevance_score,
        usage: metric.usage_frequency,
        feedback: metric.user_feedback,
        effectiveness: metric.effectiveness_rating,
        biasScore: metric.bias_score,
        biasLevel,
        validated: metric.expert_validation,
        dimensions: Object.entries(metric.cultural_dimensions).map(([dim, value]) => ({
          dimension: dim,
          value: value,
          color: CULTURAL_DIMENSION_COLORS[dim as keyof typeof CULTURAL_DIMENSION_COLORS] || '#6B73FF'
        })),
        originalMetric: metric
      };
    });
  }, [metrics, showValidatedOnly]);

  // Prepare radar chart data
  const radarData = useMemo(() => {
    if (!culturalProfile) return [];

    const profileDimensions = {
      collectivism: culturalProfile.collectivismScore,
      powerDistance: culturalProfile.powerDistanceScore,
      uncertaintyAvoidance: culturalProfile.uncertaintyAvoidanceScore,
      masculinity: culturalProfile.masculinityScore,
      longTermOrientation: culturalProfile.longTermOrientationScore,
      indulgence: culturalProfile.indulgenceScore
    };

    const avgContentDimensions = processedData.reduce((acc, metric) => {
      Object.entries(metric.originalMetric.cultural_dimensions).forEach(([dim, value]) => {
        acc[dim] = (acc[dim] || []).concat(value);
      });
      return acc;
    }, {} as Record<string, number[]>);

    return Object.entries(profileDimensions).map(([dimension, userValue]) => {
      const contentValues = avgContentDimensions[dimension] || [];
      const avgContentValue = contentValues.length > 0 
        ? contentValues.reduce((sum, val) => sum + val, 0) / contentValues.length 
        : 0;

      return {
        dimension: dimension.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        userProfile: userValue,
        contentAlignment: avgContentValue,
        gap: Math.abs(userValue - avgContentValue)
      };
    });
  }, [culturalProfile, processedData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (processedData.length === 0) return null;

    const avgEffectiveness = processedData.reduce((sum, m) => sum + m.effectiveness, 0) / processedData.length;
    const avgBiasScore = processedData.reduce((sum, m) => sum + m.biasScore, 0) / processedData.length;
    const validatedCount = processedData.filter(m => m.validated).length;
    const highBiasCount = processedData.filter(m => m.biasScore > biasThreshold).length;
    const topTheme = processedData.reduce((max, current) => 
      current.effectiveness > max.effectiveness ? current : max
    );

    return {
      avgEffectiveness: Math.round(avgEffectiveness),
      avgBiasScore: Math.round(avgBiasScore),
      validatedPercentage: Math.round((validatedCount / processedData.length) * 100),
      highBiasCount,
      topTheme: topTheme.theme,
      totalThemes: processedData.length
    };
  }, [processedData, biasThreshold]);

  const handleThemeClick = (data: any) => {
    const theme = data?.theme || data?.activeLabel;
    if (theme) {
      setSelectedTheme(selectedTheme === theme ? null : theme);
      const metric = processedData.find(m => m.theme === theme);
      if (metric && onMetricClick) {
        onMetricClick(metric.originalMetric);
      }
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
        <p className="font-semibold text-gray-900 mb-2">{label || data.theme}</p>
        <div className="space-y-1">
          {Object.entries(data).map(([key, value]) => {
            if (key === 'theme' || key === 'originalMetric' || key === 'dimensions' || typeof value !== 'number') return null;
            return (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                </span>
                <span className="text-sm font-medium">
                  {Math.round(value)}{key.includes('Score') || key.includes('percentage') ? '%' : ''}
                </span>
              </div>
            );
          })}
        </div>
        {data.validated && (
          <div className="mt-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            <span className="text-xs text-emerald-600">Expert Validated</span>
          </div>
        )}
      </motion.div>
    );
  };

  const renderSummaryStats = () => {
    if (!summaryStats) return null;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-800">Effectiveness</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{summaryStats.avgEffectiveness}%</p>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Validated</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{summaryStats.validatedPercentage}%</p>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">Bias Score</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{summaryStats.avgBiasScore}</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Themes</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{summaryStats.totalThemes}</p>
        </div>
      </div>
    );
  };

  const renderViewSelector = () => (
    <div className="flex gap-2 mb-4">
      {[
        { key: 'radar', label: 'Cultural Dimensions', icon: RadarIcon },
        { key: 'bar', label: 'Effectiveness', icon: BarChart3 },
        { key: 'heatmap', label: 'Bias Analysis', icon: AlertTriangle }
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
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis 
                angle={0} 
                domain={[0, 100]} 
                tick={{ fontSize: 10 }}
                tickCount={5}
              />
              <Radar
                name="User Profile"
                dataKey="userProfile"
                stroke="#6B73FF"
                fill="#6B73FF"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Radar
                name="Content Alignment"
                dataKey="contentAlignment"
                stroke="#00C896"
                fill="#00C896"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Legend />
              <Tooltip content={renderTooltip} />
            </RadarChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={processedData} onClick={handleThemeClick}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="theme" 
                tick={{ fontSize: 10 }} 
                stroke="#6b7280"
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip content={renderTooltip} />
              <Bar dataKey="effectiveness" radius={[4, 4, 0, 0]}>
                {processedData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.validated ? '#00C896' : '#6B73FF'}
                    opacity={selectedTheme === entry.theme ? 1 : 0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'heatmap':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <div>
              <h4 className="font-medium text-gray-800 mb-4">Bias Score Distribution</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Low Bias', value: processedData.filter(m => m.biasLevel === 'low').length, fill: BIAS_SEVERITY_COLORS.low },
                      { name: 'Medium Bias', value: processedData.filter(m => m.biasLevel === 'medium').length, fill: BIAS_SEVERITY_COLORS.medium },
                      { name: 'High Bias', value: processedData.filter(m => m.biasLevel === 'high').length, fill: BIAS_SEVERITY_COLORS.high },
                      { name: 'Critical Bias', value: processedData.filter(m => m.biasLevel === 'critical').length, fill: BIAS_SEVERITY_COLORS.critical }
                    ].filter(item => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-800 mb-4">Theme Bias Scores</h4>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {processedData
                  .sort((a, b) => b.biasScore - a.biasScore)
                  .map((metric, index) => (
                    <motion.div
                      key={metric.theme}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        selectedTheme === metric.theme 
                          ? "border-blue-300 bg-blue-50" 
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                      onClick={() => handleThemeClick({ theme: metric.theme })}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-gray-900">{metric.theme}</span>
                        <Badge 
                          variant="outline"
                          className="text-xs"
                          style={{ 
                            borderColor: BIAS_SEVERITY_COLORS[metric.biasLevel],
                            color: BIAS_SEVERITY_COLORS[metric.biasLevel]
                          }}
                        >
                          {metric.biasLevel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <Progress 
                            value={metric.biasScore} 
                            className="h-2"
                            style={{ 
                              backgroundColor: '#f3f4f6',
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {metric.biasScore}
                        </span>
                        {metric.validated && (
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        )}
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>
          </div>
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
            Cultural Integration Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            {showBiasDetection && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowValidatedOnly(!showValidatedOnly)}
                className="text-xs"
              >
                {showValidatedOnly ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {showValidatedOnly ? 'Show All' : 'Validated Only'}
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-xs">
              <Filter className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {renderSummaryStats()}
        {renderViewSelector()}

        <div className="w-full h-80 lg:h-96">
          {renderChart()}
        </div>

        {/* Selected theme details */}
        <AnimatePresence>
          {selectedTheme && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 p-6 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">
                  Cultural Theme: {selectedTheme}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTheme(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>
              
              {(() => {
                const metric = processedData.find(m => m.theme === selectedTheme);
                if (!metric) return null;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="font-medium text-gray-800 mb-3">Performance Metrics</h5>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Relevance Score:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={metric.relevance} className="w-20 h-2" />
                            <span className="text-sm font-medium">{Math.round(metric.relevance)}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Usage Frequency:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={metric.usage} className="w-20 h-2" />
                            <span className="text-sm font-medium">{Math.round(metric.usage)}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">User Feedback:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={metric.feedback} className="w-20 h-2" />
                            <span className="text-sm font-medium">{Math.round(metric.feedback)}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Effectiveness:</span>
                          <div className="flex items-center gap-2">
                            <Progress value={metric.effectiveness} className="w-20 h-2" />
                            <span className="text-sm font-medium">{Math.round(metric.effectiveness)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-800 mb-3">Cultural Dimensions</h5>
                      <div className="space-y-2">
                        {metric.dimensions.map(({ dimension, value, color }) => (
                          <div key={dimension} className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 capitalize">
                              {dimension.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                            </span>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-sm font-medium">{Math.round(value)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Bias Score:</span>
                          <Badge 
                            variant="outline"
                            style={{ 
                              borderColor: BIAS_SEVERITY_COLORS[metric.biasLevel],
                              color: BIAS_SEVERITY_COLORS[metric.biasLevel]
                            }}
                          >
                            {metric.biasScore} ({metric.biasLevel})
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-600">Expert Validation:</span>
                          <div className="flex items-center gap-1">
                            {metric.validated ? (
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-sm">
                              {metric.validated ? 'Validated' : 'Pending'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}