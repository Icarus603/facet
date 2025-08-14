'use client'

import React, { useState, useEffect } from 'react'
import {
  CrisisMonitoringInterfaceProps,
  CrisisIntervention,
  EmergencyContact
} from '@/types/agent-coordination'
import { useAgentCoordinationContext } from '@/providers/AgentCoordinationProvider'
import { cn } from '@/lib/utils'

export function CrisisMonitoringInterface({
  monitoringData,
  alerts,
  onInterventionTrigger,
  onEmergencyContactActivate,
  culturalAdaptationsEnabled = true,
  className
}: CrisisMonitoringInterfaceProps) {
  const { coordination } = useAgentCoordinationContext()
  const [selectedIntervention, setSelectedIntervention] = useState<string | null>(null)
  const [showEmergencyContacts, setShowEmergencyContacts] = useState(false)
  const [interventionNotes, setInterventionNotes] = useState('')

  // Subscribe to real-time crisis alerts
  useEffect(() => {
    const unsubscribe = coordination.subscribeToCrisisAlerts(monitoringData.userId)
    return unsubscribe
  }, [monitoringData.userId, coordination])

  const getRiskLevelConfig = (riskLevel: number) => {
    if (riskLevel >= 0.8) {
      return {
        color: 'bg-red-500',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        label: 'Critical Risk',
        icon: '🚨'
      }
    } else if (riskLevel >= 0.6) {
      return {
        color: 'bg-orange-500',
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        label: 'High Risk',
        icon: '⚠️'
      }
    } else if (riskLevel >= 0.4) {
      return {
        color: 'bg-yellow-500',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        label: 'Moderate Risk',
        icon: '⚡'
      }
    } else {
      return {
        color: 'bg-green-500',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        label: 'Low Risk',
        icon: '✅'
      }
    }
  }

  const riskConfig = getRiskLevelConfig(monitoringData.riskLevel)

  const getInterventionTypes = () => {
    const baseInterventions = [
      {
        type: 'de_escalation',
        label: 'De-escalation Techniques',
        description: 'Guided breathing and grounding exercises',
        icon: '🧘',
        culturalAdaptations: culturalAdaptationsEnabled ? [
          'Use culturally appropriate mindfulness practices',
          'Incorporate traditional calming methods',
          'Respect cultural views on mental health'
        ] : []
      },
      {
        type: 'safety_planning',
        label: 'Safety Planning',
        description: 'Create immediate safety strategies',
        icon: '🛡️',
        culturalAdaptations: culturalAdaptationsEnabled ? [
          'Include cultural support systems',
          'Consider family involvement appropriately',
          'Respect cultural decision-making processes'
        ] : []
      },
      {
        type: 'emergency_contact',
        label: 'Contact Support',
        description: 'Reach out to emergency contacts',
        icon: '📞',
        culturalAdaptations: culturalAdaptationsEnabled ? [
          'Use culturally appropriate communication styles',
          'Consider language preferences',
          'Respect cultural authority structures'
        ] : []
      },
      {
        type: 'professional_referral',
        label: 'Professional Referral',
        description: 'Connect with mental health professionals',
        icon: '👨‍⚕️',
        culturalAdaptations: culturalAdaptationsEnabled ? [
          'Find culturally competent providers',
          'Consider cultural barriers to treatment',
          'Provide culturally relevant resources'
        ] : []
      },
      {
        type: 'crisis_line',
        label: 'Crisis Hotline',
        description: 'Immediate crisis line support',
        icon: '🆘',
        culturalAdaptations: culturalAdaptationsEnabled ? [
          'Provide culturally specific crisis lines',
          'Offer multilingual support options',
          'Consider cultural stigma around crisis services'
        ] : []
      }
    ]

    // Filter based on risk level and cultural considerations
    if (monitoringData.riskLevel >= 0.8) {
      return baseInterventions // All interventions available for critical risk
    } else if (monitoringData.riskLevel >= 0.6) {
      return baseInterventions.filter(i => i.type !== 'crisis_line')
    } else {
      return baseInterventions.filter(i => 
        ['de_escalation', 'safety_planning', 'emergency_contact'].includes(i.type)
      )
    }
  }

  const handleInterventionTrigger = (interventionType: string) => {
    const intervention: Partial<CrisisIntervention> = {
      interventionType: interventionType as any,
      agentId: 'crisis_monitor',
      culturalAdaptations: culturalAdaptationsEnabled ? monitoringData.culturalConsiderations : [],
      notes: interventionNotes,
      followUpRequired: monitoringData.riskLevel >= 0.6
    }

    onInterventionTrigger(intervention)
    setInterventionNotes('')
    setSelectedIntervention(null)
  }

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const getPrimaryCulturalConsiderations = () => {
    return monitoringData.culturalConsiderations.slice(0, 3)
  }

  return (
    <div className={cn(
      "bg-white border rounded-lg p-4",
      riskConfig.borderColor,
      className
    )}>
      {/* Crisis Risk Header */}
      <div className={cn(
        "flex items-center justify-between p-3 rounded-lg mb-4",
        riskConfig.bgColor,
        riskConfig.borderColor,
        "border"
      )}>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{riskConfig.icon}</span>
          <div>
            <h3 className={cn("text-lg font-semibold", riskConfig.textColor)}>
              {riskConfig.label}
            </h3>
            <p className={cn("text-sm", riskConfig.textColor)}>
              Risk Level: {Math.round(monitoringData.riskLevel * 100)}%
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className={cn("text-sm font-medium", riskConfig.textColor)}>
            Last Assessment
          </div>
          <div className="text-xs text-gray-600">
            {formatTimeAgo(monitoringData.assessmentTimestamp)}
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Active Alerts</h4>
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.alertId}
                className="bg-red-50 border border-red-200 rounded p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-red-600">🚨</span>
                    <span className="font-medium text-red-900">
                      Risk Level: {Math.round(alert.riskLevel * 100)}%
                    </span>
                  </div>
                  <span className="text-xs text-red-600">
                    {formatTimeAgo(alert.detectedAt)}
                  </span>
                </div>
                
                {alert.triggerFactors.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-red-700 font-medium mb-1">Trigger Factors:</div>
                    <div className="flex flex-wrap gap-1">
                      {alert.triggerFactors.map((factor, index) => (
                        <span
                          key={index}
                          className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {alert.culturalConsiderations.length > 0 && culturalAdaptationsEnabled && (
                  <div className="mt-2">
                    <div className="text-xs text-purple-700 font-medium mb-1">Cultural Considerations:</div>
                    <div className="text-xs text-purple-600">
                      {alert.culturalConsiderations.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Factors */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Current Risk Factors</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {monitoringData.riskFactors.map((factor, index) => (
            <div
              key={index}
              className="bg-gray-50 border border-gray-200 rounded p-2"
            >
              <span className="text-sm text-gray-800">{factor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cultural Considerations */}
      {culturalAdaptationsEnabled && monitoringData.culturalConsiderations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            🌍 Cultural Considerations
          </h4>
          <div className="bg-purple-50 border border-purple-200 rounded p-3">
            <div className="space-y-1">
              {getPrimaryCulturalConsiderations().map((consideration, index) => (
                <div key={index} className="text-sm text-purple-700">
                  • {consideration}
                </div>
              ))}
              {monitoringData.culturalConsiderations.length > 3 && (
                <div className="text-xs text-purple-600 mt-1">
                  +{monitoringData.culturalConsiderations.length - 3} more considerations
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Intervention Options */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Crisis Interventions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {getInterventionTypes().map(intervention => (
            <button
              key={intervention.type}
              onClick={() => setSelectedIntervention(intervention.type)}
              className={cn(
                "text-left p-3 border rounded-lg hover:shadow-sm transition-all",
                selectedIntervention === intervention.type
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-lg">{intervention.icon}</span>
                <span className="font-medium text-gray-900">{intervention.label}</span>
              </div>
              <p className="text-xs text-gray-600">{intervention.description}</p>
              
              {culturalAdaptationsEnabled && intervention.culturalAdaptations.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs text-purple-600 font-medium">Cultural Adaptations:</div>
                  <div className="text-xs text-purple-600">
                    {intervention.culturalAdaptations[0]}
                    {intervention.culturalAdaptations.length > 1 && ' +more'}
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Intervention Details */}
      {selectedIntervention && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-blue-900">Intervention Details</h4>
            <button
              onClick={() => setSelectedIntervention(null)}
              className="text-blue-600 hover:text-blue-800"
            >
              ×
            </button>
          </div>

          {culturalAdaptationsEnabled && (
            <div className="mb-3">
              <label className="text-sm font-medium text-gray-700">
                Cultural Adaptations:
              </label>
              <div className="mt-1 space-y-1">
                {getInterventionTypes()
                  .find(i => i.type === selectedIntervention)
                  ?.culturalAdaptations.map((adaptation, index) => (
                    <div key={index} className="text-sm text-purple-700 bg-purple-50 rounded p-2">
                      • {adaptation}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="mb-3">
            <label className="text-sm font-medium text-gray-700">
              Intervention Notes:
            </label>
            <textarea
              value={interventionNotes}
              onChange={(e) => setInterventionNotes(e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 rounded text-sm"
              rows={3}
              placeholder="Add specific notes or considerations for this intervention..."
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => handleInterventionTrigger(selectedIntervention)}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
            >
              Trigger Intervention
            </button>
            <button
              onClick={() => setSelectedIntervention(null)}
              className="px-4 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Emergency Contacts */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700">Emergency Contacts</h4>
          <button
            onClick={() => setShowEmergencyContacts(!showEmergencyContacts)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showEmergencyContacts ? 'Hide' : 'Show'} Contacts
          </button>
        </div>

        {showEmergencyContacts && (
          <div className="space-y-2">
            {monitoringData.emergencyContacts.map(contact => (
              <div
                key={contact.contactId}
                className="flex items-center justify-between p-2 border border-gray-200 rounded"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">{contact.name}</span>
                    <span className="text-xs text-gray-500">({contact.relationship})</span>
                    {contact.isPrimary && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">{contact.phoneNumber}</div>
                  {contact.culturalConsiderations && culturalAdaptationsEnabled && (
                    <div className="text-xs text-purple-600 mt-1">
                      Cultural notes: {contact.culturalConsiderations.join(', ')}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onEmergencyContactActivate(contact.contactId)}
                  className="bg-green-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-green-700"
                >
                  Contact
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Interventions */}
      {monitoringData.interventionHistory.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Interventions</h4>
          <div className="max-h-32 overflow-y-auto space-y-2">
            {monitoringData.interventionHistory.slice(-3).reverse().map(intervention => (
              <div
                key={intervention.interventionId}
                className="bg-gray-50 border border-gray-200 rounded p-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {intervention.interventionType.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(intervention.timestamp)}
                  </span>
                </div>
                {intervention.notes && (
                  <p className="text-xs text-gray-600">{intervention.notes}</p>
                )}
                {intervention.effectiveness !== null && (
                  <div className="mt-1">
                    <span className="text-xs text-gray-500">Effectiveness: </span>
                    <span className="text-xs font-medium">
                      {Math.round(intervention.effectiveness * 100)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedIntervention('de_escalation')}
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            Quick De-escalation
          </button>
          <button
            onClick={() => setSelectedIntervention('emergency_contact')}
            className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700"
          >
            Contact Support
          </button>
          {monitoringData.riskLevel >= 0.8 && (
            <button
              onClick={() => setSelectedIntervention('crisis_line')}
              className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-red-700"
            >
              Crisis Hotline
            </button>
          )}
        </div>
      </div>
    </div>
  )
}