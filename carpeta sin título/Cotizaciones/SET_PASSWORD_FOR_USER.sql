-- ============================================
-- ESTABLECER CONTRASEÑA PARA USUARIO EXISTENTE
-- ============================================
-- Este script permite establecer una contraseña para el usuario
-- gsanchez@alfapack.cl para que pueda iniciar sesión con email/password
-- ============================================

-- IMPORTANTE: Reemplaza 'TU_CONTRASEÑA_AQUI' con la contraseña que desees

-- Opción 1: Usando la función de Supabase (RECOMENDADO)
-- Ejecuta esto en el SQL Editor de Supabase:

SELECT auth.users.id, auth.users.email
FROM auth.users
WHERE email = 'gsanchez@alfapack.cl';

-- Si el usuario existe, anota su ID y luego ve a:
-- Authentication → Users → Busca el usuario → Click en los 3 puntos → "Reset Password"
-- O usa la API de Supabase para enviar un email de reset

-- ============================================
-- Opción 2: Crear un nuevo usuario con contraseña (SI NO EXISTE)
-- ============================================
-- NOTA: Solo ejecuta esto si el usuario NO existe en auth.users

-- Primero verifica si existe:
SELECT id, email FROM auth.users WHERE email = 'gsanchez@alfapack.cl';

-- Si NO existe, puedes crearlo manualmente en:
-- Supabase Dashboard → Authentication → Users → "Add user"
-- Email: gsanchez@alfapack.cl
-- Password: [tu contraseña]
-- Auto Confirm User: YES

-- ============================================
-- Opción 3: Usar la API de Supabase desde la aplicación
-- ============================================
-- Agrega esto temporalmente en tu aplicación para crear el usuario:

/*
const { data, error } = await supabase.auth.admin.createUser({
  email: 'gsanchez@alfapack.cl',
  password: 'TU_CONTRASEÑA_AQUI',
  email_confirm: true,
  user_metadata: {
    full_name: 'Gonzalo Sanchez'
  }
});
*/
