# Guía Rápida: Crear Tablas en Supabase

## 🎯 Objetivo
Crear todas las tablas necesarias en tu base de datos de Supabase para que la aplicación AlfaQuote funcione.

## 📍 Paso a Paso

### 1️⃣ Abre el SQL Editor de Supabase

Haz clic en este enlace para ir directamente al SQL Editor:

**https://app.supabase.com/project/fwtzsszcltcxxmgkoepq/sql**

### 2️⃣ Abre el archivo SQL en tu computadora

Navega a esta ubicación en tu Mac:

```
/Users/gonzalo/proyectos/carpeta sin título/Cotizaciones/NUEVA_DB_SETUP.sql
```

O ábrelo desde VS Code (ya lo tienes en tu proyecto).

### 3️⃣ Copia TODO el contenido

- Selecciona todo: `Cmd + A`
- Copia: `Cmd + C`

### 4️⃣ Pega en Supabase

- Haz clic en el área de texto del SQL Editor en Supabase
- Pega: `Cmd + V`

### 5️⃣ Ejecuta el script

- Haz clic en el botón **"Run"** (esquina inferior derecha)
- Espera 10-30 segundos

### 6️⃣ Verifica el resultado

Deberías ver un mensaje:
```
status: "Base de datos configurada exitosamente!"
```

### 7️⃣ Confirma las tablas creadas

Ve a **Table Editor** en el menú lateral y verifica que aparezcan estas 8 tablas:

- ✅ organizations
- ✅ profiles
- ✅ products
- ✅ quotes
- ✅ invitations
- ✅ organization_settings
- ✅ ai_insights
- ✅ sales_notes

## ❓ ¿Necesitas ayuda?

Si encuentras algún error, copia el mensaje de error completo y compártelo conmigo.

---

**Archivo a ejecutar:** `NUEVA_DB_SETUP.sql` (541 líneas)
