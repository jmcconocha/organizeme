"use client"

import * as React from "react"
import NextLink from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { NavigationProvider, type LinkComponentProps } from "@organizeme/shared/context/navigation-context"
import type { PaginationRouter } from "@organizeme/shared/hooks/use-pagination"

/**
 * Adapts Next.js Link to the shared LinkComponentType interface.
 */
function NextLinkAdapter({ href, className, children, onClick }: LinkComponentProps) {
  return (
    <NextLink href={href} className={className} onClick={onClick}>
      {children}
    </NextLink>
  )
}

/**
 * Hook to create a PaginationRouter adapter for Next.js.
 */
export function useNextPaginationRouter(): PaginationRouter {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchParamsRef = React.useRef(searchParams)
  React.useEffect(() => {
    searchParamsRef.current = searchParams
  })

  return React.useMemo(
    () => ({
      getSearchParam: (key: string) => searchParams.get(key),
      replaceUrl: (queryString: string) => {
        router.replace(queryString, { scroll: false })
      },
      getSearchParamsString: () => searchParamsRef.current.toString(),
    }),
    [router, searchParams]
  )
}

/**
 * Provides Next.js navigation to shared components.
 */
export function NextNavigationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const value = React.useMemo(
    () => ({
      Link: NextLinkAdapter,
      navigate: (path: string) => router.push(path),
      refresh: () => router.refresh(),
    }),
    [router]
  )

  return (
    <NavigationProvider value={value}>
      {children}
    </NavigationProvider>
  )
}
