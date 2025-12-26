# AlfaQuote v2.0 - Plataforma de Cotizaciones Profesionales

![AlfaQuote](https://img.shields.io/badge/version-2.0-orange) ![React](https://img.shields.io/badge/React-19.2-blue) ![Supabase](https://img.shields.io/badge/Supabase-Integrated-green)

Sistema profesional de cotizaciones con autenticación Google OAuth, micrositios interactivos para clientes y sincronización en tiempo real.

## ✨ Características

- 🔐 **Autenticación con Google OAuth** - Login seguro y rápido
- 📊 **Dashboard Interactivo** - Visualiza todas tus cotizaciones
- ⚡ **Live Builder** - Crea cotizaciones con vista previa en tiempo real
- 🌐 **Micrositios para Clientes** - Links únicos para que clientes acepten/rechacen
- 📄 **Exportación a PDF** - Descarga cotizaciones profesionales
- 🔄 **Sincronización en Tiempo Real** - Cambios instantáneos entre dispositivos
- 💾 **Persistencia en la Nube** - Datos seguros en Supabase PostgreSQL

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 20.19+ o 22.12+
- Cuenta de Supabase (gratis)
- Cuenta de Google Cloud (para OAuth)

### Instalación

1. **Clonar e instalar dependencias**
```bash
npm install
```

2. **Configurar Supabase**

Sigue la guía detallada en [QUICK_START.md](./QUICK_START.md) o:

- Crea un proyecto en [app.supabase.com](https://app.supabase.com)
- Ejecuta el script SQL (ver [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
- Configura Google OAuth
- Copia tus credenciales

3. **Crear archivo `.env`**
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

4. **Ejecutar**
```bash
npm run dev
```

Visita `http://localhost:5173/login` 🎉

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── ProtectedRoute.jsx    # Guard para rutas autenticadas
│   └── Sidebar.jsx            # Navegación con perfil de usuario
├── context/
│   ├── AuthContext.jsx        # Gestión de autenticación
│   └── QuoteContext.jsx       # Gestión de cotizaciones (Supabase)
├── layouts/
│   └── MainLayout.jsx         # Layout principal con sidebar
├── lib/
│   └── supabase.js            # Cliente de Supabase
├── pages/
│   ├── Dashboard.jsx          # Panel principal
│   ├── Login.jsx              # Página de login con Google
│   ├── Microsite.jsx          # Vista pública para clientes
│   ├── QuoteBuilder.jsx       # Constructor de cotizaciones
│   └── QuotesList.jsx         # Lista de cotizaciones
├── utils/
│   └── pdfGenerator.js        # Generador de PDFs
└── App.jsx                    # Configuración de rutas
```

## 🎨 Paleta de Colores

- **Petrol**: `#0A4D4E` - Color principal
- **Orange**: `#FF6B35` - Acentos y CTAs
- **Beige**: `#F7F3E9` - Fondos
- **White**: `#FFFFFF` - Paneles

## 🔧 Tecnologías

- **Frontend**: React 19.2 + Vite
- **Estilos**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Autenticación**: Google OAuth 2.0
- **PDF**: jsPDF + jsPDF-AutoTable
- **Routing**: React Router DOM 7
- **Icons**: Lucide React

## 📖 Documentación

- [QUICK_START.md](./QUICK_START.md) - Guía rápida de configuración (5 min)
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Configuración detallada de Supabase
- [walkthrough.md](./.gemini/antigravity/brain/*/walkthrough.md) - Documentación completa de cambios

## 🔐 Seguridad

- Row Level Security (RLS) habilitado en Supabase
- Políticas de acceso por usuario
- Variables de entorno protegidas
- Micrositios públicos con políticas específicas

## 🚢 Despliegue

### Build de Producción
```bash
npm run build
```

### Desplegar en Vercel
```bash
vercel --prod
```

**Importante**: Configura las variables de entorno en tu plataforma de hosting.

## 📝 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Build de producción
- `npm run preview` - Preview del build
- `npm run lint` - Linter de código

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado y confidencial.

## 🆘 Soporte

Si encuentras problemas:

1. Revisa [QUICK_START.md](./QUICK_START.md)
2. Verifica la consola del navegador
3. Revisa los logs de Supabase
4. Contacta al equipo de desarrollo

---

**Desarrollado con ❤️ para acelerar tus ventas**
