# Guía de Despliegue en Hostinger (AlfaQuote)

Esta guía te ayudará a desplegar tu aplicación en Hostinger y corregir los problemas de base de datos.

## Parte 1: Corregir la Base de Datos (Supabase)

Para solucionar el problema de "no se pueden cargar productos", debes crear las tablas que faltan.

1.  Ve a tu proyecto en [Supabase](https://app.supabase.com).
2.  Entra a **SQL Editor**.
3.  Crea una nueva consulta (New Query).
4.  Copia y pega el contenido del archivo `SUPABASE_FIX.sql` (ubicado en la raíz de tu proyecto).
5.  Haz clic en **Run**.

Esto creará las tablas `products`, `profiles`, `organizations` y `organization_settings`, y configurará los permisos necesarios.

## Parte 2: Despliegue en Hostinger

Tienes dos opciones para desplegar: como **Sitio Estático** (más fácil) o con **Node.js** (si necesitas el servidor).

### Opción A: Sitio Estático (Recomendada para empezar)

1.  **Construir la app**:
    Abre la terminal en tu proyecto y ejecuta:
    ```bash
    npm run build
    ```
    Esto creará una carpeta `dist`.

2.  **Subir archivos**:
    - Entra al File Manager de Hostinger.
    - Ve a `public_html`.
    - Sube **el contenido** de la carpeta `dist` (los archivos dentro, no la carpeta en sí).

3.  **Configurar Fallback**:
    - Crea un archivo llamado `.htaccess` en `public_html` con este contenido:
      ```apache
      RewriteEngine On
      RewriteCond %{REQUEST_FILENAME} -f [OR]
      RewriteCond %{REQUEST_FILENAME} -d
      RewriteRule ^ - [L]
      RewriteRule ^ index.html [L]
      ```

### Opción B: Servidor Node.js (Si quieres usar el endpoint creado)

1.  **Preparar archivos**:
    - Copia el contenido de `dist` (generado con `npm run build`) dentro de la carpeta `server/public` (créala si no existe).
    - Ahora tienes una carpeta `server` que contiene tu código de backend y tu frontend compilado en `public`.

2.  **Configurar en Hostinger**:
    - Ve a **Node.js** en tu panel de Hostinger.
    - Crea una nueva aplicación.
    - Sube el contenido de la carpeta `server` a la ruta indicada.
    - Instala las dependencias (`npm install` desde el panel o terminal SSH).
    - Asegúrate de que el archivo de entrada sea `index.js`.

## Parte 3: Variables de Entorno

Para que la app funcione en producción, asegúrate de que `src/lib/supabase.js` tenga las credenciales correctas.
Si usas la Opción A, edita el archivo antes de hacer el build:

```javascript
const supabaseUrl = 'https://tu-proyecto.supabase.co';
const supabaseAnonKey = 'tu-clave-anonima';
```
