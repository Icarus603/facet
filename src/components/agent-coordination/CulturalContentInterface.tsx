'use client'

import React, { useState } from 'react'
import {
  CulturalContentInterfaceProps,
  CulturalContent,
  BiasIndicator
} from '@/types/agent-coordination'
import { cn } from '@/lib/utils'

export function CulturalContentInterface({
  contentResponse,
  onContentSelect,
  onBiasReport,
  showExpertValidationStatus = true,
  culturalProfile,
  className
}: CulturalContentInterfaceProps) {
  const [selectedContent, setSelectedContent] = useState<CulturalContent | null>(null)
  const [showBiasDetails, setShowBiasDetails] = useState(false)
  const [expandedContent, setExpandedContent] = useState<string | null>(null)

  const getBiasLevelConfig = (biasScore: number) => {
    if (biasScore >= 0.7) {
      return {
        color: 'bg-red-500',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        label: 'High Bias Risk',
        icon: '⚠️'
      }
    } else if (biasScore >= 0.4) {
      return {
        color: 'bg-yellow-500',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        label: 'Moderate Bias',
        icon: '⚡'
      }
    } else if (biasScore >= 0.2) {
      return {
        color: 'bg-blue-500',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
        label: 'Low Bias',
        icon: '💡'
      }
    } else {
      return {
        color: 'bg-green-500',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        label: 'Minimal Bias',
        icon: '✅'
      }
    }
  }

  const getContentTypeIcon = (contentType: string) => {
    const icons = {
      meditation: '🧘',
      story: '📖',
      proverb: '💬',
      philosophy: '🤔',
      ritual: '🕯️',
      practice: '🙏'
    }
    return icons[contentType as keyof typeof icons] || '📄'
  }

  const getContentTypeColor = (contentType: string) => {
    const colors = {
      meditation: 'text-purple-600 bg-purple-50',
      story: 'text-blue-600 bg-blue-50',
      proverb: 'text-green-600 bg-green-50',
      philosophy: 'text-indigo-600 bg-indigo-50',
      ritual: 'text-orange-600 bg-orange-50',
      practice: 'text-pink-600 bg-pink-50'
    }
    return colors[contentType as keyof typeof colors] || 'text-gray-600 bg-gray-50'
  }

  const formatCulturalRelevance = (content: CulturalContent) => {
    const userCultures = culturalProfile.culturalTags.map(tag => tag.toLowerCase())
    const contentCultures = content.cultureTags.map(tag => tag.toLowerCase())
    
    const matches = contentCultures.filter(culture =>
      userCultures.some(userCulture =>
        userCulture.includes(culture) || culture.includes(userCulture)
      )
    )

    return {
      matchCount: matches.length,
      totalUserCultures: userCultures.length,
      relevancePercentage: matches.length / Math.max(userCultures.length, 1) * 100
    }
  }

  const handleContentSelect = (content: CulturalContent) => {
    setSelectedContent(content)
    onContentSelect(content)
  }

  const getBiasSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-700 bg-red-100'
      case 'high':
        return 'text-red-600 bg-red-50'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50'
      case 'low':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className={cn(
      "bg-white border border-gray-200 rounded-lg p-4",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Cultural Content Recommendations
          </h3>
          <p className="text-sm text-gray-500">
            Culturally-adapted therapeutic content for {culturalProfile.primaryCulture}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-right text-xs">
            <div className="text-gray-500">Relevance Score</div>
            <div className="font-medium text-gray-900">
              {Math.round(contentResponse.relevanceScore * 100)}%
            </div>
          </div>
          <button
            onClick={() => setShowBiasDetails(!showBiasDetails)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {showBiasDetails ? 'Hide' : 'Show'} Bias Analysis
          </button>
        </div>
      </div>

      {/* Cultural Context Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-purple-600">🌍</span>
          <span className="font-medium text-purple-900">Cultural Context</span>
        </div>
        <div className="flex flex-wrap gap-1 mb-2">
          {culturalProfile.culturalTags.map((tag, index) => (
            <span
              key={index}
              className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="text-sm text-purple-700">
          Content themes: {contentResponse.culturalThemes.join(', ')}
        </div>
      </div>

      {/* Bias Assessment */}
      {showBiasDetails && (
        <div className="mb-4">
          <div className={cn(
            "border rounded-lg p-3",
            getBiasLevelConfig(contentResponse.biasAssessment.biasScore).bgColor,
            "border-gray-200"
          )}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span>{getBiasLevelConfig(contentResponse.biasAssessment.biasScore).icon}</span>
                <span className={cn(
                  "font-medium",
                  getBiasLevelConfig(contentResponse.biasAssessment.biasScore).textColor
                )}>
                  {getBiasLevelConfig(contentResponse.biasAssessment.biasScore).label}
                </span>
              </div>
              <span className="text-sm font-medium">
                Score: {Math.round(contentResponse.biasAssessment.biasScore * 100)}%
              </span>
            </div>

            {contentResponse.biasAssessment.biasIndicators.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-700">Bias Indicators:</div>
                {contentResponse.biasAssessment.biasIndicators.slice(0, 3).map((indicator, index) => (
                  <div
                    key={index}
                    className={cn(
                      "text-xs px-2 py-1 rounded",
                      getBiasSeverityColor(indicator.severity)
                    )}
                  >
                    <span className="font-medium">{indicator.type.replace('_', ' ')}:</span> {indicator.explanation}
                  </div>
                ))}
                {contentResponse.biasAssessment.biasIndicators.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{contentResponse.biasAssessment.biasIndicators.length - 3} more indicators
                  </div>
                )}
              </div>
            )}

            <div className="mt-2 text-xs">
              <span className="font-medium">Cultural Appropriateness: </span>
              <span>{Math.round(contentResponse.biasAssessment.culturalAppropriateness * 100)}%</span>
              <span className="mx-2">•</span>
              <span className="font-medium">Confidence: </span>
              <span>{Math.round(contentResponse.biasAssessment.confidence * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Content Cards */}
      <div className="space-y-4">
        {contentResponse.content.map((content, index) => {
          const biasConfig = getBiasLevelConfig(content.biasScore || 0)
          const culturalRelevance = formatCulturalRelevance(content)
          const isExpanded = expandedContent === content.id

          return (
            <div
              key={content.id}
              className={cn(
                "border rounded-lg p-4 hover:shadow-sm transition-all cursor-pointer",
                selectedContent?.id === content.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
              onClick={() => handleContentSelect(content)}
            >
              {/* Content Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3 flex-1">
                  <span className="text-2xl">
                    {getContentTypeIcon(content.contentType)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 mb-1">
                      {content.title}
                    </h4>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded font-medium",
                        getContentTypeColor(content.contentType)
                      )}>
                        {content.contentType}
                      </span>
                      <span className="text-xs text-gray-500">
                        {content.region}
                      </span>
                      {showExpertValidationStatus && (
                        <span className={cn(
                          "text-xs px-2 py-1 rounded",
                          content.expertValidated
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        )}>
                          {content.expertValidated ? '✓ Validated' : 'Pending Review'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1">
                  <div className="text-xs text-gray-500">Cultural Match</div>
                  <div className="font-medium text-sm">
                    {Math.round(culturalRelevance.relevancePercentage)}%
                  </div>
                  {content.biasScore !== undefined && (
                    <div className={cn(
                      "text-xs px-1.5 py-0.5 rounded",
                      biasConfig.bgColor,
                      biasConfig.textColor
                    )}>
                      Bias: {Math.round(content.biasScore * 100)}%
                    </div>
                  )}
                </div>
              </div>

              {/* Cultural Tags */}
              <div className="flex flex-wrap gap-1 mb-3">
                {content.cultureTags.slice(0, 4).map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className={cn(
                      "text-xs px-2 py-1 rounded",
                      culturalProfile.culturalTags.some(userTag =>
                        userTag.toLowerCase().includes(tag.toLowerCase()) ||
                        tag.toLowerCase().includes(userTag.toLowerCase())
                      )
                        ? "bg-purple-100 text-purple-700 border border-purple-200"
                        : "bg-gray-100 text-gray-600"
                    )}
                  >
                    {tag}
                  </span>
                ))}
                {content.cultureTags.length > 4 && (
                  <span className="text-xs text-gray-500">
                    +{content.cultureTags.length - 4} more
                  </span>
                )}
              </div>

              {/* Content Preview */}
              <div className="mb-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {isExpanded
                    ? content.content
                    : content.content.length > 200
                      ? `${content.content.substring(0, 200)}...`
                      : content.content
                  }
                </p>
                {content.content.length > 200 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedContent(isExpanded ? null : content.id)
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    {isExpanded ? 'Show Less' : 'Read More'}
                  </button>
                )}
              </div>

              {/* Cultural Significance */}
              <div className="mb-3">
                <div className="text-xs font-medium text-gray-700 mb-1">Cultural Significance:</div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {content.culturalSignificance}
                </p>
              </div>

              {/* Therapeutic Applications */}
              {content.therapeuticApplications.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-700 mb-1">Therapeutic Applications:</div>
                  <div className="flex flex-wrap gap-1">
                    {content.therapeuticApplications.map((application, appIndex) => (
                      <span
                        key={appIndex}
                        className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded"
                      >
                        {application}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleContentSelect(content)
                    }}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                  >
                    Use Content
                  </button>
                  {content.biasScore && content.biasScore > 0.3 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onBiasReport(content.id, 'Cultural sensitivity concern')
                      }}
                      className="text-sm border border-yellow-300 text-yellow-700 px-3 py-1 rounded hover:bg-yellow-50"
                    >
                      Report Bias
                    </button>
                  )}
                </div>

                <div className="text-xs text-gray-500">
                  {content.source && (
                    <span>Source: {content.source}</span>
                  )}
                  {content.expertValidator && (
                    <span className="ml-2">• Validated by {content.expertValidator}</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recommendations */}
      {contentResponse.recommendations.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Usage Recommendations</h4>
          <ul className="space-y-1">
            {contentResponse.recommendations.map((recommendation, index) => (
              <li key={index} className="text-sm text-blue-800">
                • {recommendation}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Usage Guidance */}
      {contentResponse.usageGuidance && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
          <h4 className="text-sm font-medium text-green-900 mb-2">Usage Guidance</h4>
          <p className="text-sm text-green-800">{contentResponse.usageGuidance}</p>
        </div>
      )}

      {/* Cautionary Notes */}
      {contentResponse.cautionaryNotes && contentResponse.cautionaryNotes.length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <h4 className="text-sm font-medium text-yellow-900 mb-2">⚠️ Important Considerations</h4>
          <ul className="space-y-1">
            {contentResponse.cautionaryNotes.map((note, index) => (
              <li key={index} className="text-sm text-yellow-800">
                • {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expert Validation Status */}
      {showExpertValidationStatus && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Expert Validation Status</span>
            <div className="flex items-center space-x-4">
              <span className={cn(
                "font-medium",
                contentResponse.expertValidation ? "text-green-600" : "text-yellow-600"
              )}>
                {contentResponse.expertValidation ? 'All content validated' : 'Some content pending review'}
              </span>
              {!contentResponse.expertValidation && (
                <button className="text-blue-600 hover:text-blue-800">
                  Request Priority Review
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}