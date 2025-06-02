import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { useState } from 'react'

export function ClientProjectManager() {
  const queryClient = useQueryClient()
  const [showClientForm, setShowClientForm] = useState(false)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  // Form states
  const [clientName, setClientName] = useState('')
  const [clientDescription, setClientDescription] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectDescription, setProjectDescription] = useState('')

  // Queries
  const clientsQuery = useSuspenseQuery(convexQuery(api.timeTracking.getClients, {}))
  const allProjectsQuery = useSuspenseQuery(convexQuery(api.timeTracking.getProjects, {}))

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: useConvexMutation(api.timeTracking.createClient),
    onSuccess: () => {
      queryClient.invalidateQueries()
      setClientName('')
      setClientDescription('')
      setShowClientForm(false)
    },
  })

  const createProjectMutation = useMutation({
    mutationFn: useConvexMutation(api.timeTracking.createProject),
    onSuccess: () => {
      queryClient.invalidateQueries()
      setProjectName('')
      setProjectDescription('')
      setSelectedClientId('')
      setShowProjectForm(false)
    },
  })

  const updateClientMutation = useMutation({
    mutationFn: useConvexMutation(api.timeTracking.updateClient),
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: useConvexMutation(api.timeTracking.updateProject),
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim()) return

    createClientMutation.mutate({
      name: clientName.trim(),
      description: clientDescription.trim() || undefined,
    })
  }

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim() || !selectedClientId) return

    createProjectMutation.mutate({
      clientId: selectedClientId,
      name: projectName.trim(),
      description: projectDescription.trim() || undefined,
    })
  }

  const handleToggleClientActive = (clientId: string, currentStatus: boolean) => {
    updateClientMutation.mutate({
      id: clientId,
      isActive: !currentStatus,
    })
  }

  const handleToggleProjectActive = (projectId: string, clientId: string, currentStatus: boolean) => {
    updateProjectMutation.mutate({
      id: projectId,
      clientId: clientId,
      isActive: !currentStatus,
    })
  }

  // Group projects by client
  const projectsByClient = allProjectsQuery.data.reduce((acc: Record<string, typeof allProjectsQuery.data>, project) => {
    if (!acc[project.clientId]) {
      acc[project.clientId] = []
    }
    acc[project.clientId].push(project)
    return acc
  }, {})

  return (
    <div className="space-y-8">
      {/* Clients Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Clients</h2>
          <button
            onClick={() => setShowClientForm(!showClientForm)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          >
            {showClientForm ? 'Cancel' : 'Add Client'}
          </button>
        </div>

        {showClientForm && (
          <form onSubmit={handleCreateClient} className="mb-6 p-4 bg-gray-50 rounded-md space-y-4">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
                Client Name *
              </label>
              <input
                id="clientName"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter client name"
                required
              />
            </div>
            <div>
              <label htmlFor="clientDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="clientDescription"
                value={clientDescription}
                onChange={(e) => setClientDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter client description"
                rows={3}
              />
            </div>
            <button
              type="submit"
              disabled={!clientName.trim() || createClientMutation.isPending}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-md transition-colors"
            >
              {createClientMutation.isPending ? 'Creating...' : 'Create Client'}
            </button>
          </form>
        )}

        <div className="space-y-4">
          {clientsQuery.data.map((client) => (
            <div key={client.id} className="border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-semibold text-gray-800">{client.name}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        client.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {client.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {client.description && (
                    <p className="text-gray-600 mt-1">{client.description}</p>
                  )}
                  
                  {/* Projects for this client */}
                  {projectsByClient[client.id] && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Projects:</h4>
                      <div className="space-y-1">
                        {projectsByClient[client.id].map((project) => (
                          <div key={project.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-700">{project.name}</span>
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  project.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {project.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleToggleProjectActive(project.id, project.clientId, project.isActive)}
                              disabled={updateProjectMutation.isPending}
                              className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                            >
                              {project.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleToggleClientActive(client.id, client.isActive)}
                  disabled={updateClientMutation.isPending}
                  className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                >
                  {client.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}

          {clientsQuery.data.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No clients found. Create your first client to get started.
            </div>
          )}
        </div>
      </div>

      {/* Projects Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Add New Project</h2>
          <button
            onClick={() => setShowProjectForm(!showProjectForm)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
          >
            {showProjectForm ? 'Cancel' : 'Add Project'}
          </button>
        </div>

        {showProjectForm && (
          <form onSubmit={handleCreateProject} className="p-4 bg-gray-50 rounded-md space-y-4">
            <div>
              <label htmlFor="projectClient" className="block text-sm font-medium text-gray-700 mb-1">
                Client *
              </label>
              <select
                id="projectClient"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a client...</option>
                {clientsQuery.data
                  .filter(client => client.isActive)
                  .map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                id="projectName"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project name"
                required
              />
            </div>
            <div>
              <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="projectDescription"
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project description"
                rows={3}
              />
            </div>
            <button
              type="submit"
              disabled={!projectName.trim() || !selectedClientId || createProjectMutation.isPending}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-md transition-colors"
            >
              {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
} 