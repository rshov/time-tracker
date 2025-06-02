import { Component, ErrorInfo, ReactNode } from 'react'
import { useClerk } from '@clerk/clerk-react'
import { Button } from './ui/button'
import { RefreshCw, LogOut } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={() => this.setState({ hasError: false })} />
    }

    return this.props.children
  }
}

function ErrorFallback({ error, onReset }: { error?: Error; onReset: () => void }) {
  const { signOut } = useClerk()

  const isAuthError = error?.message?.includes('User must be authenticated') || 
                     error?.message?.includes('CONVEX Q(timeTracking:')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md mx-auto text-center space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
          {isAuthError ? (
            <p className="text-muted-foreground">
              There's an authentication issue. Please sign out and sign back in to fix this.
            </p>
          ) : (
            <p className="text-muted-foreground">
              An unexpected error occurred. You can try refreshing the page or signing out.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {isAuthError && (
            <Button onClick={() => signOut()} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out & Try Again
            </Button>
          )}
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Page
          </Button>
          <Button variant="ghost" onClick={onReset} className="w-full">
            Reset Error Boundary
          </Button>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Error Details (Development)
            </summary>
            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
} 