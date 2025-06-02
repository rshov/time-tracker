import { useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { useState } from 'react'

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDuration(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

export function TimeReports() {
  const [startDate, setStartDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() - 30) // Default to last 30 days
    return formatDate(date)
  })
  const [endDate, setEndDate] = useState(formatDate(new Date()))
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  // Queries
  const clientsQuery = useSuspenseQuery(convexQuery(api.timeTracking.getClients, {}))
  const projectsQuery = useSuspenseQuery(
    convexQuery(api.timeTracking.getProjects, { clientId: selectedClientId || undefined })
  )
  const customReportQuery = useSuspenseQuery(
    convexQuery(api.timeTracking.getCustomTimeReport, {
      startDate,
      endDate,
      clientId: selectedClientId || undefined,
      projectId: selectedProjectId || undefined,
    })
  )

  const setQuickDateRange = (range: 'week' | 'month' | 'quarter') => {
    const end = new Date()
    const start = new Date()
    
    switch (range) {
      case 'week':
        start.setDate(end.getDate() - 7)
        break
      case 'month':
        start.setDate(end.getDate() - 30)
        break
      case 'quarter':
        start.setDate(end.getDate() - 90)
        break
    }
    
    setStartDate(formatDate(start))
    setEndDate(formatDate(end))
  }

  return (
    <div className="space-y-8">
      {/* Report Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Time Reports</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="filterClient" className="block text-sm font-medium text-gray-700 mb-1">
              Client (optional)
            </label>
            <select
              id="filterClient"
              value={selectedClientId}
              onChange={(e) => {
                setSelectedClientId(e.target.value)
                setSelectedProjectId('') // Reset project when client changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All clients</option>
              {clientsQuery.data.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="filterProject" className="block text-sm font-medium text-gray-700 mb-1">
              Project (optional)
            </label>
            <select
              id="filterProject"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={!selectedClientId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">All projects</option>
              {projectsQuery.data.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-col justify-end">
            <div className="flex space-x-2">
              <button
                onClick={() => setQuickDateRange('week')}
                className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              >
                7d
              </button>
              <button
                onClick={() => setQuickDateRange('month')}
                className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              >
                30d
              </button>
              <button
                onClick={() => setQuickDateRange('quarter')}
                className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
              >
                90d
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Results */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800">
            Report Results ({startDate} to {endDate})
          </h3>
          <div className="text-2xl font-bold text-purple-600">
            {customReportQuery.data.totalTimeFormatted}
          </div>
        </div>

        {customReportQuery.data.clients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No time entries found for the selected criteria.
          </div>
        ) : (
          <div className="space-y-6">
            {customReportQuery.data.clients.map((clientData) => (
              <div key={clientData.client.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-800">{clientData.client.name}</h4>
                  <div className="font-semibold text-blue-600">{clientData.totalFormatted}</div>
                </div>
                
                <div className="space-y-4">
                  {clientData.projects.map((projectData) => (
                    <div key={projectData.project.id} className="ml-4 border-l-2 border-gray-200 pl-4">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-medium text-gray-700">{projectData.project.name}</h5>
                        <div className="font-medium text-green-600">{formatDuration(projectData.total)}</div>
                      </div>
                      
                      <div className="space-y-2">
                        {projectData.entries.map((entry, index) => (
                          <div key={entry.id || index} className="flex justify-between items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                            <div className="flex items-center space-x-4">
                              <span>{entry.date}</span>
                              {entry.description && (
                                <span className="italic">"{entry.description}"</span>
                              )}
                            </div>
                            <span className="font-mono">{entry.durationFormatted}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 