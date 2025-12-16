import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'


window.addEventListener('error', (event) => {
  document.body.innerHTML = `<div style="color:red; font-size: 20px; padding: 20px; background: white;">
    <h1>Algo salió mal (Global Error)</h1>
    <pre>${event.error?.stack || event.message}</pre>
  </div>`;
});

window.addEventListener('unhandledrejection', (event) => {
  document.body.innerHTML = `<div style="color:red; font-size: 20px; padding: 20px; background: white;">
    <h1>Promesa Rechazada</h1>
    <pre>${event.reason?.stack || event.reason}</pre>
  </div>`;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
