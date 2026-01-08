# Configuración de Resend para Envío de Emails

## Paso 1: Crear Cuenta en Resend

1. Ve a [resend.com](https://resend.com)
2. Haz clic en "Sign Up"
3. Regístrate con tu email o GitHub
4. Verifica tu email

## Paso 2: Obtener API Key

1. Una vez dentro, ve a **API Keys** en el menú lateral
2. Haz clic en **"Create API Key"**
3. Dale un nombre: `AlfaQuote Production`
4. Selecciona permisos: **"Sending access"**
5. Haz clic en **"Create"**
6. **IMPORTANTE**: Copia la API key (comienza con `re_...`)
   - Solo se muestra una vez
   - Guárdala en un lugar seguro

## Paso 3: Configurar Dominio (Opcional pero Recomendado)

### Para Emails Profesionales

1. Ve a **Domains** en Resend
2. Haz clic en **"Add Domain"**
3. Ingresa tu dominio: `tudominio.com`
4. Sigue las instrucciones para agregar registros DNS:
   - SPF
   - DKIM
   - DMARC
5. Espera verificación (puede tomar hasta 48 horas)

### Sin Dominio Propio

Puedes usar el dominio de prueba de Resend:
- `onboarding@resend.dev`
- Límite: 100 emails/día
- Solo para testing

## Paso 4: Configurar Supabase Edge Function

### Instalar Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Verificar instalación
supabase --version
```

### Iniciar Supabase en el Proyecto

```bash
cd /ruta/a/tu/proyecto
supabase init
```

### Configurar Secrets

```bash
# Agregar API key de Resend como secret
supabase secrets set RESEND_API_KEY=re_tu_api_key_aqui
```

### Desplegar Edge Function

```bash
# Desplegar la función
supabase functions deploy send-quote-email

# Verificar que esté desplegada
supabase functions list
```

## Paso 5: Actualizar Código (Si usas dominio propio)

Edita `supabase/functions/send-quote-email/index.ts`:

```typescript
// Línea 67 - Cambiar de:
from: 'AlfaQuote <onboarding@resend.dev>',

// A:
from: 'AlfaQuote <noreply@tudominio.com>',
```

Luego redespliega:
```bash
supabase functions deploy send-quote-email
```

## Paso 6: Probar el Envío

1. Ejecuta la aplicación: `npm run dev`
2. Crea una nueva cotización
3. Marca "Enviar cotización por email al cliente"
4. Haz clic en "Enviar al Cliente"
5. Verifica que el email llegue

## Verificación

### En Resend Dashboard

1. Ve a **Logs** en Resend
2. Deberías ver el email enviado
3. Verifica el estado: "Delivered"

### En tu Email

1. Revisa la bandeja de entrada del cliente
2. Verifica que el diseño se vea correcto
3. Haz clic en el botón "Ver Cotización Completa"
4. Verifica que el micrositio funcione

## Troubleshooting

### Error: "Email service not configured"
- Verifica que `RESEND_API_KEY` esté configurado en Supabase
- Ejecuta: `supabase secrets list`

### Error: "Failed to send email"
- Verifica que la API key sea válida
- Revisa los logs: `supabase functions logs send-quote-email`
- Verifica límites de Resend (100/día en plan gratuito)

### Email no llega
- Revisa spam/correo no deseado
- Verifica que el email del cliente sea válido
- Revisa logs en Resend Dashboard

### Error: "Invalid domain"
- Si usas dominio propio, verifica que esté verificado
- Usa `onboarding@resend.dev` para testing

## Límites del Plan Gratuito

- **100 emails/día**
- **3,000 emails/mes**
- Solo 1 dominio verificado

Para más emails, considera el plan Pro ($20/mes):
- 50,000 emails/mes
- Dominios ilimitados
- Soporte prioritario

## Comandos Útiles

```bash
# Ver logs de la función
supabase functions logs send-quote-email

# Ver secrets configurados
supabase secrets list

# Actualizar secret
supabase secrets set RESEND_API_KEY=nueva_key

# Eliminar secret
supabase secrets unset RESEND_API_KEY

# Redesplegar función
supabase functions deploy send-quote-email
```

## Recursos

- [Documentación de Resend](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Resend API Reference](https://resend.com/docs/api-reference/emails/send-email)
