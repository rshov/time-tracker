import { useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { api } from 'convex/_generated/api'
import { Loader } from '~/components/Loader'
import { useState, useEffect } from 'react'
import { TimeTracker } from '~/components/TimeTracker'
import { TimeReports } from '~/components/TimeReports'
import { ClientProjectManager } from '~/components/ClientProjectManager'

export const Route = createFileRoute('/')({
  component: TimeTrackerApp,
  pendingComponent: () => <Loader />,
})

function TimeTrackerApp() {
  const [activeTab, setActiveTab] = useState<'tracker' | 'reports' | 'manage'>('tracker')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Time Tracker</h1>
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab('tracker')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'tracker'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Tracker
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'reports'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Reports
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  activeTab === 'manage'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Manage
              </button>
            </nav>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'tracker' && <TimeTracker />}
        {activeTab === 'reports' && <TimeReports />}
        {activeTab === 'manage' && <ClientProjectManager />}
      </main>
    </div>
  )
}
