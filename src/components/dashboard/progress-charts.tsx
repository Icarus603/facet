/**
 * FACET Dashboard Progress Charts
 * Interactive visualizations for therapy progress tracking
 */

'use client';

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowTrendingUpIcon, 
  HeartIcon, 
  CpuChipIcon, 
  StarIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// FACET Brand Colors for Charts
const FACET_COLORS = {
  blue: '#2C84DB',
  wine: '#C41E3A', 
  teal: '#0580B2',
  navy: '#132845',
  blueLight: '#5BA3E8',
  wineLight: '#D63856'
};

// Sample data for demonstrations
const progressData = [
  { week: 'Week 1', mood: 3, anxiety: 7, progress: 2 },
  { week: 'Week 2', mood: 4, anxiety: 6, progress: 3 },
  { week: 'Week 3', mood: 5, anxiety: 5, progress: 4 },
  { week: 'Week 4', mood: 6, anxiety: 4, progress: 6 },
  { week: 'Week 5', mood: 7, anxiety: 3, progress: 7 },
  { week: 'Week 6', mood: 8, anxiety: 2, progress: 8 }
];

const sessionTypesData = [
  { name: 'Individual', sessions: 12, color: FACET_COLORS.blue },
  { name: 'Cultural', sessions: 8, color: FACET_COLORS.wine },
  { name: 'Creative', sessions: 5, color: FACET_COLORS.teal },
  { name: 'Crisis', sessions: 2, color: FACET_COLORS.navy }
];

const wellbeingData = [
  { category: 'Emotional', score: 8, fullMark: 10 },
  { category: 'Social', score: 7, fullMark: 10 },
  { category: 'Mental', score: 9, fullMark: 10 },
  { category: 'Physical', score: 6, fullMark: 10 },
  { category: 'Spiritual', score: 7, fullMark: 10 },
  { category: 'Cultural', score: 8, fullMark: 10 }
];

const dailyMoodData = [
  { day: 'Mon', morning: 7, afternoon: 6, evening: 8 },
  { day: 'Tue', morning: 6, afternoon: 7, evening: 7 },
  { day: 'Wed', morning: 8, afternoon: 8, evening: 9 },
  { day: 'Thu', morning: 7, afternoon: 6, evening: 7 },
  { day: 'Fri', morning: 9, afternoon: 8, evening: 9 },
  { day: 'Sat', morning: 8, afternoon: 9, evening: 8 },
  { day: 'Sun', morning: 7, afternoon: 8, evening: 8 }
];

interface ProgressChartsProps {
  className?: string;
}

export function ProgressCharts({ className = "" }: ProgressChartsProps) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${className}`}>
      
      {/* Progress Over Time */}
      <Card className="bg-white shadow-sm col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <ArrowTrendingUpIcon className="w-5 h-5 text-facet-blue" />
            Therapy Progress Over Time
          </CardTitle>
          <CardDescription>
            Track your mood, anxiety levels, and overall progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={progressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="week" 
                stroke="#666"
                fontSize={12}
              />
              <YAxis 
                domain={[0, 10]}
                stroke="#666"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: `1px solid ${FACET_COLORS.blue}`,
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="mood" 
                stroke={FACET_COLORS.blue} 
                strokeWidth={3}
                dot={{ fill: FACET_COLORS.blue, strokeWidth: 2, r: 4 }}
                name="Mood Score"
              />
              <Line 
                type="monotone" 
                dataKey="anxiety" 
                stroke={FACET_COLORS.wine} 
                strokeWidth={3}
                dot={{ fill: FACET_COLORS.wine, strokeWidth: 2, r: 4 }}
                name="Anxiety Level"
              />
              <Line 
                type="monotone" 
                dataKey="progress" 
                stroke={FACET_COLORS.teal} 
                strokeWidth={3}
                dot={{ fill: FACET_COLORS.teal, strokeWidth: 2, r: 4 }}
                name="Overall Progress"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Session Types Distribution */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <ChartBarIcon className="w-5 h-5 text-facet-wine" />
            Session Types
          </CardTitle>
          <CardDescription>
            Distribution of your therapy sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={sessionTypesData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="sessions"
              >
                {sessionTypesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: `1px solid ${FACET_COLORS.wine}`,
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {sessionTypesData.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
                <span className="text-sm font-medium text-gray-900">{item.sessions}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wellbeing Radar Chart */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <StarIcon className="w-5 h-5 text-facet-teal" />
            Wellbeing Areas
          </CardTitle>
          <CardDescription>
            Holistic view of your wellbeing dimensions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={wellbeingData}>
              <PolarGrid stroke="#f0f0f0" />
              <PolarAngleAxis 
                dataKey="category" 
                tick={{ fontSize: 12, fill: '#666' }}
              />
              <PolarRadiusAxis 
                domain={[0, 10]} 
                tick={{ fontSize: 10, fill: '#666' }}
                tickCount={6}
              />
              <Radar
                name="Wellbeing Score"
                dataKey="score"
                stroke={FACET_COLORS.teal}
                fill={FACET_COLORS.teal}
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: `1px solid ${FACET_COLORS.teal}`,
                  borderRadius: '8px'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Daily Mood Patterns */}
      <Card className="bg-white shadow-sm col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <CalendarIcon className="w-5 h-5 text-facet-navy" />
            Daily Mood Patterns
          </CardTitle>
          <CardDescription>
            Your mood throughout different times of day this week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyMoodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="day" 
                stroke="#666"
                fontSize={12}
              />
              <YAxis 
                domain={[0, 10]}
                stroke="#666"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: `1px solid ${FACET_COLORS.navy}`,
                  borderRadius: '8px'
                }}
              />
              <Area
                type="monotone"
                dataKey="morning"
                stackId="1"
                stroke={FACET_COLORS.blue}
                fill={FACET_COLORS.blue}
                fillOpacity={0.6}
                name="Morning"
              />
              <Area
                type="monotone"
                dataKey="afternoon"
                stackId="1"
                stroke={FACET_COLORS.wine}
                fill={FACET_COLORS.wine}
                fillOpacity={0.6}
                name="Afternoon"
              />
              <Area
                type="monotone"
                dataKey="evening"
                stackId="1"
                stroke={FACET_COLORS.teal}
                fill={FACET_COLORS.teal}
                fillOpacity={0.6}
                name="Evening"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Progress Insights */}
      <Card className="bg-facet-gradient text-white shadow-lg col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CpuChipIcon className="w-5 h-5" />
            AI Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Progress Trend</h4>
              <p className="text-sm opacity-90">
                Your mood has improved by 67% over the past 6 weeks. Keep up the excellent work!
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Best Time</h4>
              <p className="text-sm opacity-90">
                Your mood is consistently highest on Friday evenings. Consider scheduling important activities then.
              </p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Recommendation</h4>
              <p className="text-sm opacity-90">
                Focus on physical wellbeing next - consider adding movement-based therapy sessions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}