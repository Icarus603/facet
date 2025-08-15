import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  MessageCircle, 
  Heart, 
  Target, 
  BookOpen,
  Zap
} from 'lucide-react'
import Link from 'next/link'

export function QuickActions() {
  const actions = [
    {
      icon: MessageCircle,
      title: 'AI Conversations',
      description: 'Chat with FACET AI',
      href: '/chat',
      bgColor: '#A5C7E2', // AI Therapy blue
    },
    {
      icon: Heart,
      title: 'Mood Tracking',
      description: 'Log your feelings',
      href: '/mood',
      bgColor: '#D4B6BA', // Crisis Support pink
    },
    {
      icon: Target,
      title: 'Progress Goals',
      description: 'Track your journey',
      href: '/goals',
      bgColor: '#BCD1CA', // Progress green
    },
    {
      icon: Zap,
      title: 'Quick Support',
      description: 'Instant wellness tools',
      href: '/exercises',
      bgColor: '#CBCADB', // Trust lavender
    },
  ]

  return (
    <div className="text-center mb-8">
      <h2 className="meslo-font text-2xl font-bold text-black mb-6" style={{fontStyle: 'italic'}}>
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {actions.map((action) => (
          <Link key={action.href} href={action.href}>
            <div 
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
              style={{backgroundColor: action.bgColor}}
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 p-3 bg-white/30 rounded-full">
                  <action.icon className="h-8 w-8 text-gray-800" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-700">
                  {action.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}