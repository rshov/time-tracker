import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { ConvexReactClient, ConvexProvider } from 'convex/react'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useEffect } from 'react'

if (!import.meta.env.VITE_CONVEX_URL) {
  throw new Error('Missing VITE_CONVEX_URL in your .env file')
}

if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in your .env file')
}

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL, {
  unsavedChangesWarning: false,
})

const convexQueryClient = new ConvexQueryClient(convex)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
})
convexQueryClient.connect(queryClient)

function ConvexClientProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      // Set up auth token fetcher for Convex with explicit template name
      convex.setAuth(async (args) => {
        try {
          const token = await getToken({ template: 'convex' })
          console.log('Token requested:', token ? 'received' : 'null')
          return token ?? null
        } catch (error) {
          console.error('Error getting token:', error)
          return null
        }
      })
    } else if (isLoaded && !isSignedIn) {
      // Clear auth when signed out
      convex.clearAuth()
    }
  }, [getToken, isLoaded, isSignedIn])

  return (
    <ConvexProvider client={convex}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ConvexProvider>
  )
}

export function ConvexClerkProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider 
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      appearance={{
        signIn: {
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg"
          }
        },
        signUp: {
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg"
          }
        }
      }}
    >
      <ConvexClientProvider>
        {children}
      </ConvexClientProvider>
    </ClerkProvider>
  )
} 