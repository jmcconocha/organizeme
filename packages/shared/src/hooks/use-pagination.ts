"use client"

/**
 * usePagination Hook
 *
 * Custom React hook for managing pagination state, navigation, and URL synchronization.
 * Provides stateful pagination controls with automatic URL query parameter updates.
 */

import * as React from "react"

/**
 * Router adapter for pagination URL synchronization.
 * Implement this interface to connect pagination to your framework's router.
 */
export interface PaginationRouter {
  /** Get a search parameter value by key */
  getSearchParam: (key: string) => string | null
  /** Replace the current URL with a new query string (without ?) */
  replaceUrl: (queryString: string) => void
  /** Get the current search params as a string */
  getSearchParamsString: () => string
}

/**
 * Pagination configuration options.
 */
export interface UsePaginationOptions {
  /** Total number of items to paginate */
  totalItems: number
  /** Number of items to display per page (default: 20) */
  initialPageSize?: number
  /** Initial page number (default: 1) */
  initialPage?: number
  /** Whether to sync pagination state with URL query parameters (default: true) */
  syncWithUrl?: boolean
  /** Router adapter for URL synchronization. Required when syncWithUrl is true. */
  router?: PaginationRouter
}

/**
 * Return type for the usePagination hook.
 */
export interface UsePaginationReturn {
  /** Current page number (1-indexed) */
  currentPage: number
  /** Current page size */
  pageSize: number
  /** Total number of pages */
  totalPages: number
  /** Whether there is a previous page */
  hasPreviousPage: boolean
  /** Whether there is a next page */
  hasNextPage: boolean
  /** Navigate to a specific page */
  goToPage: (page: number) => void
  /** Navigate to the next page */
  nextPage: () => void
  /** Navigate to the previous page */
  previousPage: () => void
  /** Change the page size */
  setPageSize: (size: number) => void
  /** Get the start index for slicing an array (0-indexed) */
  startIndex: number
  /** Get the end index for slicing an array (0-indexed, exclusive) */
  endIndex: number
}

/**
 * Custom hook for managing pagination state and navigation.
 *
 * @param options - Pagination configuration options
 * @returns Object containing pagination state and navigation functions
 *
 * @example
 * ```tsx
 * // With a router adapter (enables URL sync)
 * const pagination = usePagination({
 *   totalItems: projects.length,
 *   initialPageSize: 20,
 *   router: myRouterAdapter,
 * })
 *
 * // Without router (no URL sync, state only)
 * const pagination = usePagination({
 *   totalItems: projects.length,
 *   syncWithUrl: false,
 * })
 * ```
 */
export function usePagination({
  totalItems,
  initialPageSize = 20,
  initialPage = 1,
  syncWithUrl = true,
  router,
}: UsePaginationOptions): UsePaginationReturn {
  // Disable URL sync if no router adapter is provided
  const canSyncUrl = syncWithUrl && router != null

  // Use a ref for router to prevent updateUrl from being recreated on every URL change
  const routerRef = React.useRef(router)
  React.useEffect(() => {
    routerRef.current = router
  })

  // Track whether initial mount is complete to avoid pushing URL on first render
  const hasMountedRef = React.useRef(false)
  React.useEffect(() => {
    hasMountedRef.current = true
  }, [])

  // Initialize state from URL params if syncing is enabled, otherwise use defaults
  const [currentPage, setCurrentPage] = React.useState<number>(() => {
    if (!canSyncUrl || !router) return initialPage
    const pageParam = router.getSearchParam("page")
    const page = pageParam ? parseInt(pageParam, 10) : initialPage
    return page > 0 ? page : initialPage
  })

  const [pageSize, setPageSizeState] = React.useState<number>(() => {
    if (!canSyncUrl || !router) return initialPageSize
    const pageSizeParam = router.getSearchParam("pageSize")
    const size = pageSizeParam ? parseInt(pageSizeParam, 10) : initialPageSize
    return size > 0 ? size : initialPageSize
  })

  // Calculate total pages based on total items and page size
  const totalPages = React.useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / pageSize))
  }, [totalItems, pageSize])

  // Calculate whether previous/next pages exist
  const hasPreviousPage = currentPage > 1
  const hasNextPage = currentPage < totalPages

  // Calculate array slice indices
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  /**
   * Updates the URL with current pagination parameters.
   */
  const updateUrl = React.useCallback(
    (page: number, size: number) => {
      if (!canSyncUrl || !hasMountedRef.current || !routerRef.current) return

      const params = new URLSearchParams(routerRef.current.getSearchParamsString())
      params.set("page", page.toString())
      params.set("pageSize", size.toString())
      routerRef.current.replaceUrl(`?${params.toString()}`)
    },
    [canSyncUrl]
  )

  /**
   * Navigate to a specific page.
   */
  const goToPage = React.useCallback(
    (page: number) => {
      const clampedPage = Math.max(1, Math.min(page, totalPages))
      setCurrentPage(clampedPage)
      updateUrl(clampedPage, pageSize)
    },
    [totalPages, pageSize, updateUrl]
  )

  /**
   * Navigate to the next page if available.
   */
  const nextPage = React.useCallback(() => {
    if (hasNextPage) {
      goToPage(currentPage + 1)
    }
  }, [hasNextPage, currentPage, goToPage])

  /**
   * Navigate to the previous page if available.
   */
  const previousPage = React.useCallback(() => {
    if (hasPreviousPage) {
      goToPage(currentPage - 1)
    }
  }, [hasPreviousPage, currentPage, goToPage])

  /**
   * Change the page size and reset to page 1.
   */
  const setPageSize = React.useCallback(
    (size: number) => {
      const validSize = Math.max(1, size)
      setPageSizeState(validSize)
      setCurrentPage(1)
      updateUrl(1, validSize)
    },
    [updateUrl]
  )

  // Auto-correct current page if it exceeds total pages
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      goToPage(totalPages)
    }
  }, [currentPage, totalPages, goToPage])

  return {
    currentPage,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    startIndex,
    endIndex,
  }
}
