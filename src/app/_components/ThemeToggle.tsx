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
      className="relative w-32 h-8 rounded-full transition-all duration-300 ease-in-out flex items-center overflow-hidden"
      style={{
        backgroundColor: isDark ? '#2ad4fc' : '#ef95ff',
      }}
    >
      {/* Sliding white toggle */}
      <div 
        className={`absolute w-6 h-6 rounded-full bg-white flex items-center justify-center transition-all duration-300 ease-in-out shadow-sm ${
          isDark ? 'translate-x-[calc(100%-24px)]' : 'translate-x-1'
        }`}
      >
        {isDark ? (
          <Moon size={14} className="text-blue-400" />
        ) : (
          <Sun size={14} className="text-purple-400" />
        )}
      </div>
      
      {/* Text labels - positioned with proper spacing */}
      <div className="flex w-full text-[11px] font-medium text-white px-2">
        <span className={`transition-opacity duration-300 whitespace-nowrap flex-1 text-center ${isDark ? 'opacity-100' : 'opacity-0'}`}>
          Dark Mode
        </span>
        <span className={`transition-opacity duration-300 whitespace-nowrap flex-1 text-center ${isDark ? 'opacity-0' : 'opacity-100'}`}>
          Light Mode
        </span>
      </div>
    </button>
  )
}
