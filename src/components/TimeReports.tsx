import { useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { useState } from 'react'
import { Calendar, Clock, FileText } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import type { Id } from 'convex/_generated/dataModel'

function formatDuration(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function TimeReports() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30) // Default to last 30 days
    return formatDate(date)
  })
  const [endDate, setEndDate] = useState(formatDate(new Date()))
  const [selectedClientId, setSelectedClientId] = useState<string>('all')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')

  // Queries
  const { data: clients } = useSuspenseQuery(convexQuery(api.timeTracking.getClients, {}))
  const { data: projects } = useSuspenseQuery(convexQuery(api.timeTracking.getProjects, {}))
  const { data: report } = useQuery(convexQuery(api.timeTracking.getCustomTimeReport, {
    startDate,
    endDate,
    clientId: selectedClientId === 'all' ? undefined : selectedClientId as Id<'clients'>,
    projectId: selectedProjectId === 'all' ? undefined : selectedProjectId as Id<'projects'>,
  }))

  const setQuickDateRange = (days: number) => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    setStartDate(formatDate(start))
    setEndDate(formatDate(end))
  }

  const activeClients = clients.filter(client => client.isActive)
  const availableProjects = projects.filter(
    project => project.isActive && (selectedClientId === 'all' || project.clientId === selectedClientId)
  )

  if (!report) {
    return <div>Loading report...</div>
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Time Reports
          </CardTitle>
          <CardDescription>
            Generate detailed reports for any date range and filter by client or project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Date Range Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange(7)}>
              Last 7 days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange(30)}>
              Last 30 days
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange(90)}>
              Last 90 days
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              const today = new Date()
              const startOfYear = new Date(today.getFullYear(), 0, 1)
              setStartDate(formatDate(startOfYear))
              setEndDate(formatDate(today))
            }}>
              This year
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientFilter">Filter by Client</Label>
              <Select
                value={selectedClientId}
                onValueChange={(value) => {
                  setSelectedClientId(value)
                  if (value !== 'all') {
                    // Clear project filter if it doesn't belong to the selected client
                    const projectBelongsToClient = projects.find(
                      p => p.clientId === value
                    )
                    if (!projectBelongsToClient) {
                      setSelectedProjectId('all')
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All clients</SelectItem>
                  {activeClients.map((client) => (
                    <SelectItem key={client._id} value={client._id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectFilter">Filter by Project</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {availableProjects.map((project) => (
                    <SelectItem key={project._id} value={project._id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Report Results
          </CardTitle>
          <CardDescription>
            Total time: {formatDuration(report.totalTime)} ({startDate} to {endDate})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {report.clients.map((clientData: any) => (
              <div key={clientData.client.name} className="border rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">{clientData.client.name}</h3>
                  <div className="text-right">
                    <div className="text-lg font-medium">{formatDuration(clientData.total)}</div>
                    <div className="text-sm text-muted-foreground">
                      {((clientData.total / report.totalTime) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {clientData.projects.map((projectData: any) => (
                    <div key={projectData.project.name} className="border-l-2 border-muted pl-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{projectData.project.name}</h4>
                        <span className="text-sm font-medium">{formatDuration(projectData.total)}</span>
                      </div>

                      {projectData.entries.length > 0 && (
                        <div className="space-y-1">
                          {projectData.entries.map((entry: any) => (
                            <div key={entry._id} className="flex justify-between items-center text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>{entry.date}</span>
                                {entry.description && (
                                  <span className="italic">• {entry.description}</span>
                                )}
                              </div>
                              <span>{formatDuration(entry.duration)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {report.clients.length === 0 && (
              <div className="text-center py-12">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No time entries found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your date range or removing filters to see more results.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 