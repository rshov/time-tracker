import { defineSchema, defineTable } from 'convex/server'
import { type Infer, v } from 'convex/values'

const schema = defineSchema({
  clients: defineTable({
    id: v.string(),
    userId: v.optional(v.string()), // Temporarily optional for migration
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index('id', ['id'])
    .index('user', ['userId'])
    .index('userActive', ['userId', 'isActive']),

  projects: defineTable({
    id: v.string(),
    userId: v.optional(v.string()), // Temporarily optional for migration
    clientId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index('id', ['id'])
    .index('user', ['userId'])
    .index('client', ['clientId'])
    .index('userClient', ['userId', 'clientId'])
    .index('userActive', ['userId', 'isActive']),

  timeEntries: defineTable({
    id: v.string(),
    userId: v.optional(v.string()), // Temporarily optional for migration
    clientId: v.string(),
    projectId: v.string(),
    startTime: v.number(), // timestamp in milliseconds
    endTime: v.optional(v.number()), // timestamp in milliseconds, null if currently running
    duration: v.optional(v.number()), // duration in milliseconds, calculated when stopped
    description: v.optional(v.string()),
    date: v.string(), // YYYY-MM-DD format for easy querying by date
  })
    .index('id', ['id'])
    .index('user', ['userId'])
    .index('client', ['clientId'])
    .index('project', ['projectId'])
    .index('date', ['date'])
    .index('running', ['endTime']) // to easily find running entries (where endTime is null)
    .index('userRunning', ['userId', 'endTime']) // to find user's running entries
    .index('userDate', ['userId', 'date'])
    .index('userClient', ['userId', 'clientId'])
    .index('userProject', ['userId', 'projectId'])
    .index('userClientDate', ['userId', 'clientId', 'date'])
    .index('userProjectDate', ['userId', 'projectId', 'date']),
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
  id: client.fields.id,
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
  id: project.fields.id,
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
  id: timeEntry.fields.id,
})

export const updateTimeEntrySchema = v.object({
  id: timeEntry.fields.id,
  description: v.optional(timeEntry.fields.description),
})

export const getTimeReportSchema = v.object({
  startDate: v.string(), // YYYY-MM-DD
  endDate: v.string(), // YYYY-MM-DD
  clientId: v.optional(v.string()),
  projectId: v.optional(v.string()),
})

export type Client = Infer<typeof client>
export type Project = Infer<typeof project>
export type TimeEntry = Infer<typeof timeEntry>
