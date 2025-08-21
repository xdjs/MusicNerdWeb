"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

type ThemeProviderProps = {
  children: React.ReactNode
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  resetToSystem: () => void
}

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
  resetToSystem: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

// Function to get system theme preference
const getSystemTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return "light"
}

// Function to get session-based theme (always system preference for new sessions)
const getSessionTheme = (storageKey: string): Theme => {
  if (typeof window !== 'undefined') {
    // Check if user has manually set a preference (persists across sessions)
    const stored = localStorage?.getItem(storageKey) as Theme
    if (stored && (stored === "light" || stored === "dark")) {
      return stored
    }
    
    // Check if this is a new session by looking for a session marker
    const sessionMarker = sessionStorage.getItem(`${storageKey}-session`)
    if (!sessionMarker) {
      // This is a new session, use system preference
      const systemTheme = getSystemTheme()
      // Mark this session
      sessionStorage.setItem(`${storageKey}-session`, 'active')
      return systemTheme
    }
    
    // Fall back to system preference
    return getSystemTheme()
  }
  return "light"
}

export function ThemeProvider({
  children,
  storageKey = "musicnerd-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    return getSessionTheme(storageKey)
  })

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      // Only update if no manual preference is set (user hasn't explicitly chosen a theme)
      const stored = localStorage?.getItem(storageKey) as Theme
      if (!stored || !(stored === "light" || stored === "dark")) {
        setTheme(getSystemTheme())
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [storageKey])

  // Listen for session storage changes (when session ends)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `${storageKey}-session` && e.newValue === null) {
        // Session ended, check if we should use system preference or user preference
        const stored = localStorage?.getItem(storageKey) as Theme
        if (stored && (stored === "light" || stored === "dark")) {
          // User has a preference, use it
          setTheme(stored)
        } else {
          // No user preference, use system preference
          setTheme(getSystemTheme())
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [storageKey])

  // Clean up session marker when page is unloaded or hidden
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleBeforeUnload = () => {
      sessionStorage.removeItem(`${storageKey}-session`)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is hidden (tab closed, minimized, etc.)
        sessionStorage.removeItem(`${storageKey}-session`)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [storageKey])

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
  }, [theme])

  const resetToSystem = () => {
    const systemTheme = getSystemTheme()
    setTheme(systemTheme)
    // Clear any stored preference to allow system preference to take over
    localStorage?.removeItem(storageKey)
  }

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage?.setItem(storageKey, theme)
      setTheme(theme)
    },
    resetToSystem,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
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
