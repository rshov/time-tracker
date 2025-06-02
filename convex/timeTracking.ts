import invariant from 'tiny-invariant'
import { v } from 'convex/values'
import {
  type MutationCtx,
  type QueryCtx,
  mutation,
  query,
} from './_generated/server'
import {
  createClientSchema,
  updateClientSchema,
  createProjectSchema,
  updateProjectSchema,
  startTimeEntrySchema,
  stopTimeEntrySchema,
  updateTimeEntrySchema,
  getTimeReportSchema,
} from './schema'
import type { Doc, Id } from './_generated/dataModel'

function withoutSystemFields<T extends { _creationTime: number; _id: Id<any> }>(
  doc: T,
) {
  const { _id, _creationTime, ...rest } = doc
  return rest
}

// Get authenticated user ID from context
async function getAuthenticatedUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()
  console.log('Auth identity:', identity)
  if (!identity) {
    console.error('No identity found - user not authenticated')
    throw new Error('User must be authenticated')
  }
  console.log('User authenticated with subject:', identity.subject)
  return identity.subject
}

async function ensureClientExists(
  ctx: QueryCtx | MutationCtx,
  clientId: string,
  userId: string,
): Promise<Doc<'clients'>> {
  const client = await ctx.db
    .query('clients')
    .withIndex('id', (q) => q.eq('id', clientId))
    .unique()

  invariant(client, `missing client ${clientId}`)
  invariant(client.userId === userId, `client ${clientId} does not belong to user`)
  return client
}

async function ensureProjectExists(
  ctx: QueryCtx | MutationCtx,
  projectId: string,
  userId: string,
): Promise<Doc<'projects'>> {
  const project = await ctx.db
    .query('projects')
    .withIndex('id', (q) => q.eq('id', projectId))
    .unique()

  invariant(project, `missing project: ${projectId}`)
  invariant(project.userId === userId, `project ${projectId} does not belong to user`)
  return project
}

