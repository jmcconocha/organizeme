'use client'

/**
 * Project Tags Section Component
 *
 * Client component that manages project tags on the detail page.
 * Handles tag addition/removal and integrates with server actions.
 */

import { useState, useTransition } from "react"
import { TagInput } from "./tag-input"
import { addProjectTag, removeProjectTag } from "@/lib/actions"
import { useRouter } from "next/navigation"

export interface ProjectTagsSectionProps {
  /** The unique identifier of the project */
  projectId: string
  /** Current tags for the project */
  currentTags: string[]
  /** All available tags across all projects for autocomplete */
  availableTags: string[]
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
 * import { ProjectTagsSection } from '@/components/project-tags-section'
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
}: ProjectTagsSectionProps) {
  const [tags, setTags] = useState<string[]>(currentTags)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  /**
   * Handles tag changes from the TagInput component.
   * Determines if a tag was added or removed and calls the appropriate server action.
   */
  const handleTagsChange = (newTags: string[]) => {
    // Optimistically update the UI
    setTags(newTags)

    // Determine if a tag was added or removed
    const addedTags = newTags.filter(tag => !tags.includes(tag))
    const removedTags = tags.filter(tag => !newTags.includes(tag))

    // Call server actions
    startTransition(async () => {
      try {
        // Add new tags
        for (const tag of addedTags) {
          const result = await addProjectTag(projectId, tag)
          if (!result.success) {
            // Revert on error
            setTags(tags)
            return
          }
        }

        // Remove deleted tags
        for (const tag of removedTags) {
          const result = await removeProjectTag(projectId, tag)
          if (!result.success) {
            // Revert on error
            setTags(tags)
            return
          }
        }

        // Refresh the page data
        router.refresh()
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
