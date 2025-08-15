import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ProgressSummaryProps {
  userId: string
}

export function ProgressSummary({ userId }: ProgressSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Summary</CardTitle>
        <CardDescription>
          Your therapeutic journey progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg font-medium">Progress tracking coming soon</div>
            <div className="text-sm">Goal completion and milestone tracking</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}