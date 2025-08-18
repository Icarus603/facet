'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { useTransparencySettings, useCommunicationSettings, usePerformanceSettings, usePreferenceActions } from '@/lib/stores/preference-store'
import { Settings, Eye, Brain, Clock, MessageCircle, Zap, ChevronRight, Info } from 'lucide-react'

interface TransparencySettingsProps {
  isOpen?: boolean
  onClose?: () => void
  className?: string
}

export function TransparencySettings({ isOpen = false, onClose, className }: TransparencySettingsProps) {
  const transparencySettings = useTransparencySettings()
  const communicationSettings = useCommunicationSettings()
  const performanceSettings = usePerformanceSettings()
  const { updateTransparency, updatePreferences } = usePreferenceActions()

  if (!isOpen) return null

  return (
    <div className={cn(
      "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4",
      className
    )}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                AI Transparency Settings
              </h2>
              <p className="text-sm text-gray-600">
                Control how much detail you see about your AI team's work
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Transparency Level */}
          <SettingSection
            icon={Eye}
            title="Transparency Level"
            description="How much detail do you want to see about AI processing?"
          >
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  value: 'minimal' as const,
                  label: 'Minimal',
                  description: 'Just show final responses with basic agent indicators'
                },
                {
                  value: 'standard' as const,
                  label: 'Standard',
                  description: 'Show agent coordination, timing, and key insights'
                },
                {
                  value: 'detailed' as const,
                  label: 'Detailed',
                  description: 'Full transparency with reasoning, timeline, and metrics'
                }
              ].map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                    transparencySettings.level === option.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="radio"
                    name="transparencyLevel"
                    value={option.value}
                    checked={transparencySettings.level === option.value}
                    onChange={() => updateTransparency({ transparencyLevel: option.value })}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </SettingSection>

          {/* Detailed Settings */}
          <SettingSection
            icon={Brain}
            title="Agent Information"
            description="Choose what information to display about individual agents"
          >
            <div className="space-y-4">
              <ToggleSetting
                label="Show Agent Reasoning"
                description="See the thinking process behind each agent's analysis"
                checked={transparencySettings.showReasoning}
                onChange={(checked) => updateTransparency({ showAgentReasoning: checked })}
              />
              
              <ToggleSetting
                label="Show Execution Timeline"
                description="Visual timeline of how agents worked together"
                checked={transparencySettings.showTimeline}
                onChange={(checked) => updateTransparency({ showExecutionTimeline: checked })}
              />
              
              <ToggleSetting
                label="Show Confidence Scores"
                description="Display how confident each agent is in their analysis"
                checked={transparencySettings.showConfidence}
                onChange={(checked) => updateTransparency({ showConfidenceScores: checked })}
              />
              
              <ToggleSetting
                label="Show Agent Personalities"
                description="Display agent names and specializations"
                checked={transparencySettings.showPersonalities}
                onChange={(checked) => updateTransparency({ showAgentPersonalities: checked })}
              />
            </div>
          </SettingSection>

          {/* Performance Settings */}
          <SettingSection
            icon={Zap}
            title="Response Speed"
            description="Balance between speed and thoroughness"
          >
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  value: 'fast' as const,
                  label: 'Fast',
                  description: 'Prioritize speed (<2s responses)',
                  icon: '⚡'
                },
                {
                  value: 'balanced' as const,
                  label: 'Balanced',
                  description: 'Good balance of speed and quality (2-4s)',
                  icon: '⚖️'
                },
                {
                  value: 'thorough' as const,
                  label: 'Thorough',
                  description: 'Comprehensive analysis (up to 8s)',
                  icon: '🔬'
                }
              ].map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    performanceSettings.responseSpeed === option.value
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="radio"
                    name="responseSpeed"
                    value={option.value}
                    checked={performanceSettings.responseSpeed === option.value}
                    onChange={() => updatePreferences({ responseSpeed: option.value })}
                  />
                  <span className="text-lg">{option.icon}</span>
                  <div>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </SettingSection>

          {/* Communication Settings */}
          <SettingSection
            icon={MessageCircle}
            title="Communication Style"
            description="How should your AI team communicate with you?"
          >
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  value: 'professional_warm' as const,
                  label: 'Professional & Warm',
                  description: 'Caring and professional therapeutic communication'
                },
                {
                  value: 'clinical_precise' as const,
                  label: 'Clinical & Precise',
                  description: 'Clear, clinical language with technical accuracy'
                },
                {
                  value: 'casual_supportive' as const,
                  label: 'Casual & Supportive',
                  description: 'Friendly, conversational tone with empathy'
                }
              ].map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    communicationSettings.style === option.value
                      ? "border-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="radio"
                    name="communicationStyle"
                    value={option.value}
                    checked={communicationSettings.style === option.value}
                    onChange={() => updatePreferences({ communicationStyle: option.value })}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </SettingSection>

          {/* Advanced Settings */}
          <SettingSection
            icon={Settings}
            title="Advanced Options"
            description="Fine-tune your experience"
          >
            <div className="space-y-4">
              <ToggleSetting
                label="Include Personal Insights"
                description="Show insights about your patterns and progress"
                checked={communicationSettings.includeInsights}
                onChange={(checked) => updatePreferences({ includeInsights: checked })}
              />
              
              <ToggleSetting
                label="Mention Agent Names"
                description="Reference specific agents by name in responses"
                checked={communicationSettings.mentionAgentNames}
                onChange={(checked) => updatePreferences({ mentionAgentNames: checked })}
              />
              
              <ToggleSetting
                label="Enable Parallel Processing"
                description="Allow agents to work simultaneously for faster responses"
                checked={performanceSettings.enableParallelProcessing}
                onChange={(checked) => updatePreferences({ enableParallelProcessing: checked })}
              />
            </div>
          </SettingSection>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Info className="h-4 w-4" />
              <span>Settings are saved automatically</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  updateTransparency({
                    transparencyLevel: 'standard',
                    showAgentReasoning: true,
                    showExecutionTimeline: true,
                    showConfidenceScores: false,
                    showAgentPersonalities: true
                  })
                  updatePreferences({
                    responseSpeed: 'balanced',
                    communicationStyle: 'professional_warm',
                    includeInsights: true,
                    mentionAgentNames: false,
                    enableParallelProcessing: true
                  })
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Reset to Defaults
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface SettingSectionProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  children: React.ReactNode
}

function SettingSection({ icon: Icon, title, description, children }: SettingSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-gray-600" />
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <div className="ml-8">
        {children}
      </div>
    </div>
  )
}

interface ToggleSettingProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleSetting({ label, description, checked, onChange }: ToggleSettingProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1"
      />
      <div>
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
    </label>
  )
}