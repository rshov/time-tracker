import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { useState, useEffect } from 'react'

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
  const [currentTime, setCurrentTime] = useState(0)

  // Queries
  const clientsQuery = useSuspenseQuery(convexQuery(api.timeTracking.getClients, {}))
  const projectsQuery = useSuspenseQuery(
    convexQuery(api.timeTracking.getProjects, { clientId: selectedClientId || undefined })
  )
  const currentEntryQuery = useSuspenseQuery(convexQuery(api.timeTracking.getCurrentTimeEntry, {}))
  const dailyReportQuery = useSuspenseQuery(convexQuery(api.timeTracking.getDailyTimeReport, {}))
  const weeklyReportQuery = useSuspenseQuery(convexQuery(api.timeTracking.getWeeklyTimeReport, {}))

  // Mutations
  const startTimerMutation = useMutation({
    mutationFn: useConvexMutation(api.timeTracking.startTimeEntry),
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })

  const stopTimerMutation = useMutation({
    mutationFn: useConvexMutation(api.timeTracking.stopTimeEntry),
    onSuccess: () => {
      queryClient.invalidateQueries()
      setCurrentTime(0)
    },
  })

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null
    
    if (currentEntryQuery.data) {
      const startTime = currentEntryQuery.data.startTime
      const updateTimer = () => {
        setCurrentTime(Date.now() - startTime)
      }
      
      updateTimer() // Initial update
      interval = setInterval(updateTimer, 1000)
    } else {
      setCurrentTime(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentEntryQuery.data])

  // Set initial selections when data loads
  useEffect(() => {
    if (currentEntryQuery.data) {
      setSelectedClientId(currentEntryQuery.data.client.id)
      setSelectedProjectId(currentEntryQuery.data.project.id)
      setDescription(currentEntryQuery.data.description || '')
    }
  }, [currentEntryQuery.data])

  // Update projects when client changes
  useEffect(() => {
    setSelectedProjectId('')
  }, [selectedClientId])

  const handleStart = () => {
    if (!selectedClientId || !selectedProjectId) return
    
    startTimerMutation.mutate({
      clientId: selectedClientId,
      projectId: selectedProjectId,
      description: description || undefined,
    })
  }

  const handleStop = () => {
    if (!currentEntryQuery.data) return
    
    stopTimerMutation.mutate({
      id: currentEntryQuery.data.id,
    })
  }

  const isRunning = Boolean(currentEntryQuery.data)
  const canStart = !isRunning && selectedClientId && selectedProjectId

  return (
    <div className="space-y-8">
      {/* Timer Section */}
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center space-y-6">
          <div className="text-6xl font-mono font-bold text-gray-800">
            {formatTime(currentTime)}
          </div>
          
          {isRunning && currentEntryQuery.data && (
            <div className="text-lg text-gray-600">
              <div className="font-medium">
                {currentEntryQuery.data.client.name} • {currentEntryQuery.data.project.name}
              </div>
              {currentEntryQuery.data.description && (
                <div className="text-sm text-gray-500 mt-1">
                  {currentEntryQuery.data.description}
                </div>
              )}
            </div>
          )}

          {!isRunning && (
            <div className="space-y-4 max-w-md mx-auto">
              <div>
                <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
                  Client
                </label>
                <select
                  id="client"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a client...</option>
                  {clientsQuery.data.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  id="project"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  disabled={!selectedClientId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">Select a project...</option>
                  {projectsQuery.data.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="What are you working on?"
                />
              </div>
            </div>
          )}

          <div>
            {isRunning ? (
              <button
                onClick={handleStop}
                disabled={stopTimerMutation.isPending}
                className="px-8 py-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg text-lg transition-colors"
              >
                {stopTimerMutation.isPending ? 'Stopping...' : 'Stop'}
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={!canStart || startTimerMutation.isPending}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg text-lg transition-colors"
              >
                {startTimerMutation.isPending ? 'Starting...' : 'Start'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Daily Report */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Today's Time</h2>
        <div className="space-y-4">
          <div className="text-2xl font-bold text-blue-600">
            Total: {formatDuration(dailyReportQuery.data.totalTime)}
          </div>
          
          {dailyReportQuery.data.clients.map((clientData) => (
            <div key={clientData.client.id} className="border-l-4 border-blue-200 pl-4">
              <div className="font-medium text-gray-800">
                {clientData.client.name} - {formatDuration(clientData.total)}
              </div>
              <div className="ml-4 space-y-1">
                {clientData.projects.map((projectData) => (
                  <div key={projectData.project.id} className="text-sm text-gray-600">
                    {projectData.project.name}: {formatDuration(projectData.total)}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {dailyReportQuery.data.clients.length === 0 && (
            <div className="text-gray-500 italic">No time tracked today</div>
          )}
        </div>
      </div>

      {/* Weekly Report */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">This Week's Time</h2>
        <div className="space-y-4">
          <div className="text-2xl font-bold text-green-600">
            Total: {formatDuration(weeklyReportQuery.data.totalTime)}
          </div>
          
          {weeklyReportQuery.data.clients.map((clientData) => (
            <div key={clientData.client.id} className="border-l-4 border-green-200 pl-4">
              <div className="font-medium text-gray-800">
                {clientData.client.name} - {formatDuration(clientData.total)}
              </div>
            </div>
          ))}
          
          {weeklyReportQuery.data.clients.length === 0 && (
            <div className="text-gray-500 italic">No time tracked this week</div>
          )}
        </div>
      </div>
    </div>
  )
} 