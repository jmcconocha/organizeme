import * as React from "react"
import { DataProviderProvider } from "@organizeme/shared/context/data-provider-context"
import { tauriDataProvider } from "../lib/tauri-data-provider"

export function DesktopDataProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <DataProviderProvider provider={tauriDataProvider}>
      {children}
    </DataProviderProvider>
  )
}
