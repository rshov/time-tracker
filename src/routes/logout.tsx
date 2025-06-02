import { createFileRoute } from '@tanstack/react-router'
import { useClerk } from '@clerk/clerk-react'
import { Button } from '../components/ui/button'
import { LogOut } from 'lucide-react'

export const Route = createFileRoute('/logout')({
  component: LogoutPage,
})

function LogoutPage() {
  const { signOut } = useClerk()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="max-w-md mx-auto text-center space-y-6 p-6">
        <h1 className="text-2xl font-bold text-foreground">Sign Out</h1>
        <p className="text-muted-foreground">
          Click the button below to sign out of your account.
        </p>
        <Button onClick={() => signOut()} className="w-full">
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )
} 