import invariant from 'tiny-invariant'
import { v } from 'convex/values'
import {
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

async function ensureClientExists(
  ctx: QueryCtx,
  clientId: string,
): Promise<Doc<'clients'>> {
  const client = await ctx.db
    .query('clients')
    .withIndex('id', (q) => q.eq('id', clientId))
    .unique()

  invariant(client, `missing client ${clientId}`)
  return client
}

async function ensureProjectExists(
  ctx: QueryCtx,
  projectId: string,
): Promise<Doc<'projects'>> {
  const project = await ctx.db
    .query('projects')
    .withIndex('id', (q) => q.eq('id', projectId))
    .unique()

  invariant(project, `missing project: ${projectId}`)
  return project
}

async function ensureTimeEntryExists(
  ctx: QueryCtx,
  entryId: string,
): Promise<Doc<'timeEntries'>> {
  const entry = await ctx.db
    .query('timeEntries')
    .withIndex('id', (q) => q.eq('id', entryId))
    .unique()

  invariant(entry, `missing time entry: ${entryId}`)
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
  const clients = await ctx.db.query('clients').collect()
  return clients.map(withoutSystemFields).filter(client => client.isActive)
})

export const createClient = mutation({
  args: createClientSchema,
  handler: async (ctx, { name, description }) => {
    const id = crypto.randomUUID()
    await ctx.db.insert('clients', {
      id,
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
    const client = await ensureClientExists(ctx, clientUpdate.id)
    await ctx.db.patch(client._id, clientUpdate)
  },
})

// PROJECT QUERIES AND MUTATIONS

export const getProjects = query({
  args: { clientId: v.optional(v.string()) },
  handler: async (ctx, { clientId }) => {
    let projects
    if (clientId) {
      projects = await ctx.db
        .query('projects')
        .withIndex('client', (q) => q.eq('clientId', clientId))
        .collect()
    } else {
      projects = await ctx.db.query('projects').collect()
    }
    return projects.map(withoutSystemFields).filter(project => project.isActive)
  },
})

export const createProject = mutation({
  args: createProjectSchema,
  handler: async (ctx, { clientId, name, description }) => {
    await ensureClientExists(ctx, clientId)
    const id = crypto.randomUUID()
    await ctx.db.insert('projects', {
      id,
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
    const project = await ensureProjectExists(ctx, projectUpdate.id)
    if (projectUpdate.clientId && projectUpdate.clientId !== project.clientId) {
      await ensureClientExists(ctx, projectUpdate.clientId)
    }
    await ctx.db.patch(project._id, projectUpdate)
  },
})

// TIME ENTRY QUERIES AND MUTATIONS

export const getCurrentTimeEntry = query(async (ctx) => {
  const entry = await ctx.db
    .query('timeEntries')
    .withIndex('running', (q) => q.eq('endTime', undefined))
    .unique()
  
  if (!entry) return null
  
  const [client, project] = await Promise.all([
    ensureClientExists(ctx, entry.clientId),
    ensureProjectExists(ctx, entry.projectId),
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
    // Ensure client and project exist
    await ensureClientExists(ctx, clientId)
    await ensureProjectExists(ctx, projectId)
    
    // Stop any currently running entry
    const currentEntry = await ctx.db
      .query('timeEntries')
      .withIndex('running', (q) => q.eq('endTime', undefined))
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
    const entry = await ensureTimeEntryExists(ctx, id)
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
    const entry = await ensureTimeEntryExists(ctx, entryUpdate.id)
    await ctx.db.patch(entry._id, entryUpdate)
  },
})

// REPORTING QUERIES

export const getDailyTimeReport = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, { date }) => {
    const targetDate = date || formatDate(new Date())
    
    const entries = await ctx.db
      .query('timeEntries')
      .withIndex('date', (q) => q.eq('date', targetDate))
      .filter((q) => q.neq(q.field('endTime'), undefined))
      .collect()
    
    const clientTotals = new Map<string, { client: any; total: number; projects: Map<string, { project: any; total: number }> }>()
    let totalTime = 0
    
    for (const entry of entries) {
      const duration = entry.duration || 0
      totalTime += duration
      
      const [client, project] = await Promise.all([
        ensureClientExists(ctx, entry.clientId),
        ensureProjectExists(ctx, entry.projectId),
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
    const targetDate = new Date(date || new Date())
    const startOfWeek = getStartOfWeek(targetDate)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    
    const startDate = formatDate(startOfWeek)
    const endDate = formatDate(endOfWeek)
    
    // Get all entries for the week
    const allEntries = await ctx.db.query('timeEntries').collect()
    const weekEntries = allEntries.filter(entry => 
      entry.date >= startDate && 
      entry.date <= endDate && 
      entry.endTime !== undefined
    )
    
    const clientTotals = new Map<string, { client: any; total: number }>()
    let totalTime = 0
    
    for (const entry of weekEntries) {
      const duration = entry.duration || 0
      totalTime += duration
      
      const client = await ensureClientExists(ctx, entry.clientId)
      
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
    let entries = await ctx.db.query('timeEntries').collect()
    
    // Filter by date range
    entries = entries.filter(entry => 
      entry.date >= startDate && 
      entry.date <= endDate && 
      entry.endTime !== undefined
    )
    
    // Filter by client if specified
    if (clientId) {
      entries = entries.filter(entry => entry.clientId === clientId)
    }
    
    // Filter by project if specified
    if (projectId) {
      entries = entries.filter(entry => entry.projectId === projectId)
    }
    
    const clientTotals = new Map<string, { 
      client: any; 
      total: number; 
      projects: Map<string, { project: any; total: number; entries: any[] }> 
    }>()
    let totalTime = 0
    
    for (const entry of entries) {
      const duration = entry.duration || 0
      totalTime += duration
      
      const [client, project] = await Promise.all([
        ensureClientExists(ctx, entry.clientId),
        ensureProjectExists(ctx, entry.projectId),
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
        ...withoutSystemFields(entry),
        durationFormatted: formatDuration(duration),
      })
    }
    
    return {
      startDate,
      endDate,
      totalTime,
      totalTimeFormatted: formatDuration(totalTime),
      clients: Array.from(clientTotals.entries()).map(([clientId, data]) => ({
        client: data.client,
        total: data.total,
        totalFormatted: formatDuration(data.total),
        projects: Array.from(data.projects.values()),
      })),
    }
  },
})

function formatDuration(milliseconds: number): string {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}
