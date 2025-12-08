import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react"

type Theme = "light" | "dark" | "system"

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function resolveTheme(theme: Theme) {
  if (theme !== "system") return theme
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
  return prefersDark ? "dark" : "light"
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const body = document.body
  const resolvedTheme = resolveTheme(theme)

  const isDark = resolvedTheme === "dark"
  root.classList.toggle("dark", isDark)
  body.classList.toggle("dark", isDark)

  root.dataset.theme = resolvedTheme
  root.style.colorScheme = resolvedTheme
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)

  // Apply immediately on mount to avoid visible flashes
  useLayoutEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null
    const initialTheme =
      storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
        ? storedTheme
        : defaultTheme

    setThemeState(initialTheme)
    applyTheme(initialTheme)

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      const nextTheme =
        (localStorage.getItem("theme") as Theme | null) ?? initialTheme
      if (nextTheme === "system") {
        applyTheme("system")
      }
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [defaultTheme])

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme)
    localStorage.setItem("theme", nextTheme)
    applyTheme(nextTheme)
  }

  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
