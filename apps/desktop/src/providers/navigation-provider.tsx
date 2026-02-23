import * as React from "react"
import { Link as RouterLink, useNavigate } from "react-router-dom"
import { NavigationProvider, type LinkComponentProps } from "@organizeme/shared/context/navigation-context"

function ReactRouterLink({ href, className, children, onClick }: LinkComponentProps) {
  return (
    <RouterLink to={href} className={className} onClick={onClick}>
      {children}
    </RouterLink>
  )
}

export function DesktopNavigationProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  const value = React.useMemo(
    () => ({
      Link: ReactRouterLink,
      navigate: (path: string) => navigate(path),
      refresh: () => {
        // In the desktop app, pages manage their own data fetching state.
        // Refresh is a no-op here; pages re-fetch via Tauri IPC as needed.
      },
    }),
    [navigate]
  )

  return (
    <NavigationProvider value={value}>
      {children}
    </NavigationProvider>
  )
}
