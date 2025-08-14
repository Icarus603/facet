'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface TherapeuticExercise {
  id: string
  title: string
  description: string
  instructions: string[]
  duration: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
}

interface TherapeuticExerciseProps {
  exercise: TherapeuticExercise
  className?: string
}

export function TherapeuticExercise({ exercise, className }: TherapeuticExerciseProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-700',
    intermediate: 'bg-yellow-100 text-yellow-700', 
    advanced: 'bg-red-100 text-red-700'
  }

  return (
    <div className={cn(
      "border border-blue-200 rounded-lg p-4 bg-blue-50",
      className
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-blue-900 mb-1">
            {exercise.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-blue-600">
            <span className="capitalize">{exercise.category}</span>
            <span>•</span>
            <span>{exercise.duration}</span>
            <span>•</span>
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-medium",
              difficultyColors[exercise.difficulty]
            )}>
              {exercise.difficulty}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
            E
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-blue-800 mb-3 leading-relaxed">
        {exercise.description}
      </p>

      {/* Instructions */}
      <div className="mb-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900 transition-colors"
        >
          <span>Instructions</span>
          <svg 
            className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="mt-2 space-y-2">
            {exercise.instructions.map((instruction, index) => (
              <div key={index} className="flex gap-3 text-sm text-blue-800">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </span>
                <span className="flex-1">{instruction}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCompleted(!isCompleted)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              isCompleted
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            )}
          >
            {isCompleted ? "✓ Completed" : "Mark Complete"}
          </button>
        </div>

        <button className="text-xs text-blue-600 hover:text-blue-800 transition-colors">
          Save for later →
        </button>
      </div>
    </div>
  )
}