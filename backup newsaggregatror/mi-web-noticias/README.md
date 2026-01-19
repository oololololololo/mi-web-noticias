# NewsAgg 📰

Tu agregador de noticias personalizado con IA.

![NewsAgg Screenshot](docs/screenshot.png)

## ✨ Features

- 📰 **Agrega múltiples fuentes RSS** en colecciones personalizadas
- 🤖 **Genera posts para redes sociales** con IA (GPT-3.5)
- 🔍 **Búsqueda en tiempo real** dentro de tus noticias
- ⚡ **Carga ultra-rápida** con cache inteligente
- 📱 **PWA instalable** en móviles y desktop
- 🌙 **Modo oscuro** por defecto
- ♿ **Accesible** con navegación por teclado

## 🚀 Deploy Rápido

### Opción 1: Docker Compose (Recomendado)

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/newsagg.git
cd newsagg

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus keys

# 3. Levantar servicios
docker-compose up -d

# 4. Abrir http://localhost
```

### Opción 2: Desarrollo Local

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (otra terminal)
cd frontend
npm install
npm run dev
```

## 📦 Estructura del Proyecto

```
newsagg/
├── backend/
│   ├── main.py           # API FastAPI
│   ├── requirements.txt  # Dependencias Python
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── hooks/        # Custom hooks
│   │   └── App.jsx       # Componente principal
│   ├── public/
│   │   ├── manifest.json # PWA manifest
│   │   └── sw.js         # Service Worker
│   ├── nginx.conf        # Config para producción
│   └── Dockerfile
├── docker-compose.yml
└── .env.example
```

## ⚙️ Variables de Entorno

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `OPENAI_API_KEY` | API key de OpenAI | Sí (para IA) |
| `SUPABASE_URL` | URL del proyecto Supabase | Sí |
| `SUPABASE_KEY` | Key anónima de Supabase | Sí |
| `ALLOWED_ORIGINS` | Dominios para CORS | No (default: localhost) |
| `ADMIN_EMAILS` | Emails con bypass premium | No |

## 🔧 API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/stream-noticias` | POST | Stream de noticias |
| `/generar-post` | POST | Generar post con IA |
| `/recomendar-fuentes` | POST | Buscar fuentes nuevas |

## 📱 PWA

La app es instalable como PWA:
1. Abre la app en Chrome/Edge
2. Click en el icono de instalar (➕) en la barra de direcciones
3. ¡Listo! Tendrás la app en tu home screen

## 🧪 Testing

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm run test
```

## 📄 Licencia

MIT License - Usa libremente.

---

Hecho con ❤️ y ☕
