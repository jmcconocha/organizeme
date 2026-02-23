"use client"

import { ProjectTagsSection } from "@organizeme/ui/components/project-tags-section"
import { useDataProvider } from "@organizeme/shared/context/data-provider-context"
import { useNavigation } from "@organizeme/shared/context/navigation-context"

export function ProjectTagsWrapper({ projectId, currentTags, availableTags }: {
  projectId: string
  currentTags: string[]
  availableTags: string[]
}) {
  const dataProvider = useDataProvider()
  const { refresh } = useNavigation()
  return (
    <ProjectTagsSection
      projectId={projectId}
      currentTags={currentTags}
      availableTags={availableTags}
      onAddTag={async (pid, tag) => {
        const result = await dataProvider.addProjectTag(pid, tag)
        return { success: result.success, tags: result.tags }
      }}
      onRemoveTag={async (pid, tag) => {
        const result = await dataProvider.removeProjectTag(pid, tag)
        return { success: result.success, tags: result.tags }
      }}
      onRefresh={() => refresh()}
    />
  )
}
