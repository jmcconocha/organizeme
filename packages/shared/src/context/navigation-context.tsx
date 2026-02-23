"use client"

import * as React from "react"

/**
 * Props for link components used across the app.
 */
export interface LinkComponentProps {
  href: string
  className?: string
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

/**
 * Type for a link component that can be swapped per framework.
 */
export type LinkComponentType = React.ComponentType<LinkComponentProps>

/**
 * Default link component using a plain anchor tag.
 */
const DefaultLink: LinkComponentType = ({ href, children, ...props }) => (
  <a href={href} {...props}>{children}</a>
)

/**
 * Navigation context value.
 */
export interface NavigationContextValue {
  /** Link component for client-side navigation */
  Link: LinkComponentType
  /** Programmatic navigation */
  navigate: (path: string) => void
  /** Refresh current route data */
  refresh: () => void
}

const NavigationContext = React.createContext<NavigationContextValue>({
  Link: DefaultLink,
  navigate: (path) => { window.location.href = path },
  refresh: () => { window.location.reload() },
})

export function NavigationProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: NavigationContextValue
}) {
  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  return React.useContext(NavigationContext)
}