async function ensureTimeEntryExists(
  ctx: QueryCtx | MutationCtx,
  entryId: string,
  userId: string,
): Promise<Doc<'timeEntries'>> {
  const entry = await ctx.db
    .query('timeEntries')
    .withIndex('id', (q) => q.eq('id', entryId))
    .unique()

  invariant(entry, `missing time entry: ${entryId}`)
  invariant(entry.userId === userId, `time entry ${entryId} does not belong to user`)
  return entry
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

// CLIENT QUERIES AND MUTATIONS

export const getClients = query(async (ctx) => {
  const userId = await getAuthenticatedUserId(ctx)
  const clients = await ctx.db
    .query('clients')
    .withIndex('userActive', (q) => q.eq('userId', userId).eq('isActive', true))
    .collect()
  return clients.map(withoutSystemFields)
})

export const createClient = mutation({
  args: createClientSchema,
  handler: async (ctx, { name, description }) => {
    const userId = await getAuthenticatedUserId(ctx)
    const id = crypto.randomUUID()
    await ctx.db.insert('clients', {
      id,
      userId,
      name,
      description,
      isActive: true,
    })
    return id
  },
})

export const updateClient = mutation({
  args: updateClientSchema,
  handler: async (ctx, clientUpdate) => {
    const userId = await getAuthenticatedUserId(ctx)
    const client = await ensureClientExists(ctx, clientUpdate.id, userId)
    await ctx.db.patch(client._id, clientUpdate)
  },
})

// PROJECT QUERIES AND MUTATIONS

export const getProjects = query({
  args: { clientId: v.optional(v.string()) },
  handler: async (ctx, { clientId }) => {
    const userId = await getAuthenticatedUserId(ctx)
    let projects
    if (clientId) {
      // Ensure the client belongs to the user first
      await ensureClientExists(ctx, clientId, userId)
      projects = await ctx.db
        .query('projects')
        .withIndex('userClient', (q) => q.eq('userId', userId).eq('clientId', clientId))
        .filter((q) => q.eq(q.field('isActive'), true))
        .collect()
    } else {
      projects = await ctx.db
        .query('projects')
        .withIndex('userActive', (q) => q.eq('userId', userId).eq('isActive', true))
        .collect()
    }
    return projects.map(withoutSystemFields)
  },
})

export const createProject = mutation({
  args: createProjectSchema,
  handler: async (ctx, { clientId, name, description }) => {
    const userId = await getAuthenticatedUserId(ctx)
    await ensureClientExists(ctx, clientId, userId)
    const id = crypto.randomUUID()
    await ctx.db.insert('projects', {
      id,
      userId,
      clientId,
      name,
      description,
      isActive: true,
    })
    return id
  },
})

export const updateProject = mutation({
  args: updateProjectSchema,
  handler: async (ctx, projectUpdate) => {
    const userId = await getAuthenticatedUserId(ctx)
    const project = await ensureProjectExists(ctx, projectUpdate.id, userId)
    if (projectUpdate.clientId && projectUpdate.clientId !== project.clientId) {
      await ensureClientExists(ctx, projectUpdate.clientId, userId)
    }
    await ctx.db.patch(project._id, projectUpdate)
  },
})

// TIME ENTRY QUERIES AND MUTATIONS

export const getCurrentTimeEntry = query(async (ctx) => {
  const userId = await getAuthenticatedUserId(ctx)
  const entry = await ctx.db
    .query('timeEntries')
    .withIndex('userRunning', (q) => q.eq('userId', userId).eq('endTime', undefined))
    .unique()
  
  if (!entry) return null
  
  const [client, project] = await Promise.all([
    ensureClientExists(ctx, entry.clientId, userId),
    ensureProjectExists(ctx, entry.projectId, userId),
  ])
  
  return {
    ...withoutSystemFields(entry),
    client: withoutSystemFields(client),
    project: withoutSystemFields(project),
  }
})

export const startTimeEntry = mutation({
  args: startTimeEntrySchema,
  handler: async (ctx, { clientId, projectId, description }) => {
    const userId = await getAuthenticatedUserId(ctx)
    
    // Ensure client and project exist and belong to user
    await ensureClientExists(ctx, clientId, userId)
    await ensureProjectExists(ctx, projectId, userId)
    
    // Stop any currently running entry for this user
    const currentEntry = await ctx.db
      .query('timeEntries')
      .withIndex('userRunning', (q) => q.eq('userId', userId).eq('endTime', undefined))
      .unique()
    
    if (currentEntry) {
      const endTime = Date.now()
      const duration = endTime - currentEntry.startTime
      await ctx.db.patch(currentEntry._id, {
        endTime,
        duration,
      })
    }
    
    // Start new entry
    const id = crypto.randomUUID()
    const startTime = Date.now()
    const date = formatDate(new Date(startTime))
    
    await ctx.db.insert('timeEntries', {
      id,
      userId,
      clientId,
      projectId,
      startTime,
      description,
      date,
    })
    
    return id
  },
})

export const stopTimeEntry = mutation({
  args: stopTimeEntrySchema,
  handler: async (ctx, { id }) => {
    const userId = await getAuthenticatedUserId(ctx)
    const entry = await ensureTimeEntryExists(ctx, id, userId)
    invariant(!entry.endTime, 'Time entry is already stopped')
    
    const endTime = Date.now()
    const duration = endTime - entry.startTime
    
    await ctx.db.patch(entry._id, {
      endTime,
      duration,
    })
  },
})

export const updateTimeEntry = mutation({
  args: updateTimeEntrySchema,
  handler: async (ctx, entryUpdate) => {
    const userId = await getAuthenticatedUserId(ctx)
    const entry = await ensureTimeEntryExists(ctx, entryUpdate.id, userId)
    await ctx.db.patch(entry._id, entryUpdate)
  },
})

// REPORTING QUERIES

export const getDailyTimeReport = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    const userId = await getAuthenticatedUserId(ctx)
    const targetDate = date || formatDate(new Date())
    
    const entries = await ctx.db
      .query('timeEntries')
      .withIndex('userDate', (q) => q.eq('userId', userId).eq('date', targetDate))
      .filter((q) => q.neq(q.field('endTime'), undefined))
      .collect()
    
    const clientTotals = new Map<string, { client: any; total: number; projects: Map<string, { project: any; total: number }> }>()
    let totalTime = 0
    
    for (const entry of entries) {
      const duration = entry.duration || 0
      totalTime += duration
      
      const [client, project] = await Promise.all([
        ensureClientExists(ctx, entry.clientId, userId),
        ensureProjectExists(ctx, entry.projectId, userId),
      ])
      
      if (!clientTotals.has(entry.clientId)) {
        clientTotals.set(entry.clientId, {
          client: withoutSystemFields(client),
          total: 0,
          projects: new Map(),
        })
      }
      
      const clientData = clientTotals.get(entry.clientId)!
      clientData.total += duration
      
      if (!clientData.projects.has(entry.projectId)) {
        clientData.projects.set(entry.projectId, {
          project: withoutSystemFields(project),
          total: 0,
        })
      }
      
      clientData.projects.get(entry.projectId)!.total += duration
    }
    
    return {
      date: targetDate,
      totalTime,
      clients: Array.from(clientTotals.entries()).map(([clientId, data]) => ({
        client: data.client,
        total: data.total,
        projects: Array.from(data.projects.values()),
      })),
    }
  },
})

