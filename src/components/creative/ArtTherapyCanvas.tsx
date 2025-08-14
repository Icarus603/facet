"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  SwatchIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  BookmarkIcon,
  SparklesIcon,
  PaintBrushIcon,
  EllipsisHorizontalIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline'

interface DrawingSession {
  id: string
  title: string
  canvas_data: string
  emotions_expressed: string[]
  cultural_symbols?: string[]
  therapeutic_insights?: string[]
  created_at: string
}

interface ArtTherapyCanvasProps {
  sessionId?: string
  onInsightGenerated?: (insights: string[]) => void
}

export default function ArtTherapyCanvas({ 
  sessionId, 
  onInsightGenerated 
}: ArtTherapyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [brushSize, setBrushSize] = useState(3)
  const [brushColor, setBrushColor] = useState('#000000')
  const [tool, setTool] = useState<'brush' | 'eraser' | 'circle' | 'square'>('brush')
  const [title, setTitle] = useState('')
  const [emotionsExpressed, setEmotionsExpressed] = useState<string[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [insights, setInsights] = useState<string[]>([])
  const [recentDrawings, setRecentDrawings] = useState<DrawingSession[]>([])

  const colors = [
    '#000000', '#2C84DB', '#C41E3A', '#0580B2', '#132845',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ]

  const emotions = [
    'Joy', 'Peace', 'Sadness', 'Anger', 'Fear', 'Hope',
    'Love', 'Anxiety', 'Confusion', 'Freedom', 'Energy', 'Calm'
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set canvas size
    canvas.width = 800
    canvas.height = 600

    // Initialize with white background
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    loadRecentDrawings()
  }, [])

  const loadRecentDrawings = async () => {
    try {
      const response = await fetch('/api/creative/art/drawings?limit=6')
      if (response.ok) {
        const drawings = await response.json()
        setRecentDrawings(drawings)
      }
    } catch (error) {
      console.error('Failed to load recent drawings:', error)
    }
  }

  const startDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsDrawing(true)
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(x, y)

    if (tool === 'circle' || tool === 'square') {
      // Store starting point for shapes
      canvas.dataset.startX = x.toString()
      canvas.dataset.startY = y.toString()
    }
  }, [tool])

  const draw = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (tool === 'brush') {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = brushColor
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, y)
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }, [isDrawing, brushSize, brushColor, tool])

  const stopDrawing = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (tool === 'circle' || tool === 'square') {
      const rect = canvas.getBoundingClientRect()
      const endX = event.clientX - rect.left
      const endY = event.clientY - rect.top
      const startX = parseFloat(canvas.dataset.startX || '0')
      const startY = parseFloat(canvas.dataset.startY || '0')

      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = brushColor
      ctx.lineWidth = brushSize

      if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
        ctx.beginPath()
        ctx.arc(startX, startY, radius, 0, 2 * Math.PI)
        ctx.stroke()
      } else if (tool === 'square') {
        ctx.beginPath()
        ctx.rect(startX, startY, endX - startX, endY - startY)
        ctx.stroke()
      }
    }

    setIsDrawing(false)
    ctx.beginPath()
  }, [isDrawing, tool, brushSize, brushColor])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  const downloadDrawing = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `art-therapy-${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const analyzeArtwork = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsAnalyzing(true)
    try {
      const canvasData = canvas.toDataURL()
      const response = await fetch('/api/creative/art/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas_data: canvasData,
          emotions_expressed: emotionsExpressed,
          session_id: sessionId
        })
      })

      if (response.ok) {
        const analysis = await response.json()
        setInsights(analysis.insights || [])
        onInsightGenerated?.(analysis.insights || [])
      }
    } catch (error) {
      console.error('Failed to analyze artwork:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const saveDrawing = async () => {
    const canvas = canvasRef.current
    if (!canvas || !title.trim()) return

    setIsSaving(true)
    try {
      const canvasData = canvas.toDataURL()
      const response = await fetch('/api/creative/art/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          canvas_data: canvasData,
          emotions_expressed: emotionsExpressed,
          therapeutic_insights: insights,
          session_id: sessionId
        })
      })

      if (response.ok) {
        const savedDrawing = await response.json()
        setRecentDrawings(prev => [savedDrawing, ...prev.slice(0, 5)])
        setTitle('')
        setEmotionsExpressed([])
        setInsights([])
        clearCanvas()
      }
    } catch (error) {
      console.error('Failed to save drawing:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleEmotion = (emotion: string) => {
    setEmotionsExpressed(prev =>
      prev.includes(emotion)
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    )
  }

  return (
    <div className="space-y-6">
      {/* Drawing Canvas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <SwatchIcon className="w-5 h-5 text-facet-blue" />
            Art Therapy Canvas
          </CardTitle>
          <CardDescription>
            Express your feelings through art. Let your creativity flow freely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tool Controls */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Tools:</span>
              <div className="flex gap-1">
                {[
                  { name: 'brush', icon: PaintBrushIcon, label: 'Brush' },
                  { name: 'eraser', icon: TrashIcon, label: 'Eraser' },
                  { name: 'circle', icon: EllipsisHorizontalIcon, label: 'Circle' },
                  { name: 'square', icon: RectangleStackIcon, label: 'Square' }
                ].map(({ name, icon: Icon, label }) => (
                  <button
                    key={name}
                    onClick={() => setTool(name as any)}
                    className={`p-2 rounded ${
                      tool === name 
                        ? 'bg-facet-blue text-white' 
                        : 'bg-white hover:bg-gray-100'
                    }`}
                    title={label}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Size:</span>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-gray-600 min-w-0">{brushSize}px</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Color:</span>
              <div className="flex gap-1">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    className={`w-6 h-6 rounded border-2 ${
                      brushColor === color ? 'border-gray-800' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-6 h-6 rounded border border-gray-300"
                  title="Custom color"
                />
              </div>
            </div>

            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={clearCanvas}>
                <ArrowPathIcon className="w-4 h-4 mr-1" />
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={downloadDrawing}>
                <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>

          {/* Canvas */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              className="border border-gray-300 rounded cursor-crosshair max-w-full h-auto"
              style={{ display: 'block', margin: '0 auto' }}
            />
          </div>

          {/* Emotion Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">
              What emotions does this artwork express?
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {emotions.map(emotion => (
                <button
                  key={emotion}
                  onClick={() => toggleEmotion(emotion)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    emotionsExpressed.includes(emotion)
                      ? 'bg-facet-wine text-white border-facet-wine'
                      : 'bg-white hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  {emotion}
                </button>
              ))}
            </div>
          </div>

          {/* Title and Actions */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Give your artwork a title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-facet-blue/50 focus:border-facet-blue facet-input"
            />
            <Button
              onClick={analyzeArtwork}
              disabled={isAnalyzing}
              variant="outline"
              className="flex items-center gap-2 border-facet-wine text-facet-wine hover:bg-facet-wine hover:text-white"
            >
              <SparklesIcon className="w-4 h-4" />
              {isAnalyzing ? 'Analyzing...' : 'Get AI Insights'}
            </Button>
            <Button
              onClick={saveDrawing}
              disabled={!title.trim() || isSaving}
              className="facet-button-primary flex items-center gap-2"
            >
              <BookmarkIcon className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Artwork'}
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
              Artwork Insights
            </CardTitle>
            <CardDescription>
              AI analysis of your creative expression
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight, index) => (
                <div key={index} className="p-3 bg-facet-wine/5 border border-facet-wine/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-facet-wine rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm leading-relaxed">{insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Drawings */}
      {recentDrawings.length > 0 && (
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900">Recent Artwork</CardTitle>
            <CardDescription>
              Your therapeutic art journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentDrawings.map((drawing) => (
                <div key={drawing.id} className="border rounded-lg p-3">
                  <img
                    src={drawing.canvas_data}
                    alt={drawing.title}
                    className="w-full h-32 object-cover rounded border mb-2"
                  />
                  <h4 className="font-medium text-sm mb-1">{drawing.title}</h4>
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(drawing.created_at).toLocaleDateString()}
                  </p>
                  {drawing.emotions_expressed.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {drawing.emotions_expressed.slice(0, 3).map((emotion, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 text-xs bg-facet-teal/20 text-facet-teal rounded"
                        >
                          {emotion}
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