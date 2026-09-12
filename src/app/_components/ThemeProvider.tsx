"use client"

import { createContext, useContext, useEffect, useState } from "react"

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

  const applyTheme = (nextTheme: Theme) => {
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(nextTheme)
    root.style.colorScheme = nextTheme
  }

  useEffect(() => {
    let stored: string | null = null
    try {
      stored = localStorage.getItem(storageKey)
    } catch {
      // Storage can be disabled; system preference still works.
    }
    const resolved = stored === "light" || stored === "dark"
      ? stored
      : defaultTheme ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    applyTheme(resolved)
    setTheme(resolved)
  }, [defaultTheme, storageKey])

  const value = {
    theme,
    setTheme: (nextTheme: Theme) => {
      try {
        localStorage.setItem(storageKey, nextTheme)
      } catch {
        // Keep toggling functional even when the preference cannot be persisted.
      }
      applyTheme(nextTheme)
      setTheme(nextTheme)
    },
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
