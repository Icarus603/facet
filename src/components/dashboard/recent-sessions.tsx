import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MessageCircle, Clock } from 'lucide-react'
import Link from 'next/link'

interface RecentSessionsProps {
  sessions: any[]
}

export function RecentSessions({ sessions }: RecentSessionsProps) {
  if (!sessions || sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>
            Your recent therapy conversations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions yet</h3>
            <p className="text-gray-500 mb-4">Start your first therapy session to begin your journey</p>
            <Link href="/chat">
              <Button>
                Start Your First Session
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sessions</CardTitle>
        <CardDescription>
          Your recent therapy conversations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageCircle className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium">
                    {session.session_type.charAt(0).toUpperCase() + session.session_type.slice(1)} Session
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(session.started_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Link href={`/sessions/${session.id}`}>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}