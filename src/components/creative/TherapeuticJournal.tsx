"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { BookOpenIcon, ArrowDownTrayIcon, SparklesIcon, CalendarIcon } from '@heroicons/react/24/outline'

interface JournalEntry {
  id: string
  content: string
  mood_rating: number
  ai_insights?: string[]
  cultural_themes?: string[]
  created_at: string
  updated_at: string
}

interface TherapeuticJournalProps {
  sessionId?: string
  onInsightGenerated?: (insights: string[]) => void
}

export default function TherapeuticJournal({ 
  sessionId, 
  onInsightGenerated 
}: TherapeuticJournalProps) {
  const [content, setContent] = useState('')
  const [moodRating, setMoodRating] = useState(5)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [insights, setInsights] = useState<string[]>([])
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    loadRecentEntries()
  }, [])

  const loadRecentEntries = async () => {
    try {
      const response = await fetch('/api/creative/journal/entries?limit=5')
      if (response.ok) {
        const entries = await response.json()
        setRecentEntries(entries)
      }
    } catch (error) {
      console.error('Failed to load recent entries:', error)
    }
  }

  const analyzeEntry = async (entryContent: string) => {
    if (!entryContent.trim()) return

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/creative/journal/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: entryContent,
          mood_rating: moodRating,
          session_id: sessionId
        })
      })

      if (response.ok) {
        const analysis = await response.json()
        setInsights(analysis.insights || [])
        onInsightGenerated?.(analysis.insights || [])
      }
    } catch (error) {
      console.error('Failed to analyze entry:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const saveEntry = async () => {
    if (!content.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/creative/journal/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          mood_rating: moodRating,
          session_id: sessionId,
          ai_insights: insights
        })
      })

      if (response.ok) {
        const savedEntry = await response.json()
        setRecentEntries(prev => [savedEntry, ...prev.slice(0, 4)])
        setContent('')
        setInsights([])
        setMoodRating(5)
      }
    } catch (error) {
      console.error('Failed to save entry:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getMoodEmoji = (rating: number) => {
    const emojis = ['😰', '😔', '😐', '😊', '😄']
    return emojis[Math.min(Math.max(rating - 1, 0), 4)]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Journal Writing Area */}
      <Card className="bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <BookOpenIcon className="w-5 h-5 text-facet-blue" />
            Therapeutic Journal
          </CardTitle>
          <CardDescription>
            Express your thoughts and feelings. Our AI will provide gentle insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mood Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">
              How are you feeling right now?
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="5"
                value={moodRating}
                onChange={(e) => setMoodRating(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-2xl">{getMoodEmoji(moodRating)}</span>
              <span className="text-sm text-gray-600 min-w-0">
                {['Very Low', 'Low', 'Neutral', 'Good', 'Great'][moodRating - 1]}
              </span>
            </div>
          </div>

          {/* Writing Area */}
          <div>
            <Textarea
              placeholder="Write about your thoughts, feelings, experiences, or anything on your mind..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px] resize-none facet-input"
              disabled={isAnalyzing || isSaving}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{content.length} characters</span>
              <span>Express yourself freely and authentically</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={() => analyzeEntry(content)}
              disabled={!content.trim() || isAnalyzing}
              variant="outline"
              className="flex items-center gap-2 border-facet-wine text-facet-wine hover:bg-facet-wine hover:text-white"
            >
              <SparklesIcon className="w-4 h-4" />
              {isAnalyzing ? 'Analyzing...' : 'Get AI Insights'}
            </Button>
            <Button
              onClick={saveEntry}
              disabled={!content.trim() || isSaving}
              className="facet-button-primary flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-facet-wine">
              <SparklesIcon className="w-5 h-5" />
              AI Insights
            </CardTitle>
            <CardDescription>
              Gentle observations about your journal entry
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <Alert key={index} className="border-facet-wine/20 bg-facet-wine/5">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-facet-wine rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">{insight}</p>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Entries */}
      {recentEntries.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <CalendarIcon className="w-5 h-5 text-facet-teal" />
              Recent Entries
            </CardTitle>
            <CardDescription>
              Your recent journal reflections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <div 
                  key={entry.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50/50 hover:border-facet-blue transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">
                      {formatDate(entry.created_at)}
                    </span>
                    <span className="text-lg">{getMoodEmoji(entry.mood_rating)}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3 mb-2">
                    {entry.content}
                  </p>
                  {entry.cultural_themes && entry.cultural_themes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {entry.cultural_themes.slice(0, 3).map((theme, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 text-xs bg-facet-teal/20 text-facet-teal rounded"
                        >
                          {theme}
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