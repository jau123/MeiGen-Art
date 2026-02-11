/**
 * User preferences persistence
 * Storage: ~/.config/meigen/preferences.json
 *
 * Completely independent from config.ts (which handles provider credentials).
 * All functions are safe — read errors return defaults, write errors are silently ignored.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

// ── Types ──────────────────────────────────────────────────────

export interface UserPreferences {
  version: number
  defaults: {
    style?: string
    aspectRatio?: string
    model?: string
    provider?: string
  }
  styleNotes: string
  favorites: FavoriteEntry[]
  recentSuccessful: RecentEntry[]
}

export interface FavoriteEntry {
  prompt: string
  model?: string
  aspectRatio?: string
  savedAt: string
}

export interface RecentEntry {
  prompt: string
  provider: string
  model?: string
  aspectRatio?: string
  generatedAt: string
}

// ── Constants ──────────────────────────────────────────────────

const MAX_FAVORITES = 20
const MAX_RECENT = 10

function prefsPath(): string {
  return join(homedir(), '.config', 'meigen', 'preferences.json')
}

function emptyPreferences(): UserPreferences {
  return {
    version: 1,
    defaults: {},
    styleNotes: '',
    favorites: [],
    recentSuccessful: [],
  }
}

// ── Read / Write ───────────────────────────────────────────────

export function loadPreferences(): UserPreferences {
  try {
    const raw = readFileSync(prefsPath(), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<UserPreferences>
    // Merge with defaults to ensure all fields exist
    return {
      ...emptyPreferences(),
      ...parsed,
      defaults: { ...emptyPreferences().defaults, ...parsed.defaults },
    }
  } catch {
    return emptyPreferences()
  }
}

export function savePreferences(prefs: UserPreferences): void {
  const filePath = prefsPath()
  mkdirSync(join(homedir(), '.config', 'meigen'), { recursive: true })
  writeFileSync(filePath, JSON.stringify(prefs, null, 2) + '\n')
}

// ── Mutations (used by the tool) ───────────────────────────────

export function updateDefaults(
  updates: Partial<UserPreferences['defaults']>,
  styleNotes?: string,
): UserPreferences {
  const prefs = loadPreferences()
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      (prefs.defaults as Record<string, string | undefined>)[key] = value || undefined
    }
  }
  if (styleNotes !== undefined) {
    prefs.styleNotes = styleNotes
  }
  savePreferences(prefs)
  return prefs
}

export function addFavorite(entry: Omit<FavoriteEntry, 'savedAt'>): UserPreferences {
  const prefs = loadPreferences()
  prefs.favorites.unshift({
    ...entry,
    savedAt: new Date().toISOString(),
  })
  if (prefs.favorites.length > MAX_FAVORITES) {
    prefs.favorites = prefs.favorites.slice(0, MAX_FAVORITES)
  }
  savePreferences(prefs)
  return prefs
}

export function removeFavorite(index: number): UserPreferences {
  const prefs = loadPreferences()
  if (index >= 0 && index < prefs.favorites.length) {
    prefs.favorites.splice(index, 1)
  }
  savePreferences(prefs)
  return prefs
}

// ── Auto-save (fire-and-forget, called from generate-image.ts) ─

export function addRecentGeneration(entry: {
  prompt: string
  provider: string
  model?: string
  aspectRatio?: string
}): void {
  try {
    const prefs = loadPreferences()
    prefs.recentSuccessful.unshift({
      ...entry,
      generatedAt: new Date().toISOString(),
    })
    if (prefs.recentSuccessful.length > MAX_RECENT) {
      prefs.recentSuccessful = prefs.recentSuccessful.slice(0, MAX_RECENT)
    }
    savePreferences(prefs)
  } catch {
    // Never fail — this is a background enhancement
  }
}
