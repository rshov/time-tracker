import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { Loader } from '~/components/Loader'
import { TimeTracker } from '~/components/TimeTracker'
import { TimeReports } from '~/components/TimeReports'
import { ClientProjectManager } from '~/components/ClientProjectManager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'

export const Route = createFileRoute('/')({
  component: TimeTrackerApp,
  pendingComponent: () => <Loader />,
})

function TimeTrackerApp() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Time Tracker</h1>
              <p className="text-muted-foreground mt-1">
                Track your time across different clients and projects
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="tracker" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="tracker">Tracker</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>
          
          <TabsContent value="tracker">
            <TimeTracker />
          </TabsContent>
          
          <TabsContent value="reports">
            <TimeReports />
          </TabsContent>
          
          <TabsContent value="manage">
            <ClientProjectManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
