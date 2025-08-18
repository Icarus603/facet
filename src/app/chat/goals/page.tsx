'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Target, Plus, CheckCircle, Circle, Edit2, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Goal {
  id: string
  title: string
  description: string
  category: string
  status: 'active' | 'completed' | 'paused'
  target_date?: string
  created_at: string
  progress_notes?: string[]
}

export default function GoalsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewGoalForm, setShowNewGoalForm] = useState(false)
  const [newGoal, setNewGoal] = useState({
    title: '',
    description: '',
    category: 'mental_health',
    target_date: ''
  })
  const supabase = createClient()

  useEffect(() => {
    async function loadGoalsData() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/signin')
          return
        }
        setUser(user)

        // Load user's goals
        const { data: userGoals, error } = await supabase
          .from('therapeutic_goals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Error loading goals:', error)
        } else {
          setGoals(userGoals || [])
        }

      } catch (error) {
        console.error('Error loading goals data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGoalsData()
  }, [router, supabase])

  const handleCreateGoal = async () => {
    if (!newGoal.title.trim() || !user) return

    try {
      const { data, error } = await supabase
        .from('therapeutic_goals')
        .insert({
          user_id: user.id,
          goal_description: newGoal.title,
          goal_category: newGoal.category,
          target_date: newGoal.target_date || null,
          status: 'in_progress',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating goal:', error)
      } else {
        // Add to local state
        const goal: Goal = {
          id: data.id,
          title: data.goal_description,
          description: newGoal.description,
          category: data.goal_category,
          status: 'active',
          target_date: data.target_date,
          created_at: data.created_at
        }
        setGoals(prev => [goal, ...prev])
        
        // Reset form
        setNewGoal({ title: '', description: '', category: 'mental_health', target_date: '' })
        setShowNewGoalForm(false)
      }
    } catch (error) {
      console.error('Error creating goal:', error)
    }
  }

  const handleToggleGoalStatus = async (goalId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'completed' : 'active'
    
    try {
      const { error } = await supabase
        .from('therapeutic_goals')
        .update({ status: newStatus === 'active' ? 'in_progress' : 'completed' })
        .eq('id', goalId)

      if (!error) {
        setGoals(prev => prev.map(goal => 
          goal.id === goalId ? { ...goal, status: newStatus as any } : goal
        ))
      }
    } catch (error) {
      console.error('Error updating goal status:', error)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'anxiety':
        return '🧘'
      case 'depression':
        return '🌱'
      case 'relationships':
        return '❤️'
      case 'sleep':
        return '😴'
      case 'exercise':
        return '💪'
      case 'mindfulness':
        return '🧠'
      default:
        return '🎯'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'anxiety':
        return 'bg-blue-100 text-blue-800'
      case 'depression':
        return 'bg-green-100 text-green-800'
      case 'relationships':
        return 'bg-pink-100 text-pink-800'
      case 'sleep':
        return 'bg-purple-100 text-purple-800'
      case 'exercise':
        return 'bg-orange-100 text-orange-800'
      case 'mindfulness':
        return 'bg-indigo-100 text-indigo-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500 meslo-font">Loading goals...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#FAF9F5'}}>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/chat/recents">
              <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-black meslo-font italic">
                Your Goals
              </h1>
              <p className="text-gray-600 mt-1 meslo-font">
                Set and track your mental health objectives
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => setShowNewGoalForm(true)}
            className="bg-facet-gradient text-white meslo-font"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Goal
          </Button>
        </div>

        {/* New Goal Form */}
        {showNewGoalForm && (
          <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
            <h2 className="text-lg font-semibold text-black mb-4 meslo-font">Create New Goal</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 meslo-font">
                  Goal Title
                </label>
                <Input
                  value={newGoal.title}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What do you want to achieve?"
                  className="w-full meslo-font"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 meslo-font">
                  Description (Optional)
                </label>
                <Textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your goal in more detail..."
                  className="w-full meslo-font"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 meslo-font">
                    Category
                  </label>
                  <select
                    value={newGoal.category}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-facet-blue focus:border-transparent meslo-font"
                  >
                    <option value="mental_health">Mental Health</option>
                    <option value="anxiety">Anxiety</option>
                    <option value="depression">Depression</option>
                    <option value="relationships">Relationships</option>
                    <option value="sleep">Sleep</option>
                    <option value="exercise">Exercise</option>
                    <option value="mindfulness">Mindfulness</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 meslo-font">
                    Target Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={newGoal.target_date}
                    onChange={(e) => setNewGoal(prev => ({ ...prev, target_date: e.target.value }))}
                    className="w-full meslo-font"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleCreateGoal}
                  className="bg-facet-blue text-white meslo-font"
                  disabled={!newGoal.title.trim()}
                >
                  Create Goal
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowNewGoalForm(false)}
                  className="meslo-font"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Goals List */}
        {goals.length > 0 ? (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div key={goal.id} className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <button
                      onClick={() => handleToggleGoalStatus(goal.id, goal.status)}
                      className="mt-1"
                    >
                      {goal.status === 'completed' ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-400 hover:text-green-600 transition-colors" />
                      )}
                    </button>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`text-lg font-semibold ${goal.status === 'completed' ? 'text-gray-500 line-through' : 'text-black'}`}>
                          {goal.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(goal.category)}`}>
                          {getCategoryIcon(goal.category)} {goal.category.replace('_', ' ')}
                        </span>
                      </div>
                      
                      {goal.description && (
                        <p className="text-gray-600 mb-3">{goal.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Created {new Date(goal.created_at).toLocaleDateString()}</span>
                        {goal.target_date && (
                          <span>Target: {new Date(goal.target_date).toLocaleDateString()}</span>
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          goal.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : goal.status === 'active'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {goal.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="hover:bg-gray-100">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="hover:bg-red-100 text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No goals yet</h3>
            <p className="text-gray-500 mb-6">
              Set your first mental health goal to start tracking your progress
            </p>
            <Button 
              onClick={() => setShowNewGoalForm(true)}
              className="bg-facet-gradient text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first goal
            </Button>
          </div>
        )}

        {/* Quick Goal Templates */}
        {!showNewGoalForm && goals.length === 0 && (
          <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-black mb-4">Quick Start Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: '🧘', title: 'Practice mindfulness daily', category: 'mindfulness' },
                { icon: '😴', title: 'Improve sleep schedule', category: 'sleep' },
                { icon: '💪', title: 'Exercise 3 times per week', category: 'exercise' },
                { icon: '❤️', title: 'Strengthen relationships', category: 'relationships' }
              ].map((template, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setNewGoal(prev => ({ 
                      ...prev, 
                      title: template.title, 
                      category: template.category 
                    }))
                    setShowNewGoalForm(true)
                  }}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-facet-blue hover:bg-gray-50 transition-colors text-left"
                >
                  <span className="text-2xl">{template.icon}</span>
                  <span className="font-medium text-black">{template.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}