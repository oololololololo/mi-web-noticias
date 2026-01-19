import React from 'react'
import { Search } from 'lucide-react'

export function NewsSearch({ value, onChange, placeholder = "Buscar en noticias..." }) {
    return (
        <div className="news-search">
            <Search size={18} className="news-search__icon" />
            <input
                type="text"
                className="news-search__input"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label="Buscar noticias"
            />
        </div>
    )
}
