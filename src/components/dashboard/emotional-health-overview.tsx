import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface EmotionalHealthOverviewProps {
  userId: string
}

export function EmotionalHealthOverview({ userId }: EmotionalHealthOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Emotional Health Overview</CardTitle>
        <CardDescription>
          Your emotional patterns and trends over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-lg font-medium">Mood tracking chart will appear here</div>
            <div className="text-sm">Integration with emotion analyzer coming soon</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}