import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import {
  MutationCache,
  notifyManager,
} from '@tanstack/react-query'
import { routerWithQueryClient } from '@tanstack/react-router-with-query'
import toast from 'react-hot-toast'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { ConvexReactClient } from 'convex/react'
import { QueryClient } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary'
import { NotFound } from './components/NotFound'
import { ConvexClerkProvider } from './components/ConvexClerkProvider'
import { ErrorBoundary } from './components/ErrorBoundary'

export function createRouter() {
  if (typeof document !== 'undefined') {
    notifyManager.setScheduler(window.requestAnimationFrame)
  }

  const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL!
  if (!CONVEX_URL) {
    console.error('missing envar CONVEX_URL')
  }
  
  const convex = new ConvexReactClient(CONVEX_URL)
  const convexQueryClient = new ConvexQueryClient(convex)

  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        queryKeyHashFn: convexQueryClient.hashFn(),
        queryFn: convexQueryClient.queryFn(),
      },
    },
    mutationCache: new MutationCache({
      onError: (error) => {
        toast(error.message, { className: 'bg-red-500 text-white' })
      },
    }),
  })
  convexQueryClient.connect(queryClient)

  const router = routerWithQueryClient(
    createTanStackRouter({
      routeTree,
      defaultPreload: 'intent',
      defaultErrorComponent: DefaultCatchBoundary,
      defaultNotFoundComponent: () => <NotFound />,
      context: { queryClient },
      Wrap: ({ children }) => (
        <ErrorBoundary>
          <ConvexClerkProvider>
            {children}
          </ConvexClerkProvider>
        </ErrorBoundary>
      ),
      scrollRestoration: true,
    }),
    queryClient,
  )

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
