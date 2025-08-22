"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  const isDark = theme === "dark"

  return (
    <button
      onClick={toggleTheme}
      className="relative w-12 sm:w-32 h-12 rounded-full transition-all duration-300 ease-in-out flex items-center overflow-hidden"
      style={{
        backgroundColor: isDark ? '#2d3748' : '#f3f4f6',
      }}
    >
      {/* Sliding toggle */}
      <div 
        className={`absolute w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out shadow-sm ${
          isDark ? 'right-2 bg-black' : 'left-2 bg-white'
        }`}
      >
        {isDark ? (
          <Moon size={20} style={{ color: '#2ad4fc' }} />
        ) : (
          <Sun size={20} className="text-purple-400" />
        )}
      </div>
      
      {/* Text labels - positioned on opposite side from toggle, hidden on mobile */}
      <div className={`hidden sm:flex w-full text-sm transition-all duration-300 ${
        isDark ? 'justify-start pl-2' : 'justify-end pr-2'
      }`}>
        <span className={`transition-opacity duration-300 whitespace-nowrap theme-toggle-text ${isDark ? 'opacity-100' : 'opacity-0'}`} style={{ color: isDark ? 'white' : '#1a202c' }}>
          Dark Mode
        </span>
        <span className={`transition-opacity duration-300 whitespace-nowrap ${isDark ? 'opacity-0' : 'opacity-100'}`} style={{ color: isDark ? '#f7fafc' : '#1a202c' }}>
          Light Mode
        </span>
      </div>
    </button>
  )
}
