/**
 * Tag Storage Module
 *
 * This module provides persistent storage for project tags using a JSON file.
 * Tags are stored in the user's home directory at ~/.organizeme/project-tags.json
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { homedir } from 'os'

/**
 * Path to the organizeMe configuration directory.
 */
const CONFIG_DIR = join(homedir(), '.organizeme')

/**
 * Path to the project tags JSON file.
 */
const TAGS_FILE = join(CONFIG_DIR, 'project-tags.json')

/**
 * Structure for storing project tags.
 * Maps project IDs to their array of tags.
 */
export interface ProjectTagsData {
  [projectId: string]: string[]
}

/**
 * Ensures the configuration directory exists.
 * Creates it if necessary.
 *
 * @returns Promise that resolves when directory is confirmed to exist
 */
async function ensureConfigDirectory(): Promise<void> {
  try {
    await mkdir(CONFIG_DIR, { recursive: true })
  } catch (error) {
    // Ignore errors - directory might already exist
    // mkdir with recursive: true doesn't throw if directory exists
  }
}

/**
 * Loads all project tags from the storage file.
 *
 * @returns Promise resolving to ProjectTagsData object
 *
 * @example
 * ```ts
 * const tags = await loadProjectTags()
 * console.log(tags['my-project']) // ['work', 'frontend']
 * ```
 */
export async function loadProjectTags(): Promise<ProjectTagsData> {
  try {
    const content = await readFile(TAGS_FILE, 'utf-8')
    return JSON.parse(content) as ProjectTagsData
  } catch (error) {
    // If file doesn't exist or is invalid, return empty object
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {}
    }

    // Log other errors but still return empty object to prevent crashes
    console.error('Error loading project tags:', error)
    return {}
  }
}

/**
 * Saves tags for a specific project to the storage file.
 *
 * This function loads all existing tags, updates the specified project's tags,
 * and writes the updated data back to the file.
 *
 * @param projectId - The unique identifier of the project
 * @param tags - Array of tag strings to save for the project
 * @returns Promise that resolves when tags are saved
 *
 * @example
 * ```ts
 * await saveProjectTags('my-project', ['work', 'frontend', 'react'])
 * ```
 */
export async function saveProjectTags(
  projectId: string,
  tags: string[]
): Promise<void> {
  try {
    // Ensure config directory exists
    await ensureConfigDirectory()

    // Load existing tags
    const allTags = await loadProjectTags()

    // Update tags for this project
    if (tags.length === 0) {
      // Remove project entry if no tags
      delete allTags[projectId]
    } else {
      allTags[projectId] = tags
    }

    // Write updated tags back to file
    await writeFile(TAGS_FILE, JSON.stringify(allTags, null, 2), 'utf-8')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to save tags for project ${projectId}: ${errorMessage}`)
  }
}

/**
 * Retrieves tags for a specific project.
 *
 * @param projectId - The unique identifier of the project
 * @returns Promise resolving to array of tags, or empty array if no tags exist
 *
 * @example
 * ```ts
 * const tags = await getProjectTags('my-project')
 * console.log(tags) // ['work', 'frontend']
 * ```
 */
export async function getProjectTags(projectId: string): Promise<string[]> {
  const allTags = await loadProjectTags()
  return allTags[projectId] || []
}

/**
 * Gets all unique tags across all projects.
 *
 * @returns Promise resolving to array of unique tag strings
 *
 * @example
 * ```ts
 * const allTags = await getAllTags()
 * console.log(allTags) // ['work', 'personal', 'frontend', 'backend']
 * ```
 */
export async function getAllTags(): Promise<string[]> {
  const allTags = await loadProjectTags()

  // Collect all tags from all projects
  const tagSet = new Set<string>()

  for (const tags of Object.values(allTags)) {
    for (const tag of tags) {
      tagSet.add(tag)
    }
  }

  // Return sorted array of unique tags
  return Array.from(tagSet).sort()
}

/**
 * Adds a single tag to a project.
 * If the tag already exists for the project, it won't be duplicated.
 *
 * @param projectId - The unique identifier of the project
 * @param tag - The tag string to add
 * @returns Promise that resolves when tag is added
 *
 * @example
 * ```ts
 * await addTagToProject('my-project', 'urgent')
 * ```
 */
export async function addTagToProject(
  projectId: string,
  tag: string
): Promise<void> {
  const currentTags = await getProjectTags(projectId)

  // Only add if tag doesn't already exist
  if (!currentTags.includes(tag)) {
    await saveProjectTags(projectId, [...currentTags, tag])
  }
}

/**
 * Removes a single tag from a project.
 *
 * @param projectId - The unique identifier of the project
 * @param tag - The tag string to remove
 * @returns Promise that resolves when tag is removed
 *
 * @example
 * ```ts
 * await removeTagFromProject('my-project', 'urgent')
 * ```
 */
export async function removeTagFromProject(
  projectId: string,
  tag: string
): Promise<void> {
  const currentTags = await getProjectTags(projectId)
  const updatedTags = currentTags.filter(t => t !== tag)

  await saveProjectTags(projectId, updatedTags)
}
