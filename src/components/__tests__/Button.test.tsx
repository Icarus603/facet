import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('applies therapy variant styling', () => {
    render(<Button variant="therapy">Therapy Button</Button>)
    const button = screen.getByRole('button', { name: /therapy button/i })
    expect(button).toHaveClass('bg-therapy-calm')
  })

  it('applies crisis variant styling with animation', () => {
    render(<Button variant="crisis">Crisis Button</Button>)
    const button = screen.getByRole('button', { name: /crisis button/i })
    expect(button).toHaveClass('bg-destructive', 'animate-pulse')
  })

  it('handles disabled state', () => {
    render(<Button disabled>Disabled Button</Button>)
    const button = screen.getByRole('button', { name: /disabled button/i })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:opacity-50')
  })

  it('renders different sizes correctly', () => {
    render(<Button size="sm">Small Button</Button>)
    const button = screen.getByRole('button', { name: /small button/i })
    expect(button).toHaveClass('h-8')
  })
})