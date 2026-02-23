"use client"

/**
 * DataProvider Context
 *
 * Provides a DataProvider instance to the component tree.
 * Web apps wrap with their server-action-based provider,
 * desktop apps wrap with their Tauri IPC-based provider.
 */

import * as React from "react"
import type { DataProvider } from "../types/data-provider"

const DataProviderContext = React.createContext<DataProvider | null>(null)

export function DataProviderProvider({
  children,
  provider,
}: {
  children: React.ReactNode
  provider: DataProvider
}) {
  return (
    <DataProviderContext.Provider value={provider}>
      {children}
    </DataProviderContext.Provider>
  )
}

export function useDataProvider(): DataProvider {
  const context = React.useContext(DataProviderContext)
  if (!context) {
    throw new Error("useDataProvider must be used within a DataProviderProvider")
  }
  return context
}
