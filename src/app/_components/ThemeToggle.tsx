"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative w-24 h-8 rounded-full transition-all duration-300 ease-in-out flex items-center"
      style={{
        backgroundColor: theme === "dark" ? '#2ad4fc' : '#ef95ff',
      }}
    >
      {/* Sliding white circle with icon */}
      <div 
        className={`absolute w-6 h-6 rounded-full bg-white flex items-center justify-center transition-all duration-300 ease-in-out shadow-sm ${
          theme === "dark" ? 'translate-x-16' : 'translate-x-1'
        }`}
      >
        {theme === "dark" ? (
          <Moon className="h-3 w-3 text-gray-800" />
        ) : (
          <Sun className="h-3 w-3 text-gray-800" />
        )}
      </div>
      
      {/* Text label - positioned to avoid icon overlap */}
      <div className="flex w-full px-2 text-[10px] font-medium text-white">
        <span className={`transition-opacity duration-300 ${theme === "dark" ? 'opacity-100 text-left' : 'opacity-0'}`}>
          Dark Mode
        </span>
        <span className={`transition-opacity duration-300 ${theme === "dark" ? 'opacity-0' : 'opacity-100 text-right'}`}>
          Light Mode
        </span>
      </div>
    </button>
  )
}
