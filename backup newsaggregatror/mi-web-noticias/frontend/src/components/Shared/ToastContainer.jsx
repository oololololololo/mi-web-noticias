import React from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'

const iconMap = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
}

export function ToastContainer({ toasts, onRemove }) {
    if (toasts.length === 0) return null

    return (
        <div className="toast-container">
            {toasts.map(toast => {
                const Icon = iconMap[toast.type] || Info
                return (
                    <div
                        key={toast.id}
                        className={`toast toast--${toast.type}`}
                        role="alert"
                    >
                        <Icon size={18} className="toast__icon" />
                        <span className="toast__message">{toast.message}</span>
                        <button
                            className="toast__close"
                            onClick={() => onRemove(toast.id)}
                            aria-label="Cerrar notificación"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
