'use client'

/**
 * Project Tags Section Component
 *
 * Client component that manages project tags on the detail page.
 * Handles tag addition/removal and integrates with server actions.
 */

import { useState, useTransition } from "react"
import { TagInput } from "./tag-input"

export interface ProjectTagsSectionProps {
  /** The unique identifier of the project */
  projectId: string
  /** Current tags for the project */
  currentTags: string[]
  /** All available tags across all projects for autocomplete */
  availableTags: string[]
  /** Callback to add a tag to a project */
  onAddTag: (projectId: string, tag: string) => Promise<{ success: boolean; tags?: string[] }>
  /** Callback to remove a tag from a project */
  onRemoveTag: (projectId: string, tag: string) => Promise<{ success: boolean; tags?: string[] }>
  /** Optional callback to refresh page data */
  onRefresh?: () => void
}

/**
 * Client component for managing project tags.
 *
 * Features:
 * - Display current tags
 * - Add new tags via input
 * - Remove existing tags
 * - Autocomplete from existing tags
 * - Optimistic updates with loading states
 *
 * @example
 * ```tsx
 * // In a server component
 * import { ProjectTagsSection } from '@organizeme/ui/components/project-tags-section'
 *
 * export default async function Page() {
 *   const project = await getProject('my-project')
 *   const allTags = await getAllTags()
 *
 *   return (
 *     <ProjectTagsSection
 *       projectId={project.id}
 *       currentTags={project.tags}
 *       availableTags={allTags}
 *     />
 *   )
 * }
 * ```
 */
export function ProjectTagsSection({
  projectId,
  currentTags,
  availableTags,
  onAddTag,
  onRemoveTag,
  onRefresh,
}: ProjectTagsSectionProps) {
  const [tags, setTags] = useState<string[]>(currentTags)
  const [isPending, startTransition] = useTransition()

  /**
   * Handles tag changes from the TagInput component.
   * Determines if a tag was added or removed and calls the appropriate callback.
   */
  const handleTagsChange = (newTags: string[]) => {
    // Optimistically update the UI
    setTags(newTags)

    // Determine if a tag was added or removed
    const addedTags = newTags.filter(tag => !tags.includes(tag))
    const removedTags = tags.filter(tag => !newTags.includes(tag))

    // Call tag mutation callbacks
    startTransition(async () => {
      try {
        // Add new tags
        for (const tag of addedTags) {
          const result = await onAddTag(projectId, tag)
          if (!result.success) {
            // Revert on error
            setTags(tags)
            return
          }
        }

        // Remove deleted tags
        for (const tag of removedTags) {
          const result = await onRemoveTag(projectId, tag)
          if (!result.success) {
            // Revert on error
            setTags(tags)
            return
          }
        }

        // Refresh the page data
        onRefresh?.()
      } catch {
        // Revert on error
        setTags(tags)
      }
    })
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground">Tags</h2>
      <TagInput
        value={tags}
        onChange={handleTagsChange}
        availableTags={availableTags}
        placeholder="Add tags..."
        disabled={isPending}
      />
    </div>
  )
}
