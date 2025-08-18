'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface TransparencyPreferences {
  // Visibility Settings
  transparencyLevel: 'minimal' | 'standard' | 'detailed'
  showAgentReasoning: boolean
  showExecutionTimeline: boolean
  showConfidenceScores: boolean
  showAgentPersonalities: boolean
  
  // Performance Settings
  responseSpeed: 'fast' | 'balanced' | 'thorough'
  enableParallelProcessing: boolean
  maxWaitTimeSeconds: number
  
  // Communication Settings
  communicationStyle: 'professional_warm' | 'clinical_precise' | 'casual_supportive'
  verbosity: 'concise' | 'standard' | 'detailed'
  includeInsights: boolean
  mentionAgentNames: boolean
  
  // UI/UX Settings
  agentVisibility: boolean
  reducedMotion: boolean
  highContrast: boolean
  compactMode: boolean
  sidebarCollapsed: boolean
  
  // Notification Settings
  showProcessingNotifications: boolean
  showCompletionNotifications: boolean
  showErrorNotifications: boolean
  playSounds: boolean
}

export interface UserPreferences extends TransparencyPreferences {
  // User Profile
  displayName?: string
  timezone?: string
  language: string
  
  // Privacy Settings
  enablePersonalization: boolean
  shareAnonymousAnalytics: boolean
  dataRetentionDays: number
  allowCrisisSharing: boolean
  
  // System Settings
  autoSave: boolean
  saveConversationHistory: boolean
  exportFormat: 'json' | 'txt' | 'pdf'
  
  // Feature Flags
  betaFeatures: boolean
  developmentMode: boolean
}

interface PreferenceStore {
  preferences: UserPreferences
  
  // Actions
  updateTransparency: (transparency: Partial<TransparencyPreferences>) => void
  updatePreferences: (preferences: Partial<UserPreferences>) => void
  resetToDefaults: () => void
  exportPreferences: () => string
  importPreferences: (preferencesJson: string) => boolean
  
  // Getters
  getTransparencyLevel: () => TransparencyPreferences['transparencyLevel']
  getCommunicationStyle: () => TransparencyPreferences['communicationStyle']
  getResponseSpeed: () => TransparencyPreferences['responseSpeed']
  isFeatureEnabled: (feature: keyof TransparencyPreferences) => boolean
}

// Default preferences
const defaultPreferences: UserPreferences = {
  // Transparency Settings
  transparencyLevel: 'standard',
  showAgentReasoning: true,
  showExecutionTimeline: true,
  showConfidenceScores: false,
  showAgentPersonalities: true,
  
  // Performance Settings
  responseSpeed: 'balanced',
  enableParallelProcessing: true,
  maxWaitTimeSeconds: 30,
  
  // Communication Settings
  communicationStyle: 'professional_warm',
  verbosity: 'standard',
  includeInsights: true,
  mentionAgentNames: false,
  
  // UI/UX Settings
  agentVisibility: true,
  reducedMotion: false,
  highContrast: false,
  compactMode: false,
  sidebarCollapsed: false,
  
  // Notification Settings
  showProcessingNotifications: true,
  showCompletionNotifications: false,
  showErrorNotifications: true,
  playSounds: false,
  
  // User Profile
  language: 'en',
  
  // Privacy Settings
  enablePersonalization: true,
  shareAnonymousAnalytics: true,
  dataRetentionDays: 90,
  allowCrisisSharing: true,
  
  // System Settings
  autoSave: true,
  saveConversationHistory: true,
  exportFormat: 'json',
  
  // Feature Flags
  betaFeatures: false,
  developmentMode: false
}

