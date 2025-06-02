import { defineSchema, defineTable } from 'convex/server'
import { type Infer, v } from 'convex/values'

const schema = defineSchema({
  clients: defineTable({
    userId: v.string(), // Required field for multi-user support
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_active', ['userId', 'isActive']),

  projects: defineTable({
    userId: v.string(), // Required field for multi-user support
    clientId: v.id('clients'), // Reference to client document
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index('by_user', ['userId'])
    .index('by_client', ['clientId'])
    .index('by_user_and_client', ['userId', 'clientId'])
    .index('by_user_and_active', ['userId', 'isActive']),

  timeEntries: defineTable({
    userId: v.string(), // Required field for multi-user support
    clientId: v.id('clients'), // Reference to client document
    projectId: v.id('projects'), // Reference to project document
    startTime: v.number(), // timestamp in milliseconds
    endTime: v.optional(v.number()), // timestamp in milliseconds, null if currently running
    duration: v.optional(v.number()), // duration in milliseconds, calculated when stopped
    description: v.optional(v.string()),
    date: v.string(), // YYYY-MM-DD format for easy querying by date
  })
    .index('by_user', ['userId'])
    .index('by_client', ['clientId'])
    .index('by_project', ['projectId'])
    .index('by_date', ['date'])
    .index('by_running', ['endTime']) // to easily find running entries (where endTime is null)
    .index('by_user_and_running', ['userId', 'endTime']) // to find user's running entries
    .index('by_user_and_date', ['userId', 'date'])
    .index('by_user_and_client', ['userId', 'clientId'])
    .index('by_user_and_project', ['userId', 'projectId'])
    .index('by_user_client_and_date', ['userId', 'clientId', 'date'])
    .index('by_user_project_and_date', ['userId', 'projectId', 'date']),
})

export default schema

const client = schema.tables.clients.validator
const project = schema.tables.projects.validator
const timeEntry = schema.tables.timeEntries.validator

export const createClientSchema = v.object({
  name: client.fields.name,
  description: v.optional(client.fields.description),
})

export const updateClientSchema = v.object({
  _id: v.id('clients'),
  name: v.optional(client.fields.name),
  description: v.optional(client.fields.description),
  isActive: v.optional(client.fields.isActive),
})

export const createProjectSchema = v.object({
  clientId: project.fields.clientId,
  name: project.fields.name,
  description: v.optional(project.fields.description),
})

export const updateProjectSchema = v.object({
  _id: v.id('projects'),
  clientId: project.fields.clientId,
  name: v.optional(project.fields.name),
  description: v.optional(project.fields.description),
  isActive: v.optional(project.fields.isActive),
})

export const startTimeEntrySchema = v.object({
  clientId: timeEntry.fields.clientId,
  projectId: timeEntry.fields.projectId,
  description: v.optional(timeEntry.fields.description),
})

export const stopTimeEntrySchema = v.object({
  _id: v.id('timeEntries'),
})

export const updateTimeEntrySchema = v.object({
  _id: v.id('timeEntries'),
  description: v.optional(timeEntry.fields.description),
})

export const getTimeReportSchema = v.object({
  startDate: v.string(), // YYYY-MM-DD
  endDate: v.string(), // YYYY-MM-DD
  clientId: v.optional(v.id('clients')),
  projectId: v.optional(v.id('projects')),
})

export type Client = Infer<typeof client>
export type Project = Infer<typeof project>
export type TimeEntry = Infer<typeof timeEntry>
