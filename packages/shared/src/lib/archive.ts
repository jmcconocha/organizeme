/**
 * Archive Management Module
 *
 * This module provides utility functions for managing archived projects
 * using browser localStorage. Archived projects are stored as a Set of project IDs
 * for efficient O(1) lookup operations.
 */

/**
 * LocalStorage key for storing archived project IDs.
 */
const ARCHIVED_STORAGE_KEY = 'organize-me-archived'

/**
 * Retrieves the set of archived project IDs from localStorage.
 *
 * This function safely handles:
 * - Missing localStorage (SSR environments)
 * - Invalid/corrupted localStorage data
 * - Empty archived list
 *
 * @returns Set of project IDs that have been marked as archived
 *
 * @example
 * ```ts
 * const archived = getArchivedProjects()
 * console.log(`User has ${archived.size} archived projects`)
 * ```
 */
export function getArchivedProjects(): Set<string> {
  // Handle SSR/environments without localStorage
  if (typeof window === 'undefined' || !window.localStorage) {
    return new Set()
  }

  try {
    const stored = localStorage.getItem(ARCHIVED_STORAGE_KEY)
    if (!stored) {
      return new Set()
    }

    // Parse stored JSON array and convert to Set
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed)) {
      return new Set(parsed)
    }

    // Handle invalid data format
    return new Set()
  } catch (error) {
    // Handle JSON parse errors or other issues
    console.error('Failed to load archived projects from localStorage:', error)
    return new Set()
  }
}

/**
 * Saves the archived Set to localStorage.
 *
 * @param archived - Set of project IDs to persist
 */
function saveArchived(archived: Set<string>): void {
  // Handle SSR/environments without localStorage
  if (typeof window === 'undefined' || !window.localStorage) {
    return
  }

  try {
    // Convert Set to Array for JSON serialization
    const array = Array.from(archived)
    localStorage.setItem(ARCHIVED_STORAGE_KEY, JSON.stringify(array))
  } catch (error) {
    // Handle storage quota errors or other issues
    console.error('Failed to save archived projects to localStorage:', error)
  }
}

/**
 * Toggles the archived status of a project.
 *
 * If the project is currently archived, it will be unarchived.
 * If the project is not archived, it will be archived.
 *
 * @param projectId - The ID of the project to toggle
 * @returns The updated Set of archived project IDs
 *
 * @example
 * ```ts
 * // Archive a project
 * const archived = toggleArchive('my-old-project')
 *
 * // Click again to unarchive
 * const updated = toggleArchive('my-old-project')
 * ```
 */
export function toggleArchive(projectId: string): Set<string> {
  const archived = getArchivedProjects()

  if (archived.has(projectId)) {
    archived.delete(projectId)
  } else {
    archived.add(projectId)
  }

  saveArchived(archived)
  return archived
}

/**
 * Checks if a project is marked as archived.
 *
 * This is a convenience function that provides O(1) lookup
 * to determine archived status.
 *
 * @param projectId - The ID of the project to check
 * @returns true if the project is archived, false otherwise
 *
 * @example
 * ```ts
 * if (isArchived('my-project')) {
 *   console.log('This project is archived!')
 * }
 * ```
 */
export function isArchived(projectId: string): boolean {
  const archived = getArchivedProjects()
  return archived.has(projectId)
}
