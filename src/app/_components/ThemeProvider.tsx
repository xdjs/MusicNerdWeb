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

// Function to get system theme preference
const getSystemTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  }
  return "light"
}

export function ThemeProvider({
  children,
  defaultTheme,
  storageKey = "musicnerd-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Only access localStorage on client side
    if (typeof window !== 'undefined') {
      // Check localStorage first
      const stored = localStorage?.getItem(storageKey) as Theme
      if (stored && (stored === "light" || stored === "dark")) {
        return stored
      }
      // If no stored preference, use system preference
      return getSystemTheme()
    }
    // Default to light theme on server side
    return "light"
  })

  useEffect(() => {
    const root = window.document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(theme)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      // Only access localStorage on client side
      if (typeof window !== 'undefined') {
        localStorage?.setItem(storageKey, theme)
      }
      setTheme(theme)
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
