"use client"

import { createContext, Suspense, useCallback, useContext, useEffect, useState } from "react"

import ThemeRouteSync from "./ThemeRouteSync"

type Theme = "light" | "dark"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme,
  storageKey = "musicnerd-theme",
  ...props
}: ThemeProviderProps) {
  // Keep the server and first client render identical. The head script already
  // applies the saved theme before paint; this effect only synchronizes React.
  const [theme, setTheme] = useState<Theme>(defaultTheme ?? "light")

  const applyTheme = useCallback((nextTheme: Theme) => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(nextTheme)
    root.style.colorScheme = nextTheme
  }, [])

  const resolvedStorageKey = () => document.documentElement.dataset.profilePreviewTheme === "true" ? "musicnerd-profile-preview-theme" : storageKey

  const syncTheme = useCallback((concept?: boolean) => {
    const root = document.documentElement
    const preview = concept === undefined
      ? root.dataset.profilePreviewTheme === "true"
      : root.dataset.profilePreviewDeployment === "true" && concept
    root.dataset.profilePreviewTheme = preview ? "true" : "false"
    let stored: string | null = null
    try {
      stored = localStorage.getItem(preview ? "musicnerd-profile-preview-theme" : storageKey)
    } catch {
      // Storage can be disabled; system preference still works.
    }
    const resolved = stored === "light" || stored === "dark"
      ? stored
      : (preview ? "light" : defaultTheme) ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    applyTheme(resolved)
    setTheme(resolved)
  }, [defaultTheme, storageKey, applyTheme])

  useEffect(() => { syncTheme() }, [syncTheme])

  const value = {
    theme,
    setTheme: (nextTheme: Theme) => {
      try {
        localStorage.setItem(resolvedStorageKey(), nextTheme)
      } catch {
        // Keep toggling functional even when the preference cannot be persisted.
      }
      applyTheme(nextTheme)
      setTheme(nextTheme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      <Suspense fallback={null}><ThemeRouteSync onRouteChange={syncTheme} /></Suspense>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
