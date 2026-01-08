# Configurar Google OAuth en Supabase - Guía Rápida

## 🎯 Objetivo
Habilitar el inicio de sesión con Google en tu aplicación AlfaQuote.

## 🚀 Opción Rápida (Recomendada para empezar)

### Paso 1: Ir a Authentication Providers

Abre este enlace en tu navegador:

```
https://app.supabase.com/project/fwtzsszcltcxxmgkoepq/auth/providers
```

### Paso 2: Habilitar Google

1. Busca **"Google"** en la lista de providers
2. Haz clic en el **toggle/switch** para habilitarlo
3. Haz clic en **"Save"** o **"Guardar"**

> [!TIP]
> Supabase proporciona credenciales de desarrollo automáticamente para localhost.
> No necesitas configurar nada más para empezar a probar.

### Paso 3: Probar el Login

1. Abre la aplicación: `http://localhost:5173/`
2. Haz clic en **"Iniciar sesión con Google"**
3. Selecciona tu cuenta de Google
4. Autoriza la aplicación

¡Listo! Deberías estar dentro de la aplicación.

---

## 🔧 Opción Avanzada (Para producción)

Si quieres usar tus propias credenciales de Google (necesario para producción):

### 1. Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Nombre sugerido: "AlfaQuote"

### 2. Habilitar Google+ API

1. En el menú lateral, ve a **"APIs y servicios"** → **"Biblioteca"**
2. Busca **"Google+ API"**
3. Haz clic en **"Habilitar"**

### 3. Configurar Pantalla de Consentimiento

1. Ve a **"APIs y servicios"** → **"Pantalla de consentimiento de OAuth"**
2. Selecciona **"Externo"** (o "Interno" si tienes Google Workspace)
3. Completa:
   - **Nombre de la aplicación:** AlfaQuote
   - **Correo de asistencia:** tu-email@gmail.com
   - **Logotipo:** (opcional)
   - **Correo del desarrollador:** tu-email@gmail.com
4. Haz clic en **"Guardar y continuar"**
5. En "Permisos", haz clic en **"Guardar y continuar"** (no necesitas agregar permisos adicionales)
6. En "Usuarios de prueba", agrega tu email si es necesario
7. Haz clic en **"Guardar y continuar"**

### 4. Crear Credenciales OAuth

1. Ve a **"APIs y servicios"** → **"Credenciales"**
2. Haz clic en **"+ CREAR CREDENCIALES"** → **"ID de cliente de OAuth 2.0"**
3. Configura:
   - **Tipo de aplicación:** Aplicación web
   - **Nombre:** AlfaQuote Web Client
   
4. **Orígenes de JavaScript autorizados:**
   ```
   http://localhost:5173
   https://fwtzsszcltcxxmgkoepq.supabase.co
   ```
   
5. **URIs de redireccionamiento autorizados:**
   ```
   https://fwtzsszcltcxxmgkoepq.supabase.co/auth/v1/callback
   ```

6. Haz clic en **"Crear"**

### 5. Copiar Credenciales

Verás un modal con:
- **ID de cliente:** algo como `123456789-abc...xyz.apps.googleusercontent.com`
- **Secreto del cliente:** algo como `GOCSPX-abc...xyz`

**¡Copia ambos!**

### 6. Configurar en Supabase

1. Ve a: `https://app.supabase.com/project/fwtzsszcltcxxmgkoepq/auth/providers`
2. Busca **Google** y haz clic para expandir
3. Pega:
   - **Client ID** (ID de cliente)
   - **Client Secret** (Secreto del cliente)
4. Asegúrate de que esté **habilitado** (toggle en verde)
5. Haz clic en **"Save"**

---

## ✅ Verificación

Después de configurar Google OAuth:

1. Abre `http://localhost:5173/`
2. Deberías ver la página de login
3. Haz clic en "Iniciar sesión con Google"
4. Se abrirá una ventana de Google
5. Selecciona tu cuenta
6. Autoriza la aplicación
7. Deberías ser redirigido al dashboard

## 🐛 Problemas Comunes

### "Error 400: redirect_uri_mismatch"
- Verifica que la URI de redirección en Google Cloud sea exactamente:
  `https://fwtzsszcltcxxmgkoepq.supabase.co/auth/v1/callback`

### "Error: Invalid login credentials"
- Verifica que Google OAuth esté habilitado en Supabase
- Asegúrate de que el toggle esté en verde

### "La ventana de Google no se abre"
- Verifica que no haya bloqueadores de pop-ups
- Intenta en modo incógnito

---

## 📝 Siguiente Paso

Una vez que puedas iniciar sesión:

1. Verifica tu User ID ejecutando en Supabase SQL Editor:
   ```sql
   SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;
   ```

2. Ejecuta el script [`INITIAL_SETUP.sql`](file:///Users/gonzalo/proyectos/carpeta%20sin%20título/Cotizaciones/INITIAL_SETUP.sql) reemplazando:
   - `NOMBRE_DE_TU_EMPRESA` → Nombre de tu empresa
   - `TU_USER_ID_AQUI` → El ID que obtuviste arriba
   - `ORGANIZATION_ID_AQUI` → El ID de organización que se genere

3. Recarga la aplicación y ¡listo!

---

**Recomendación:** Empieza con la **Opción Rápida** para probar. Luego configura tus propias credenciales cuando vayas a producción.
