import * as React from "react"
import { useParams } from "react-router-dom"
import { Header } from "@organizeme/ui/components/header"
import { StatusBadge } from "@organizeme/ui/components/status-badge"
import { Separator } from "@organizeme/ui/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@organizeme/ui/ui/card"
import { MarkdownRenderer } from "@organizeme/ui/components/markdown-renderer"
import { Button } from "@organizeme/ui/ui/button"
import { useDataProvider } from "@organizeme/shared/context/data-provider-context"
import { getProject } from "../lib/tauri-data-provider"
import type { Project } from "@organizeme/shared/types/project"

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const d = new Date(date)
  const diffInMs = now.getTime() - d.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))

  if (diffInDays > 30) return `${Math.floor(diffInDays / 30)} months ago`
  if (diffInDays > 7) return `${Math.floor(diffInDays / 7)} weeks ago`
  if (diffInDays > 0) return `${diffInDays} days ago`
  if (diffInHours > 0) return `${diffInHours} hours ago`
  if (diffInMinutes > 0) return `${diffInMinutes} minutes ago`
  return "Just now"
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const dataProvider = useDataProvider()
  const [project, setProject] = React.useState<Project | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!id) return
    setLoading(true)
    getProject(id)
      .then((p) => {
        setProject(p)
        if (!p) setError("Project not found")
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [id])

  const handleAction = React.useCallback(
    async (action: () => Promise<{ success: boolean; message: string }>, errorPrefix: string) => {
      setActionError(null)
      try {
        const result = await action()
        if (!result.success) setActionError(result.message)
      } catch {
        setActionError(errorPrefix)
      }
    },
    []
  )

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header title="Project Details" backHref="/" backLabel="Back to Dashboard" />
        <div className="container mx-auto px-4 py-6">
          <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-48 bg-muted rounded" />
              <div className="h-48 bg-muted rounded" />
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (error || !project) {
    return (
      <main className="min-h-screen bg-background">
        <Header title="Project Details" backHref="/" backLabel="Back to Dashboard" />
        <div className="container mx-auto px-4 py-6 text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
          <p className="text-muted-foreground">{error || "The requested project could not be found."}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <Header title="Project Details" backHref="/" backLabel="Back to Dashboard" />
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <StatusBadge status={project.status} showIcon showLabel />
            </div>
            {project.description && (
              <p className="text-lg text-muted-foreground">{project.description}</p>
            )}
          </div>
          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleAction(() => dataProvider.openInFinder(project.path), "Failed to open in Finder")}>
                Finder
              </Button>
              <Button onClick={() => handleAction(() => dataProvider.openInTerminal(project.path), "Failed to open Terminal")}>
                Terminal
              </Button>
              <Button onClick={() => handleAction(() => dataProvider.openInVSCode(project.path), "Failed to open VS Code")}>
                VS Code
              </Button>
              {project.gitRemoteUrl && (
                <Button onClick={() => handleAction(() => dataProvider.openInBrowser(project.gitRemoteUrl!), "Failed to open browser")}>
                  GitHub
                </Button>
              )}
            </div>
            {actionError && <p className="text-sm text-destructive">{actionError}</p>}
          </div>
        </div>

        <Separator />

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Info</CardTitle>
              <CardDescription>Basic project metadata</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Path</dt>
                <dd className="mt-1 text-sm font-mono bg-muted px-2 py-1 rounded break-all">{project.path}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Last Modified</dt>
                <dd className="mt-1 text-sm">
                  {formatDate(project.lastModified)}
                  <span className="text-muted-foreground ml-2">({formatRelativeTime(project.lastModified)})</span>
                </dd>
              </div>
              <div className="flex gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">package.json</dt>
                  <dd className="mt-1 text-sm">{project.hasPackageJson ? "Present" : "Not found"}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">README</dt>
                  <dd className="mt-1 text-sm">{project.hasReadme ? "Present" : "Not found"}</dd>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Git Information</CardTitle>
              <CardDescription>Repository status and history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {project.gitInfo ? (
                <>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Branch</dt>
                    <dd className="mt-1 text-sm font-mono">{project.gitInfo.branch}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Working Directory</dt>
                    <dd className="mt-1 text-sm">
                      {project.gitInfo.isDirty
                        ? `${project.gitInfo.uncommittedChanges} uncommitted changes`
                        : "Clean"}
                    </dd>
                  </div>
                  {project.gitInfo.lastCommitMessage && (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Last Commit</dt>
                      <dd className="mt-1 text-sm">
                        <p className="font-medium line-clamp-2">{project.gitInfo.lastCommitMessage}</p>
                        {project.gitInfo.lastCommitDate && (
                          <p className="text-muted-foreground text-xs mt-1">
                            {formatRelativeTime(project.gitInfo.lastCommitDate)}
                          </p>
                        )}
                      </dd>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center py-6 text-muted-foreground text-sm">Not a Git repository</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* README */}
        {project.readmeContent && (
          <Card>
            <CardHeader>
              <CardTitle>README</CardTitle>
              <CardDescription>Project documentation</CardDescription>
            </CardHeader>
            <CardContent>
              <MarkdownRenderer content={project.readmeContent} />
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
