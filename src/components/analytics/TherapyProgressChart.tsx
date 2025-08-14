/**
 * TherapyProgressChart Component
 * Advanced progress visualization with cultural context and accessibility features
 */

'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
  Area,
  ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, subDays, isWithinInterval } from 'date-fns';
import { ProgressChartProps, ProgressMetric } from '@/types/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar,
  Download,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartLine {
  key: keyof ProgressMetric;
  name: string;
  color: string;
  strokeWidth: number;
  culturalRelevance: boolean;
}

const CHART_LINES: ChartLine[] = [
  { key: 'mood_score', name: 'Mood Score', color: '#6B73FF', strokeWidth: 3, culturalRelevance: true },
  { key: 'anxiety_level', name: 'Anxiety Level', color: '#FF6B9D', strokeWidth: 3, culturalRelevance: true },
  { key: 'cultural_integration', name: 'Cultural Integration', color: '#00C896', strokeWidth: 3, culturalRelevance: true },
  { key: 'therapeutic_alliance', name: 'Therapeutic Alliance', color: '#845EC2', strokeWidth: 2, culturalRelevance: false },
  { key: 'session_satisfaction', name: 'Session Satisfaction', color: '#C08552', strokeWidth: 2, culturalRelevance: false },
];

const TIME_RANGES = [
  { value: '7d', label: '7 Days', days: 7 },
  { value: '30d', label: '30 Days', days: 30 },
  { value: '90d', label: '90 Days', days: 90 },
  { value: '1y', label: '1 Year', days: 365 },
] as const;

