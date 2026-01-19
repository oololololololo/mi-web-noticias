import { useState, useEffect, createContext, useContext } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        // Recuperar del localStorage o usar preferencia del sistema
        const saved = localStorage.getItem('newsagg-theme')
        if (saved) return saved
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    })

    useEffect(() => {
        // Aplicar clase al body
        document.body.classList.remove('theme-light', 'theme-dark')
        document.body.classList.add(`theme-${theme}`)

        // Guardar preferencia
        localStorage.setItem('newsagg-theme', theme)

        // Actualizar meta theme-color
        const metaTheme = document.querySelector('meta[name="theme-color"]')
        if (metaTheme) {
            metaTheme.content = theme === 'dark' ? '#050505' : '#f5f5f5'
        }
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark')
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider')
    }
    return context
}