export const usePreferenceStore = create<PreferenceStore>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      
      updateTransparency: (transparency) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...transparency
          }
        }))
      },
      
      updatePreferences: (newPreferences) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            ...newPreferences
          }
        }))
      },
      
      resetToDefaults: () => {
        set({ preferences: { ...defaultPreferences } })
      },
      
      exportPreferences: () => {
        return JSON.stringify(get().preferences, null, 2)
      },
      
      importPreferences: (preferencesJson) => {
        try {
          const imported = JSON.parse(preferencesJson)
          
          // Validate the imported preferences
          const validatedPreferences = {
            ...defaultPreferences,
            ...imported
          }
          
          set({ preferences: validatedPreferences })
          return true
        } catch (error) {
          console.error('Failed to import preferences:', error)
          return false
        }
      },
      
      getTransparencyLevel: () => get().preferences.transparencyLevel,
      getCommunicationStyle: () => get().preferences.communicationStyle,
      getResponseSpeed: () => get().preferences.responseSpeed,
      
      isFeatureEnabled: (feature) => {
        return Boolean(get().preferences[feature])
      }
    }),
    {
      name: 'facet-user-preferences',
      partialize: (state) => ({ preferences: state.preferences })
    }
  )
)

// Selectors for common use cases
export const selectTransparencySettings = (state: ReturnType<typeof usePreferenceStore.getState>) => ({
  level: state.preferences.transparencyLevel,
  showReasoning: state.preferences.showAgentReasoning,
  showTimeline: state.preferences.showExecutionTimeline,
  showConfidence: state.preferences.showConfidenceScores,
  showPersonalities: state.preferences.showAgentPersonalities
})

export const selectCommunicationSettings = (state: ReturnType<typeof usePreferenceStore.getState>) => ({
  style: state.preferences.communicationStyle,
  verbosity: state.preferences.verbosity,
  includeInsights: state.preferences.includeInsights,
  mentionAgentNames: state.preferences.mentionAgentNames
})

export const selectPerformanceSettings = (state: ReturnType<typeof usePreferenceStore.getState>) => ({
  responseSpeed: state.preferences.responseSpeed,
  enableParallelProcessing: state.preferences.enableParallelProcessing,
  maxWaitTime: state.preferences.maxWaitTimeSeconds
})

export const selectUISettings = (state: ReturnType<typeof usePreferenceStore.getState>) => ({
  agentVisibility: state.preferences.agentVisibility,
  reducedMotion: state.preferences.reducedMotion,
  highContrast: state.preferences.highContrast,
  compactMode: state.preferences.compactMode,
  sidebarCollapsed: state.preferences.sidebarCollapsed
})

export const selectPrivacySettings = (state: ReturnType<typeof usePreferenceStore.getState>) => ({
  enablePersonalization: state.preferences.enablePersonalization,
  shareAnalytics: state.preferences.shareAnonymousAnalytics,
  dataRetention: state.preferences.dataRetentionDays,
  allowCrisisSharing: state.preferences.allowCrisisSharing
})

// Derived hooks for common use cases
export const useTransparencySettings = () => usePreferenceStore(selectTransparencySettings)
export const useCommunicationSettings = () => usePreferenceStore(selectCommunicationSettings)
export const usePerformanceSettings = () => usePreferenceStore(selectPerformanceSettings)
export const useUISettings = () => usePreferenceStore(selectUISettings)
export const usePrivacySettings = () => usePreferenceStore(selectPrivacySettings)

// Actions
export const usePreferenceActions = () => usePreferenceStore((state) => ({
  updateTransparency: state.updateTransparency,
  updatePreferences: state.updatePreferences,
  resetToDefaults: state.resetToDefaults,
  exportPreferences: state.exportPreferences,
  importPreferences: state.importPreferences
}))

// Utility hooks
export const useTransparencyLevel = () => usePreferenceStore((state) => state.preferences.transparencyLevel)
export const useCommunicationStyle = () => usePreferenceStore((state) => state.preferences.communicationStyle)
export const useResponseSpeed = () => usePreferenceStore((state) => state.preferences.responseSpeed)
export const useAgentVisibility = () => usePreferenceStore((state) => state.preferences.agentVisibility)

// Theme and accessibility utilities
export const useAccessibilitySettings = () => usePreferenceStore((state) => ({
  reducedMotion: state.preferences.reducedMotion,
  highContrast: state.preferences.highContrast,
  playSounds: state.preferences.playSounds
}))

export const useNotificationSettings = () => usePreferenceStore((state) => ({
  showProcessing: state.preferences.showProcessingNotifications,
  showCompletion: state.preferences.showCompletionNotifications,
  showErrors: state.preferences.showErrorNotifications,
  playSounds: state.preferences.playSounds
}))