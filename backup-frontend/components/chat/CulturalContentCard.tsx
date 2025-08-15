'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface CulturalContent {
  id: string
  title: string
  content: string
  source: string
  author?: string
  cultureTags: string[]
  therapeuticThemes: string[]
  contentType: string
}

interface CulturalContentCardProps {
  content: CulturalContent
  className?: string
}

export function CulturalContentCard({ content, className }: CulturalContentCardProps) {
  return (
    <div className={cn(
      "border border-purple-200 rounded-lg p-4 bg-purple-50",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-purple-900 mb-1">
            {content.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-purple-600">
            <span className="capitalize">{content.contentType}</span>
            {content.author && (
              <>
                <span>•</span>
                <span>by {content.author}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
            C
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-sm text-purple-800 leading-relaxed">
          {content.content.length > 200 
            ? `${content.content.substring(0, 200)}...`
            : content.content
          }
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {content.cultureTags.slice(0, 3).map((tag, index) => (
          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
            {tag}
          </span>
        ))}
        {content.cultureTags.length > 3 && (
          <span className="text-xs text-purple-600">
            +{content.cultureTags.length - 3} more
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-purple-600">
        <span>Source: {content.source}</span>
        <button className="hover:text-purple-800 transition-colors">
          Learn more →
        </button>
      </div>
    </div>
  )
}