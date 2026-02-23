"use client"

/**
 * Web DataProvider Wrapper
 *
 * Wraps children with the DataProviderProvider using
 * the web (server actions) implementation.
 */

import * as React from "react"
import { DataProviderProvider } from "@organizeme/shared/context/data-provider-context"
import { webDataProvider } from "@/lib/web-data-provider"

export function WebDataProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DataProviderProvider provider={webDataProvider}>
      {children}
    </DataProviderProvider>
  )
}
