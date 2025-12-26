# 📦 Guía de Instalación para Producción

Esta guía te permitirá instalar y configurar el Sistema de Cotizaciones Profesionales desde cero.

## 📋 Requisitos Previos

- Cuenta de GitHub
- Cuenta de Supabase (gratuita)
- Cuenta de Vercel (gratuita)
- Node.js 18+ instalado (solo para desarrollo local)

---

## 🚀 Paso 1: Crear Proyecto en Supabase

### 1.1 Crear Cuenta y Proyecto

1. Ve a https://supabase.com
2. Haz clic en **"Start your project"**
3. Inicia sesión con GitHub
4. Haz clic en **"New Project"**
5. Completa los datos:
   - **Name**: `cotizaciones-prod`
   - **Database Password**: Genera una contraseña segura (guárdala)
   - **Region**: Selecciona la más cercana
6. Haz clic en **"Create new project"**
7. Espera 2-3 minutos

### 1.2 Obtener Credenciales

1. Ve a **Settings** → **API**
2. Copia y guarda:
   - **Project URL**: `https://tu-proyecto.supabase.co`
   - **anon public key**: `eyJhbGci...`

---

## 🗄️ Paso 2: Configurar Base de Datos

### 2.1 Ejecutar Migraciones

1. Ve a **SQL Editor** en Supabase
2. Ejecuta las migraciones **EN ORDEN**:

**Migración 1**: `000_complete_init.sql`
**Migración 2**: `003_multi_role_system.sql`
**Migración 3**: `011_multi_org_support.sql`
**Migración 4**: `015_add_missing_org_settings_columns.sql`
**Migración 5**: `016_first_user_auto_superadmin_saas.sql` ⭐ IMPORTANTE

### 2.2 Verificar

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```

---

## 🌐 Paso 3: Desplegar en Vercel

### 3.1 Preparar Repositorio

```bash
git clone https://github.com/TU-USUARIO/cotizaciones.git
cd cotizaciones
npm install
```

### 3.2 Configurar Variables

Crea `.env`:
```
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### 3.3 Desplegar

1. Ve a https://vercel.com
2. **"Add New Project"**
3. Selecciona tu repositorio
4. Configura variables de entorno
5. **"Deploy"**

---

## 👤 Paso 4: Crear Primer Usuario

1. Ve a tu app: `https://tu-app.vercel.app`
2. Haz clic en **"Crear Cuenta"**
3. Ingresa email y contraseña
4. Confirma tu email

> **El primer usuario será automáticamente Super Admin**

### 4.2 Configurar Organización

1. Ve a **Settings**
2. Cambia nombre de organización
3. Sube logo y favicon
4. Configura Gemini AI Key (opcional)

---

## 👥 Paso 5: Invitar Usuarios

1. Ve a **Usuarios**
2. **"Invitar Usuario"**
3. Ingresa email y rol
4. Envía el link de invitación

---

## ✅ Verificación Final

- [ ] Puedes iniciar sesión
- [ ] Apareces como Super Admin
- [ ] Puedes crear productos
- [ ] Puedes crear cotizaciones
- [ ] Puedes invitar usuarios

---

## 🆘 Solución de Problemas

### Error: "Organization ID: No disponible"

```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
```

### Gemini AI no funciona

1. Verifica API Key válida
2. Límite: 1400 requests/día
3. Espera hasta mañana si excediste

---

¡Listo! Tu aplicación está instalada. 🎉
