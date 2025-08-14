"use client"

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CalendarIcon,
  BoltIcon,
  HeartIcon
} from '@heroicons/react/24/outline'

interface MoodEntry {
  id: string
  mood_value: number
  energy_level: number
  stress_level: number
  emotions: string[]
  triggers?: string[]
  cultural_context?: string
  timestamp: string
}

interface MoodPattern {
  period: string
  average_mood: number
  trend: 'improving' | 'stable' | 'declining'
  cultural_influences: string[]
}

interface MoodMappingProps {
  sessionId?: string
  onPatternDetected?: (patterns: MoodPattern[]) => void
}

export default function MoodMapping({ sessionId, onPatternDetected }: MoodMappingProps) {
  const [currentMood, setCurrentMood] = useState(5)
  const [currentEnergy, setCurrentEnergy] = useState(5)
  const [currentStress, setCurrentStress] = useState(5)
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [triggers, setTriggers] = useState('')
  const [culturalContext, setCulturalContext] = useState('')
  const [recentEntries, setRecentEntries] = useState<MoodEntry[]>([])
  const [patterns, setPatterns] = useState<MoodPattern[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const emotions = [
    'Happy', 'Sad', 'Anxious', 'Excited', 'Angry', 'Peaceful',
    'Frustrated', 'Content', 'Overwhelmed', 'Hopeful', 'Lonely', 'Grateful',
    'Confused', 'Inspired', 'Worried', 'Proud'
  ]

  useEffect(() => {
    loadMoodData()
  }, [])

  useEffect(() => {
    if (recentEntries.length > 0) {
      drawMoodChart()
    }
  }, [recentEntries])

  const loadMoodData = async () => {
    try {
      const [entriesRes, patternsRes] = await Promise.all([
        fetch('/api/creative/mood/entries?limit=30'),
        fetch('/api/creative/mood/patterns')
      ])

      if (entriesRes.ok) {
        const entries = await entriesRes.json()
        setRecentEntries(entries)
      }

      if (patternsRes.ok) {
        const patterns = await patternsRes.json()
        setPatterns(patterns)
        onPatternDetected?.(patterns)
      }
    } catch (error) {
      console.error('Failed to load mood data:', error)
    }
  }

  const drawMoodChart = () => {
    const canvas = canvasRef.current
    if (!canvas || recentEntries.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = 200

    const { width, height } = canvas
    const margin = 40
    const chartWidth = width - 2 * margin
    const chartHeight = height - 2 * margin

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Draw background gradient with FACET colors
    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, 'rgba(44, 132, 219, 0.1)') // facet-blue
    gradient.addColorStop(1, 'rgba(44, 132, 219, 0.05)')
    ctx.fillStyle = gradient
    ctx.fillRect(margin, margin, chartWidth, chartHeight)

    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 10; i++) {
      const y = margin + (i / 10) * chartHeight
      ctx.beginPath()
      ctx.moveTo(margin, y)
      ctx.lineTo(width - margin, y)
      ctx.stroke()
    }

    if (recentEntries.length > 1) {
      // Draw mood line with FACET colors
      ctx.strokeStyle = '#2C84DB' // facet-blue
      ctx.lineWidth = 3
      ctx.beginPath()

      const dataPoints = recentEntries.slice(-14) // Last 14 entries
      dataPoints.forEach((entry, index) => {
        const x = margin + (index / (dataPoints.length - 1)) * chartWidth
        const y = margin + chartHeight - (entry.mood_value / 10) * chartHeight
        
        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })
      ctx.stroke()

      // Draw data points
      ctx.fillStyle = '#C41E3A' // facet-wine
      dataPoints.forEach((entry, index) => {
        const x = margin + (index / (dataPoints.length - 1)) * chartWidth
        const y = margin + chartHeight - (entry.mood_value / 10) * chartHeight
        
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
      })
    }

    // Draw axes labels
    ctx.fillStyle = '#64748b'
    ctx.font = '12px system-ui'
    ctx.textAlign = 'center'
    
    // Y-axis labels
    for (let i = 0; i <= 10; i += 2) {
      const y = margin + chartHeight - (i / 10) * chartHeight
      ctx.fillText(i.toString(), 20, y + 4)
    }

    // Title
    ctx.font = 'bold 14px system-ui'
    ctx.fillText('Mood Trends (Last 14 Entries)', width / 2, 20)
  }

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions(prev =>
      prev.includes(emotion)
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    )
  }

  const saveMoodEntry = async () => {
    if (selectedEmotions.length === 0) return

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/creative/mood/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood_value: currentMood,
          energy_level: currentEnergy,
          stress_level: currentStress,
          emotions: selectedEmotions,
          triggers: triggers.split(',').map(t => t.trim()).filter(t => t),
          cultural_context: culturalContext,
          session_id: sessionId
        })
      })

      if (response.ok) {
        const entry = await response.json()
        setRecentEntries(prev => [entry, ...prev.slice(0, 29)])
        
        // Reset form
        setSelectedEmotions([])
        setTriggers('')
        setCulturalContext('')
        setCurrentMood(5)
        setCurrentEnergy(5)
        setCurrentStress(5)

        // Refresh patterns
        const patternsRes = await fetch('/api/creative/mood/patterns')
        if (patternsRes.ok) {
          const newPatterns = await patternsRes.json()
          setPatterns(newPatterns)
          onPatternDetected?.(newPatterns)
        }
      }
    } catch (error) {
      console.error('Failed to save mood entry:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getMoodColor = (value: number) => {
    if (value <= 3) return 'text-red-600'
    if (value <= 6) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-green-600" />
      case 'declining':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-red-600 rotate-180" />
      default:
        return <ChartBarIcon className="w-4 h-4 text-yellow-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Mood Chart */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <ChartBarIcon className="w-5 h-5 text-facet-blue" />
            Mood Visualization
          </CardTitle>
          <CardDescription>
            Track your emotional patterns over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full border rounded-lg"
              style={{ height: '200px' }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Current Mood Entry */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <HeartIcon className="w-5 h-5 text-facet-wine" />
            How are you feeling right now?
          </CardTitle>
          <CardDescription>
            Record your current emotional state for pattern tracking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mood Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Overall Mood
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={currentMood}
                onChange={(e) => setCurrentMood(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Low</span>
                <span className={getMoodColor(currentMood)}>
                  {currentMood}/10
                </span>
                <span>High</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Energy Level
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={currentEnergy}
                onChange={(e) => setCurrentEnergy(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Drained</span>
                <span className={getMoodColor(currentEnergy)}>
                  {currentEnergy}/10
                </span>
                <span>Energized</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Stress Level
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={currentStress}
                onChange={(e) => setCurrentStress(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Calm</span>
                <span className={getMoodColor(11 - currentStress)}>
                  {currentStress}/10
                </span>
                <span>Stressed</span>
              </div>
            </div>
          </div>

          {/* Emotion Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">
              What emotions are you experiencing?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {emotions.map(emotion => (
                <button
                  key={emotion}
                  onClick={() => toggleEmotion(emotion)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    selectedEmotions.includes(emotion)
                      ? 'bg-facet-wine text-white border-facet-wine'
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {emotion}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Context */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Triggers (optional)
              </label>
              <input
                type="text"
                placeholder="Work stress, family conflict, etc."
                value={triggers}
                onChange={(e) => setTriggers(e.target.value)}
                className="facet-input w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-facet-blue/50 focus:border-facet-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Cultural Context (optional)
              </label>
              <input
                type="text"
                placeholder="Family traditions, cultural events, etc."
                value={culturalContext}
                onChange={(e) => setCulturalContext(e.target.value)}
                className="facet-input w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-facet-blue/50 focus:border-facet-blue"
              />
            </div>
          </div>

          <Button
            onClick={saveMoodEntry}
            disabled={selectedEmotions.length === 0 || isAnalyzing}
            className="facet-button-primary w-full"
          >
            <BoltIcon className="w-4 h-4 mr-2" />
            {isAnalyzing ? 'Recording...' : 'Record Mood Entry'}
          </Button>
        </CardContent>
      </Card>

      {/* Patterns & Insights */}
      {patterns.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <ArrowTrendingUpIcon className="w-5 h-5 text-facet-teal" />
              Mood Patterns & Insights
            </CardTitle>
            <CardDescription>
              AI-detected patterns in your emotional well-being
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patterns.map((pattern, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{pattern.period}</h4>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(pattern.trend)}
                      <span className="text-sm capitalize">{pattern.trend}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    Average mood: {pattern.average_mood.toFixed(1)}/10
                  </p>
                  {pattern.cultural_influences.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {pattern.cultural_influences.map((influence, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-facet-teal/20 text-facet-teal rounded"
                        >
                          {influence}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}