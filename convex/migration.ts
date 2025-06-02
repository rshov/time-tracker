import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const clearAllData = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Delete all existing data to start fresh with the new schema
    const clients = await ctx.db.query('clients').collect()
    const projects = await ctx.db.query('projects').collect()
    const timeEntries = await ctx.db.query('timeEntries').collect()
    
    // Delete all records
    for (const client of clients) {
      await ctx.db.delete(client._id)
    }
    
    for (const project of projects) {
      await ctx.db.delete(project._id)
    }
    
    for (const entry of timeEntries) {
      await ctx.db.delete(entry._id)
    }
    
    console.log('All data cleared successfully')
    return null
  },
}) 