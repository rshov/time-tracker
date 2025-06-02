import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { useState, useEffect } from 'react'
import { Play, Square, Clock } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import type { Id } from 'convex/_generated/dataModel'

function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function formatDuration(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

export function TimeTracker() {
  const queryClient = useQueryClient()
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [currentTime, setCurrentTime] = useState<number>(0)

  // Queries
  const { data: clients } = useSuspenseQuery(convexQuery(api.timeTracking.getClients, {}))
  const { data: projects } = useSuspenseQuery(convexQuery(api.timeTracking.getProjects, {}))
  const { data: runningEntry } = useSuspenseQuery(convexQuery(api.timeTracking.getCurrentTimeEntry, {}))
  const { data: dailyReport } = useSuspenseQuery(convexQuery(api.timeTracking.getDailyTimeReport, { date: new Date().toISOString().split('T')[0] }))
  const { data: weeklyReport } = useSuspenseQuery(convexQuery(api.timeTracking.getWeeklyTimeReport, {}))

  // Mutations
  const startTimer = useConvexMutation(api.timeTracking.startTimeEntry)
  const stopTimer = useConvexMutation(api.timeTracking.stopTimeEntry)

  // Populate selections from running entry when timer is active
  useEffect(() => {
    if (runningEntry && (!selectedClientId || !selectedProjectId)) {
      setSelectedClientId(runningEntry.clientId)
      setSelectedProjectId(runningEntry.projectId)
      if (runningEntry.description && !description) {
        setDescription(runningEntry.description)
      }
    }
  }, [runningEntry, selectedClientId, selectedProjectId, description])

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>
    
    if (runningEntry) {
      interval = setInterval(() => {
        const elapsed = Date.now() - runningEntry.startTime
        setCurrentTime(elapsed)
      }, 1000)
    } else {
      setCurrentTime(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [runningEntry])

  const handleStartTimer = async () => {
    if (!selectedClientId || !selectedProjectId) return
    
    await startTimer({
      clientId: selectedClientId as Id<'clients'>,
      projectId: selectedProjectId as Id<'projects'>,
      description: description || undefined,
    })
    
    queryClient.invalidateQueries()
    // Keep all selections including description for easy restart
  }

  const handleStopTimer = async () => {
    if (!runningEntry) return
    
    await stopTimer({ _id: runningEntry._id })
    queryClient.invalidateQueries()
    // Keep client, project, and description selected for easy restart
    // Note: selectedClientId, selectedProjectId, and description are all kept as they are
  }

  const activeClients = clients.filter(client => client.isActive)
  const availableProjects = projects.filter(
    project => project.isActive && project.clientId === selectedClientId
  )

  return (
    <div className="space-y-6">
      {/* Timer Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Tracker
          </CardTitle>
          <CardDescription>
            Track your time across different clients and projects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {runningEntry && (
            <div className="text-center">
              <div className="text-4xl font-mono font-bold text-primary mb-2">
                {formatTime(currentTime)}
              </div>
              <p className="text-sm text-muted-foreground">
                Working on: {runningEntry.client.name} → {runningEntry.project.name}
                {runningEntry.description && ` (${runningEntry.description})`}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Select
                value={selectedClientId}
                onValueChange={(value) => {
                  setSelectedClientId(value)
                  setSelectedProjectId('')
                }}
                disabled={!!runningEntry}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {activeClients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={!selectedClientId || !!runningEntry}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {availableProjects.map((project) => (
                    <SelectItem key={project._id} value={project._id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="What are you working on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            {runningEntry ? (
              <Button onClick={handleStopTimer} variant="destructive" className="flex-1 h-12">
                <Square className="w-4 h-4 mr-2" />
                Stop Timer
              </Button>
            ) : (
              <Button
                onClick={handleStartTimer}
                disabled={!selectedClientId || !selectedProjectId}
                className="flex-1 h-12"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Timer
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Summary</CardTitle>
          <CardDescription>
            Total time tracked today: {formatDuration(dailyReport.totalTime)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dailyReport.clients.map((clientData: any) => (
              <div key={clientData.client.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">{clientData.client.name}</h4>
                  <span className="text-sm font-medium">
                    {formatDuration(clientData.total)}
                  </span>
                </div>
                <div className="space-y-1">
                  {clientData.projects.map((projectData: any) => (
                    <div key={projectData.project.id} className="flex justify-between text-sm text-muted-foreground">
                      <span>• {projectData.project.name}</span>
                      <span>{formatDuration(projectData.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {dailyReport.clients.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No time tracked today yet. Start your first timer!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>This Week's Summary</CardTitle>
          <CardDescription>
            Total time tracked this week: {formatDuration(weeklyReport.totalTime)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {weeklyReport.clients.map((clientData: any) => (
              <div key={clientData.client.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <span className="font-medium">{clientData.client.name}</span>
                <span className="text-sm">{formatDuration(clientData.total)}</span>
              </div>
            ))}
            {weeklyReport.clients.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No time tracked this week yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 