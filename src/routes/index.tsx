import { createFileRoute } from '@tanstack/react-router'
import { Loader } from '~/components/Loader'
import { TimeTracker } from '~/components/TimeTracker'
import { TimeReports } from '~/components/TimeReports'
import { ClientProjectManager } from '~/components/ClientProjectManager'
import { AuthWrapper } from '~/components/AuthWrapper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { useUser, UserButton } from '@clerk/clerk-react'

export const Route = createFileRoute('/')({
  component: () => (
    <AuthWrapper>
      <TimeTrackerApp />
    </AuthWrapper>
  ),
  pendingComponent: () => <Loader />,
})

function TimeTrackerApp() {
  const { user } = useUser()

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Time Tracker</h1>
              <p className="text-muted-foreground mt-1">
                Track your time across different clients and projects
              </p>
            </div>
            <div className="flex items-center gap-3">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                    userButtonPopoverCard: "border border-border shadow-lg",
                    userButtonPopoverActionButton: "hover:bg-muted"
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
