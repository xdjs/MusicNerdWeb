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
      className="relative w-28 h-8 rounded-full transition-all duration-300 ease-in-out flex items-center overflow-hidden"
      style={{
        backgroundColor: theme === "dark" ? '#2ad4fc' : '#ef95ff',
      }}
    >
      {/* Sliding white circle with icon */}
      <div 
        className={`absolute w-6 h-6 rounded-full bg-white flex items-center justify-center transition-all duration-300 ease-in-out shadow-sm ${
          theme === "dark" ? 'translate-x-[calc(100%-24px)]' : 'translate-x-1'
        }`}
      >
        {theme === "dark" ? (
          <Moon className="h-3 w-3 text-gray-800" />
        ) : (
          <Sun className="h-3 w-3 text-gray-800" />
        )}
      </div>
      
      {/* Text labels - positioned with proper spacing */}
      <div className="flex w-full text-[11px] font-medium text-white px-2">
        <span className={`transition-opacity duration-300 whitespace-nowrap flex-1 text-center ${theme === "dark" ? 'opacity-100' : 'opacity-0'}`}>
          Dark
        </span>
        <span className={`transition-opacity duration-300 whitespace-nowrap flex-1 text-center ${theme === "dark" ? 'opacity-0' : 'opacity-100'}`}>
          Light
        </span>
      </div>
    </button>
  )
}
