import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { DashboardContent } from "@organizeme/ui/components/dashboard-content"
import { Header } from "@organizeme/ui/components/header"
import { DashboardSkeleton } from "@organizeme/ui/components/dashboard-skeleton"
import { useDataProvider } from "@organizeme/shared/context/data-provider-context"
import { getProjects } from "../lib/tauri-data-provider"
import type { Project, ProjectStatus } from "@organizeme/shared/types/project"
import type { PaginationRouter } from "@organizeme/shared/hooks/use-pagination"

function useReactRouterPaginationRouter(): PaginationRouter {
  const [searchParams, setSearchParams] = useSearchParams()

  return React.useMemo(
    () => ({
      getSearchParam: (key: string) => searchParams.get(key),
      replaceUrl: (queryString: string) => {
        const params = new URLSearchParams(queryString.replace(/^\?/, ""))
        setSearchParams(params, { replace: true })
      },
      getSearchParamsString: () => searchParams.toString(),
    }),
    [searchParams, setSearchParams]
  )
}

function getStatusSummary(
  projects: Project[]
): Record<ProjectStatus, number> & { total: number } {
  const summary: Record<ProjectStatus, number> & { total: number } = {
    active: 0,
    stale: 0,
    clean: 0,
    dirty: 0,
    unknown: 0,
    total: projects.length,
  }
  for (const project of projects) {
    summary[project.status]++
  }
  return summary
}

export function DashboardPage() {
  const dataProvider = useDataProvider()
  const paginationRouter = useReactRouterPaginationRouter()
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchProjects = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getProjects()
      setProjects(response.projects)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setError(message)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleRefresh = React.useCallback(async () => {
    const result = await dataProvider.refreshProjects()
    // Re-fetch projects after refresh
    await fetchProjects()
    return result
  }, [dataProvider, fetchProjects])

  const statusSummary = React.useMemo(() => getStatusSummary(projects), [projects])

  if (error) {
    return (
      <main className="min-h-screen bg-background">
        <Header
          title="Project Dashboard"
          subtitle="Your unified view for tracking development projects"
        />
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-destructive/10 p-4 mb-4">
              <svg className="h-8 w-8 text-destructive" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Failed to Load Projects</h2>
            <p className="text-muted-foreground max-w-md mb-4">{error}</p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header
        title="Project Dashboard"
        subtitle="Your unified view for tracking development projects"
      />
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <DashboardSkeleton />
        ) : (
          <DashboardContent
            projects={projects}
            statusSummary={statusSummary}
            onRefresh={handleRefresh}
            paginationRouter={paginationRouter}
          />
        )}
      </div>
    </main>
  )
}