export const getWeeklyTimeReport = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    const userId = await getAuthenticatedUserId(ctx)
    const targetDate = new Date(date || new Date())
    const startOfWeek = getStartOfWeek(targetDate)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    const startDate = formatDate(startOfWeek)
    const endDate = formatDate(endOfWeek)
    
    // Get all entries for the user for the week
    const allEntries = await ctx.db
      .query('timeEntries')
      .withIndex('user', (q) => q.eq('userId', userId))
      .filter((q) => q.neq(q.field('endTime'), undefined))
      .collect()
    
    const weekEntries = allEntries.filter(entry => 
      entry.date >= startDate && 
      entry.date <= endDate
    )
    
    const clientTotals = new Map<string, { client: any; total: number }>()
    let totalTime = 0
    
    for (const entry of weekEntries) {
      const duration = entry.duration || 0
      totalTime += duration
      
      const client = await ensureClientExists(ctx, entry.clientId, userId)
      
      if (!clientTotals.has(entry.clientId)) {
        clientTotals.set(entry.clientId, {
          client: withoutSystemFields(client),
          total: 0,
        })
      }
      
      clientTotals.get(entry.clientId)!.total += duration
    }
    
    return {
      startDate,
      endDate,
      totalTime,
      clients: Array.from(clientTotals.values()),
    }
  },
})

export const getCustomTimeReport = query({
  args: getTimeReportSchema,
  handler: async (ctx, { startDate, endDate, clientId, projectId }) => {
    const userId = await getAuthenticatedUserId(ctx)
    
    // Start with user's entries in date range
    let entries = await ctx.db
      .query('timeEntries')
      .withIndex('user', (q) => q.eq('userId', userId))
      .filter((q) => q.neq(q.field('endTime'), undefined))
      .collect()
    
    // Filter by date range
    entries = entries.filter(entry => 
      entry.date >= startDate && 
      entry.date <= endDate
    )
    
    // Filter by client if specified
    if (clientId) {
      await ensureClientExists(ctx, clientId, userId)
      entries = entries.filter(entry => entry.clientId === clientId)
    }
    
    // Filter by project if specified
    if (projectId) {
      await ensureProjectExists(ctx, projectId, userId)
      entries = entries.filter(entry => entry.projectId === projectId)
    }
    
    const clientTotals = new Map<string, { 
      client: any; 
      total: number; 
      projects: Map<string, { 
        project: any; 
        total: number; 
        entries: Array<{ id: string; date: string; duration: number; description?: string }> 
      }> 
    }>()
    let totalTime = 0
    
    for (const entry of entries) {
      const duration = entry.duration || 0
      totalTime += duration
      
      const [client, project] = await Promise.all([
        ensureClientExists(ctx, entry.clientId, userId),
        ensureProjectExists(ctx, entry.projectId, userId),
      ])
      
      if (!clientTotals.has(entry.clientId)) {
        clientTotals.set(entry.clientId, {
          client: withoutSystemFields(client),
          total: 0,
          projects: new Map(),
        })
      }
      
      const clientData = clientTotals.get(entry.clientId)!
      clientData.total += duration
      
      if (!clientData.projects.has(entry.projectId)) {
        clientData.projects.set(entry.projectId, {
          project: withoutSystemFields(project),
          total: 0,
          entries: [],
        })
      }
      
      const projectData = clientData.projects.get(entry.projectId)!
      projectData.total += duration
      projectData.entries.push({
        id: entry.id,
        date: entry.date,
        duration,
        description: entry.description,
      })
    }
    
    return {
      startDate,
      endDate,
      totalTime,
      clients: Array.from(clientTotals.entries()).map(([clientId, data]) => ({
        client: data.client,
        total: data.total,
        projects: Array.from(data.projects.entries()).map(([projectId, projectData]) => ({
          project: projectData.project,
          total: projectData.total,
          entries: projectData.entries.sort((a, b) => b.date.localeCompare(a.date)), // Sort by date desc
        })),
      })),
    }
  },
})
