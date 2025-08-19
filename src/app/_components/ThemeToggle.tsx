"use client"

import { Moon, Sun } from "lucide-react"
import { useState } from "react"

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative w-24 h-8 rounded-full transition-all duration-300 ease-in-out flex items-center"
      style={{
        backgroundColor: isDarkMode ? '#2ad4fc' : '#a855f7',
      }}
    >
      {/* Sliding white circle with icon */}
      <div 
        className={`absolute w-6 h-6 rounded-full bg-white flex items-center justify-center transition-all duration-300 ease-in-out shadow-sm ${
          isDarkMode ? 'translate-x-16' : 'translate-x-1'
        }`}
      >
        {isDarkMode ? (
          <Moon className="h-3 w-3 text-gray-800" />
        ) : (
          <Sun className="h-3 w-3 text-gray-800" />
        )}
      </div>
      
      {/* Text labels */}
      <div className="flex justify-between w-full px-2 text-xs font-medium text-white">
        <span className={`transition-opacity duration-300 ${isDarkMode ? 'opacity-0' : 'opacity-100'}`}>
          Light
        </span>
        <span className={`transition-opacity duration-300 ${isDarkMode ? 'opacity-100' : 'opacity-0'}`}>
          Dark
        </span>
      </div>
    </button>
  )
}
