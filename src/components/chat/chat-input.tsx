/**
 * FACET Chat Input Component
 * Rich text input with typing indicators and send functionality
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  PaperAirplaneIcon,
  MicrophoneIcon,
  StopIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { 
  PaperAirplaneIcon as PaperAirplaneIconSolid 
} from '@heroicons/react/24/solid';

interface ChatInputProps {
  onSendMessage: (content: string, metadata?: Record<string, any>) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  showVoiceInput?: boolean;
  showEmergencyButton?: boolean;
  className?: string;
}

export function ChatInput({
  onSendMessage,
  onTyping,
  disabled = false,
  placeholder = "Type your message...",
  maxLength = 1000,
  showVoiceInput = false,
  showEmergencyButton = true,
  className
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showEmergencyConfirm, setShowEmergencyConfirm] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const isTypingRef = useRef(false);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, []);

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!isTypingRef.current && onTyping) {
      isTypingRef.current = true;
      onTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current && onTyping) {
        isTypingRef.current = false;
        onTyping(false);
      }
    }, 2000);
  }, [onTyping]);

  const handleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (isTypingRef.current && onTyping) {
      isTypingRef.current = false;
      onTyping(false);
    }
  }, [onTyping]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    
    if (value.length <= maxLength) {
      setMessage(value);
      adjustTextareaHeight();
      
      if (value.length > 0) {
        handleTypingStart();
      } else {
        handleTypingStop();
      }
    }
  };

  // Handle send message
  const handleSendMessage = useCallback(() => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    const metadata: Record<string, any> = {
      length: trimmedMessage.length,
      timestamp: Date.now()
    };

    // Check for emergency keywords
    const emergencyKeywords = ['crisis', 'emergency', 'help', 'urgent', 'suicide', 'harm'];
    const hasEmergencyKeywords = emergencyKeywords.some(keyword => 
      trimmedMessage.toLowerCase().includes(keyword)
    );

    if (hasEmergencyKeywords) {
      metadata.emergencyIndicators = emergencyKeywords.filter(keyword =>
        trimmedMessage.toLowerCase().includes(keyword)
      );
    }

    onSendMessage(trimmedMessage, metadata);
    setMessage('');
    handleTypingStop();
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [message, disabled, onSendMessage, handleTypingStop]);

  // Handle emergency button
  const handleEmergency = () => {
    if (!showEmergencyConfirm) {
      setShowEmergencyConfirm(true);
      return;
    }

    onSendMessage("I need immediate assistance - this is an emergency", {
      emergencyIndicators: ['emergency', 'crisis'],
      priority: 'critical',
      timestamp: Date.now()
    });
    
    setShowEmergencyConfirm(false);
  };

  // Handle voice recording
  const handleVoiceToggle = () => {
    if (isRecording) {
      setIsRecording(false);
      // TODO: Implement voice recording stop
    } else {
      setIsRecording(true);
      // TODO: Implement voice recording start
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line
        return;
      } else {
        e.preventDefault();
        handleSendMessage();
      }
    } else if (e.key === 'Escape') {
      setShowEmergencyConfirm(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      handleTypingStop();
    };
  }, [handleTypingStop]);

  const canSend = message.trim().length > 0 && !disabled;
  const characterCount = message.length;

  return (
    <div className={cn('flex flex-col gap-2 p-4 border-t bg-background', className)}>
      {/* Emergency confirmation */}
      {showEmergencyConfirm && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-slide-in">
          <ExclamationTriangleIcon className="w-5 h-5 text-destructive flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-destructive font-medium">
              Emergency Assistance
            </p>
            <p className="text-xs text-destructive/80">
              This will immediately alert crisis monitors. Continue?
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmergencyConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEmergency}
            >
              Yes, Get Help
            </Button>
          </div>
        </div>
      )}

      {/* Main input area */}
      <div className="flex items-end gap-3">
        {/* Emergency button */}
        {showEmergencyButton && (
          <Button
            variant={showEmergencyConfirm ? "destructive" : "outline"}
            size="sm"
            className={cn(
              'flex-shrink-0',
              showEmergencyConfirm && 'animate-pulse'
            )}
            onClick={handleEmergency}
            title="Emergency assistance"
          >
            <ExclamationTriangleIcon className="w-4 h-4" />
          </Button>
        )}

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Connecting...' : placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full min-h-[44px] max-h-[150px] px-4 py-3 pr-20',
              'rounded-2xl border resize-none',
              'focus:outline-none focus:ring-2 focus:ring-therapy-calm focus:border-transparent',
              'placeholder-muted-foreground',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              disabled && 'bg-muted'
            )}
          />
          
          {/* Character counter */}
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            <span className={characterCount > maxLength * 0.8 ? 'text-amber-500' : ''}>
              {characterCount}
            </span>
            <span>/{maxLength}</span>
          </div>
        </div>

        {/* Voice input button */}
        {showVoiceInput && (
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="sm"
            className="flex-shrink-0"
            onClick={handleVoiceToggle}
            disabled={disabled}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? (
              <StopIcon className="w-4 h-4" />
            ) : (
              <MicrophoneIcon className="w-4 h-4" />
            )}
          </Button>
        )}

        {/* Send button */}
        <Button
          variant={canSend ? "default" : "outline"}
          size="sm"
          className="flex-shrink-0 transition-all duration-200"
          onClick={handleSendMessage}
          disabled={!canSend}
          title="Send message (Enter)"
        >
          {canSend ? (
            <PaperAirplaneIconSolid className="w-4 h-4 text-white" />
          ) : (
            <PaperAirplaneIcon className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Input hints */}
      {message.length === 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Press Enter to send, Shift+Enter for new line</span>
          {showEmergencyButton && (
            <span className="text-destructive">
              Emergency assistance available 24/7
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Quick action buttons for common therapeutic responses
interface QuickActionsProps {
  onAction: (action: string) => void;
  disabled?: boolean;
  className?: string;
}

export function QuickActions({ onAction, disabled = false, className }: QuickActionsProps) {
  const actions = [
    { text: "I'm feeling anxious", category: 'emotion' },
    { text: "Can you explain that differently?", category: 'clarification' },
    { text: "I need a moment to process", category: 'reflection' },
    { text: "That was helpful", category: 'feedback' },
    { text: "I don't understand", category: 'clarification' },
    { text: "I'm ready to continue", category: 'progression' }
  ];

  return (
    <div className={cn('flex flex-wrap gap-2 p-2', className)}>
      {actions.map((action, index) => (
        <Button
          key={index}
          variant="outline"
          size="sm"
          className="text-xs h-8 px-3 hover:bg-therapy-calm/10 hover:border-therapy-calm/30"
          onClick={() => onAction(action.text)}
          disabled={disabled}
        >
          {action.text}
        </Button>
      ))}
    </div>
  );
}