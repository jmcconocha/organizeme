"use client"

import * as React from "react"
import { DashboardContent, type DashboardContentProps } from "@organizeme/ui/components/dashboard-content"
import { useNextPaginationRouter } from "./navigation-provider-wrapper"
import { useDataProvider } from "@organizeme/shared/context/data-provider-context"

/**
 * Web-specific wrapper that provides Next.js pagination router and
 * DataProvider-sourced onRefresh to DashboardContent.
 */
export function DashboardWrapper(props: Omit<DashboardContentProps, 'paginationRouter' | 'onRefresh'>) {
  const paginationRouter = useNextPaginationRouter()
  const dataProvider = useDataProvider()
  return <DashboardContent {...props} paginationRouter={paginationRouter} onRefresh={dataProvider.refreshProjects} />
}
