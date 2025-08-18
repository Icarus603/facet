'use client'

import React, { useState, useEffect, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

interface DropdownMenuProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
}

interface DropdownItemProps {
  onClick: () => void
  children: ReactNode
  variant?: 'default' | 'destructive'
  className?: string
}

export function DropdownMenu({ trigger, children, align = 'right', className }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isOpen) {
        const target = event.target as HTMLElement
        if (!target.closest('.dropdown-container')) {
          setIsOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const getAlignmentClasses = () => {
    switch (align) {
      case 'left':
        return 'left-0'
      case 'center':
        return 'left-1/2 transform -translate-x-1/2'
      case 'right':
      default:
        return 'right-0'
    }
  }

  return (
    <div className={cn("relative dropdown-container", className)}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div className={cn(
          "absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-48",
          getAlignmentClasses()
        )}>
          <div className="py-2 px-2">
            {React.Children.map(children, (child) => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child, {
                  ...child.props,
                  onClick: () => {
                    child.props.onClick?.()
                    setIsOpen(false)
                  }
                })
              }
              return child
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function DropdownItem({ onClick, children, variant = 'default', className }: DropdownItemProps) {
  const handleClick = () => {
    onClick()
  }

  const getHoverColor = () => {
    return variant === 'destructive' ? '#F8ECEC' : '#F0EEE6'
  }

  const getTextColor = () => {
    return variant === 'destructive' ? 'text-red-600' : 'text-gray-700'
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2 text-base transition-colors rounded-md meslo-font",
        getTextColor(),
        className
      )}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = getHoverColor()}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
    >
      {children}
    </button>
  )
}

interface DropdownTriggerButtonProps {
  children: ReactNode
  isOpen?: boolean
  className?: string
}

export function DropdownTriggerButton({ children, isOpen = false, className }: DropdownTriggerButtonProps) {
  return (
    <button
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors group",
        className
      )}
      style={{ backgroundColor: isOpen ? '#F0EEE6' : 'transparent' }}
      onMouseEnter={(e) => {
        if (!isOpen) e.currentTarget.style.backgroundColor = '#F0EEE6'
      }}
      onMouseLeave={(e) => {
        if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {children}
      <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  )
}