import { useUser, SignIn } from '@clerk/clerk-react'
import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'

interface AuthWrapperProps {
  children: ReactNode
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const { isLoaded, isSignedIn } = useUser()

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Time Tracker</h1>
            <p className="text-muted-foreground">
              Sign in to track your time across different clients and projects
            </p>
          </div>
          <SignIn 
            routing="virtual"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-lg border border-border",
                headerTitle: "text-foreground",
                headerSubtitle: "text-muted-foreground",
                socialButtonsBlockButton: "border border-border",
                formButtonPrimary: "bg-primary hover:bg-primary/90",
                footerActionLink: "text-primary hover:text-primary/90"
              }
            }}
          />
        </div>
      </div>
    )
  }

  return <>{children}</>
} 