export default function TherapyProgressChart({
  data,
  timeRange,
  culturalContext,
  showPredictions = false,
  className,
  onDataPointClick
}: ProgressChartProps) {
  const [selectedLines, setSelectedLines] = useState<Set<string>>(
    new Set(CHART_LINES.map(line => line.key))
  );
  const [showCulturalOverlay, setShowCulturalOverlay] = useState(true);
  const [focusedDataPoint, setFocusedDataPoint] = useState<ProgressMetric | null>(null);

  // Filter and process data based on time range
  const processedData = useMemo(() => {
    const timeRangeConfig = TIME_RANGES.find(tr => tr.value === timeRange);
    if (!timeRangeConfig) return data;

    const endDate = new Date();
    const startDate = subDays(endDate, timeRangeConfig.days);

    return data
      .filter(item => {
        const itemDate = parseISO(item.date);
        return isWithinInterval(itemDate, { start: startDate, end: endDate });
      })
      .map(item => ({
        ...item,
        formattedDate: format(parseISO(item.date), timeRange === '1y' ? 'MMM yyyy' : 'MMM dd'),
        // Invert anxiety for better visual representation (lower is better)
        anxiety_level_inverted: 100 - item.anxiety_level
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data, timeRange]);

  // Calculate trends and statistics
  const statistics = useMemo(() => {
    if (processedData.length < 2) return null;

    const latest = processedData[processedData.length - 1];
    const previous = processedData[processedData.length - 2];

    const calculateTrend = (current: number, prev: number) => {
      const change = current - prev;
      const changePercent = (change / prev) * 100;
      return {
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        change: Math.abs(change),
        changePercent: Math.abs(changePercent)
      };
    };

    return {
      mood: calculateTrend(latest.mood_score, previous.mood_score),
      anxiety: calculateTrend(previous.anxiety_level, latest.anxiety_level), // Lower anxiety is better
      cultural: calculateTrend(latest.cultural_integration, previous.cultural_integration),
      alliance: calculateTrend(latest.therapeutic_alliance, previous.therapeutic_alliance)
    };
  }, [processedData]);

  // Cultural milestones
  const culturalMilestones = useMemo(() => {
    if (!culturalContext || !showCulturalOverlay) return [];

    return processedData
      .filter(item => item.cultural_integration >= 70)
      .map(item => ({
        date: item.date,
        value: item.cultural_integration,
        milestone: 'Cultural Integration Milestone'
      }));
  }, [processedData, culturalContext, showCulturalOverlay]);

  const toggleLine = (lineKey: string) => {
    const newSelectedLines = new Set(selectedLines);
    if (newSelectedLines.has(lineKey)) {
      newSelectedLines.delete(lineKey);
    } else {
      newSelectedLines.add(lineKey);
    }
    setSelectedLines(newSelectedLines);
  };

  const handleDataPointClick = (data: any) => {
    if (onDataPointClick && data.activePayload?.[0]?.payload) {
      const originalDataPoint = data.activePayload[0].payload;
      setFocusedDataPoint(originalDataPoint);
      onDataPointClick(originalDataPoint);
    }
  };

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg p-4 shadow-lg"
      >
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">
              {entry.name}: {Math.round(entry.value)}
            </span>
          </div>
        ))}
        {culturalContext && data.cultural_integration >= 70 && (
          <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-200">
            <p className="text-xs text-emerald-700 font-medium">
              Cultural Integration Milestone
            </p>
          </div>
        )}
      </motion.div>
    );
  };

  const renderLegendContent = () => (
    <div className="flex flex-wrap gap-2 justify-center mb-4">
      {CHART_LINES.map((line) => (
        <Button
          key={line.key}
          variant={selectedLines.has(line.key) ? "default" : "outline"}
          size="sm"
          onClick={() => toggleLine(line.key)}
          className={cn(
            "text-xs transition-all duration-200",
            selectedLines.has(line.key) && "shadow-md"
          )}
          style={{
            backgroundColor: selectedLines.has(line.key) ? line.color : undefined,
            borderColor: line.color,
            color: selectedLines.has(line.key) ? 'white' : line.color
          }}
        >
          <div 
            className="w-2 h-2 rounded-full mr-2" 
            style={{ backgroundColor: line.color }}
          />
          {line.name}
          {line.culturalRelevance && culturalContext && (
            <Badge variant="secondary" className="ml-1 text-xs">
              Cultural
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );

  const renderStatistics = () => {
    if (!statistics) return null;

    const StatCard = ({ 
      title, 
      trend, 
      color 
    }: { 
      title: string; 
      trend: typeof statistics.mood; 
      color: string;
    }) => (
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            {trend.direction === 'up' && <TrendingUp className="w-3 h-3 text-emerald-600" />}
            {trend.direction === 'down' && <TrendingDown className="w-3 h-3 text-red-600" />}
            {trend.direction === 'stable' && <Minus className="w-3 h-3 text-gray-600" />}
            <span>{trend.changePercent.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    );

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard title="Mood" trend={statistics.mood} color="#6B73FF" />
        <StatCard title="Anxiety" trend={statistics.anxiety} color="#FF6B9D" />
        <StatCard title="Cultural" trend={statistics.cultural} color="#00C896" />
        <StatCard title="Alliance" trend={statistics.alliance} color="#845EC2" />
      </div>
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-gray-900">
            Therapy Progress Overview
          </CardTitle>
          <div className="flex items-center gap-2">
            {culturalContext && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCulturalOverlay(!showCulturalOverlay)}
                className="text-xs"
              >
                {showCulturalOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Cultural Context
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-xs">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
        
        {culturalContext && showCulturalOverlay && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
          >
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Cultural Context Active</p>
                <p>Progress tracking includes cultural integration metrics and culturally-informed milestones.</p>
              </div>
            </div>
          </motion.div>
        )}
      </CardHeader>

      <CardContent>
        {renderStatistics()}
        {renderLegendContent()}

        <div className="w-full h-80 lg:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={processedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              onClick={handleDataPointClick}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#f0f0f0"
                className="opacity-50"
              />
              <XAxis 
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
                label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={renderTooltip} />

              {/* Cultural milestone reference lines */}
              {culturalMilestones.map((milestone, index) => (
                <ReferenceLine
                  key={index}
                  x={format(parseISO(milestone.date), timeRange === '1y' ? 'MMM yyyy' : 'MMM dd')}
                  stroke="#00C896"
                  strokeDasharray="5 5"
                  strokeOpacity={0.7}
                />
              ))}

              {/* Progress lines */}
              {CHART_LINES.map((line) => (
                selectedLines.has(line.key) && (
                  <Line
                    key={line.key}
                    type="monotone"
                    dataKey={line.key === 'anxiety_level' ? 'anxiety_level_inverted' : line.key}
                    stroke={line.color}
                    strokeWidth={line.strokeWidth}
                    dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: line.color, strokeWidth: 2 }}
                    connectNulls={false}
                    animationDuration={1000}
                    animationEasing="ease-in-out"
                  />
                )
              ))}

              {/* Brush for time navigation on larger datasets */}
              {processedData.length > 20 && (
                <Brush 
                  dataKey="formattedDate" 
                  height={30}
                  stroke="#6B73FF"
                  className="mt-4"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Cultural insights panel */}
        <AnimatePresence>
          {culturalContext && showCulturalOverlay && culturalMilestones.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200"
            >
              <h4 className="font-semibold text-emerald-800 mb-2">
                Cultural Integration Milestones
              </h4>
              <div className="space-y-2">
                {culturalMilestones.map((milestone, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-emerald-700">
                    <div className="w-2 h-2 bg-emerald-600 rounded-full" />
                    <span>
                      {format(parseISO(milestone.date), 'MMM dd')} - 
                      Cultural integration reached {Math.round(milestone.value)}%
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Focused data point details */}
        <AnimatePresence>
          {focusedDataPoint && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mt-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">
                  Progress Details - {format(parseISO(focusedDataPoint.date), 'MMM dd, yyyy')}
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFocusedDataPoint(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </Button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{Math.round(focusedDataPoint.mood_score)}</p>
                  <p className="text-sm text-blue-800">Mood Score</p>
                </div>
                <div className="text-center p-3 bg-pink-50 rounded-lg">
                  <p className="text-2xl font-bold text-pink-600">{Math.round(focusedDataPoint.anxiety_level)}</p>
                  <p className="text-sm text-pink-800">Anxiety Level</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-600">{Math.round(focusedDataPoint.cultural_integration)}</p>
                  <p className="text-sm text-emerald-800">Cultural Integration</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{Math.round(focusedDataPoint.therapeutic_alliance)}</p>
                  <p className="text-sm text-purple-800">Therapeutic Alliance</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}