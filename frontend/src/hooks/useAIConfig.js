import { useState, useEffect } from 'react'

const DEFAULT_CONFIG = {
    idioma: 'Español',
    estilo: 'Formal',
    longitud: 'Medio'
}

const STORAGE_KEY = 'news_ai_config_v1'

export function useAIConfig() {
    const [config, setConfig] = useState(DEFAULT_CONFIG)

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) })
            } catch (e) {
                console.error("Error parsing AI config", e)
            }
        }
    }, [])

    const updateConfig = (key, value) => {
        setConfig(prev => {
            const newConfig = { ...prev, [key]: value }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig))
            return newConfig
        })
    }

    return { config, updateConfig }
}
