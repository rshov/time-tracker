import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { useState } from 'react'
import { Building2, FolderPlus, Plus, Settings, Users } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import type { Id } from 'convex/_generated/dataModel'

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
  const { data: clients } = useSuspenseQuery(convexQuery(api.timeTracking.getClients, {}))
  const { data: projects } = useSuspenseQuery(convexQuery(api.timeTracking.getProjects, {}))

  // Mutations
  const createClient = useConvexMutation(api.timeTracking.createClient)
  const updateClient = useConvexMutation(api.timeTracking.updateClient)
  const createProject = useConvexMutation(api.timeTracking.createProject)
  const updateProject = useConvexMutation(api.timeTracking.updateProject)

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim()) return

    await createClient({
      name: clientName.trim(),
      description: clientDescription.trim() || undefined,
    })

    // Reset form
    setClientName('')
    setClientDescription('')
    setShowClientForm(false)
    queryClient.invalidateQueries()
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectName.trim() || !selectedClientId) return

    await createProject({
      clientId: selectedClientId as Id<'clients'>,
      name: projectName.trim(),
      description: projectDescription.trim() || undefined,
    })

    // Reset form
    setProjectName('')
    setProjectDescription('')
    setShowProjectForm(false)
    queryClient.invalidateQueries()
  }

  const handleToggleClientStatus = async (clientId: string, isActive: boolean) => {
    await updateClient({
      _id: clientId as Id<'clients'>,
      isActive: !isActive,
    })
    queryClient.invalidateQueries()
  }

  const handleToggleProjectStatus = async (projectId: string, clientId: string, isActive: boolean) => {
    await updateProject({
      _id: projectId as Id<'projects'>,
      clientId: clientId as Id<'clients'>,
      isActive: !isActive,
    })
    queryClient.invalidateQueries()
  }

  // Get all clients (including inactive ones for management)
  const allClients = clients

  return (
    <div className="space-y-6">
      {/* Clients Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Client Management
          </CardTitle>
          <CardDescription>
            Add new clients and manage existing ones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showClientForm ? (
            <Button onClick={() => setShowClientForm(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add New Client
            </Button>
          ) : (
            <form onSubmit={handleCreateClient} className="space-y-4 border rounded-lg p-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  placeholder="Enter client name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientDescription">Description</Label>
                <Input
                  id="clientDescription"
                  placeholder="Optional description"
                  value={clientDescription}
                  onChange={(e) => setClientDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={!clientName.trim()}>
                  Create Client
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowClientForm(false)
                    setClientName('')
                    setClientDescription('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Existing Clients */}
          <div className="space-y-2">
            {allClients.map((client) => (
              <div
                key={client._id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  client.isActive ? 'bg-background' : 'bg-muted/50'
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium">{client.name}</div>
                  {client.description && (
                    <div className="text-sm text-muted-foreground">{client.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    client.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {client.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleClientStatus(client._id, client.isActive)}
                  >
                    {client.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
            {allClients.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No clients yet. Add your first client to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Projects Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5" />
            Project Management
          </CardTitle>
          <CardDescription>
            Add new projects and manage existing ones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showProjectForm ? (
            <Button
              onClick={() => setShowProjectForm(true)}
              disabled={allClients.filter(c => c.isActive).length === 0}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Project
            </Button>
          ) : (
            <form onSubmit={handleCreateProject} className="space-y-4 border rounded-lg p-4">
              <div className="space-y-2">
                <Label htmlFor="projectClient">Client *</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {allClients
                      .filter(client => client.isActive)
                      .map((client) => (
                        <SelectItem key={client._id} value={client._id}>
                          {client.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  placeholder="Enter project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectDescription">Description</Label>
                <Input
                  id="projectDescription"
                  placeholder="Optional description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={!projectName.trim() || !selectedClientId}
                >
                  Create Project
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowProjectForm(false)
                    setSelectedClientId('')
                    setProjectName('')
                    setProjectDescription('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {allClients.filter(c => c.isActive).length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              You need at least one active client before you can create projects.
            </div>
          )}

          {/* Existing Projects by Client */}
          <div className="space-y-4">
            {allClients.map((client) => {
              const clientProjects = projects.filter(p => p.clientId === client._id)
              if (clientProjects.length === 0) return null

              return (
                <div key={client._id} className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {client.name}
                  </h3>
                  <div className="space-y-2">
                    {clientProjects.map((project) => (
                      <div
                        key={project._id}
                        className={`flex items-center justify-between p-3 border rounded-lg ${
                          project.isActive ? 'bg-background' : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{project.name}</div>
                          {project.description && (
                            <div className="text-sm text-muted-foreground">{project.description}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            project.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {project.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleProjectStatus(project._id, client._id, project.isActive)}
                          >
                            {project.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {projects.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No projects yet. Add your first project to get started.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 