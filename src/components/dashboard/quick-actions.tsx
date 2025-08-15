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
      title: 'Start Therapy Session',
      description: 'Talk with your AI therapist',
      href: '/chat',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      icon: Heart,
      title: 'Log Mood',
      description: 'Track how you\'re feeling',
      href: '/mood',
      color: 'bg-pink-500 hover:bg-pink-600',
    },
    {
      icon: Target,
      title: 'View Goals',
      description: 'Check your progress',
      href: '/goals',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      icon: BookOpen,
      title: 'Journal Entry',
      description: 'Write about your day',
      href: '/journal',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      icon: Zap,
      title: 'Quick Exercise',
      description: 'Try a mindfulness exercise',
      href: '/exercises',
      color: 'bg-orange-500 hover:bg-orange-600',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Jump into activities that support your mental health
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {actions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 w-full border-gray-200 hover:border-gray-300"
              >
                <div className={`p-2 rounded-lg ${action.color} text-white`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-gray-500">{action.description}</div>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}