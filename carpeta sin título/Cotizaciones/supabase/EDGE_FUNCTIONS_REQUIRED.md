# Edge Functions Required - Supabase Setup

Este documento lista las Edge Functions que deben crearse en Supabase para manejar las operaciones seguras con APIs externas.

## ⚠️ IMPORTANTE: Seguridad

Todas las API keys (Gemini, Pipedrive) se almacenan ENCRIPTADAS en `organization_settings` y solo son accesibles por las Edge Functions con `service_role` key. **Nunca se exponen al frontend.**

---

## 1. generate-kaizen-insights

**Ruta:** `supabase/functions/generate-kaizen-insights/index.ts`

**Propósito:** Generar insights Kaizen usando Gemini AI

**Input:**
```typescript
{
  userId: string;
  period: 'weekly' | 'monthly';
}
```

**Proceso:**
1. Obtener métricas del vendedor usando `analyticsService`
2. Obtener benchmarks del equipo
3. Obtener Gemini API key de `organization_settings` (encriptada)
4. Llamar a Gemini API con prompt personalizado
5. Parsear respuesta y crear insights en tabla `insights`
6. Retornar insights generados

**Output:**
```typescript
{
  insights: Insight[];
  report?: string; // Para monthly
}
```

---

## 2. generate-admin-report

**Ruta:** `supabase/functions/generate-admin-report/index.ts`

**Propósito:** Generar reporte personalizado para admin

**Input:**
```typescript
{
  userId: string;
  startDate: string;
  endDate: string;
  focusAreas: string[];
}
```

**Proceso:**
1. Verificar que quien llama es admin (RLS)
2. Calcular métricas detalladas del periodo
3. Obtener Gemini API key (encriptada)
4. Generar reporte con Gemini
5. Retornar reporte formateado

**Output:**
```typescript
{
  report: {
    summary: string;
    metrics: object;
    recommendations: string[];
    strengths: string[];
    improvements: string[];
  }
}
```

---

## 3. pipedrive-test-connection

**Ruta:** `supabase/functions/pipedrive-test-connection/index.ts`

**Propósito:** Probar conectividad con Pipedrive API

**Input:**
```typescript
{
  organizationId: string;
}
```

**Proceso:**
1. Obtener Pipedrive API token de `organization_settings` (encriptado)
2. Hacer GET a `https://{domain}.pipedrive.com/api/v1/users/me`
3. Retornar resultado de conexión

**Output:**
```typescript
{
  connected: boolean;
  user?: {
    name: string;
    email: string;
    id: number;
  };
  error?: string;
}
```

---

## 4. pipedrive-sync-quote

**Ruta:** `supabase/functions/pipedrive-sync-quote/index.ts`

**Propósito:** Sincronizar cotización como Deal en Pipedrive

**Input:**
```typescript
{
  quoteId: string;
  sellerEmail: string;
}
```

**Proceso:**
1. Obtener cotización de BD
2. Obtener Pipedrive API token (encriptado)
3. Buscar vendedor en Pipedrive por email → obtener `user_id`
4. Buscar/crear Person (cliente) en Pipedrive
5. Crear Deal en Pipedrive asignado al vendedor
6. Actualizar quote con `pipedrive_deal_id` y `pipedrive_person_id`
7. Registrar en `pipedrive_sync_log`

**Output:**
```typescript
{
  personId: number;
  dealId: number;
  message: string;
}
```

---

## 5. pipedrive-import-contacts

**Ruta:** `supabase/functions/pipedrive-import-contacts/index.ts`

**Propósito:** Importar contactos desde Pipedrive

**Input:**
```typescript
{
  organizationId: string;
  limit?: number;
}
```

**Proceso:**
1. Obtener Pipedrive API token (encriptado)
2. GET `/api/v1/persons?limit={limit}`
3. Transformar formato Pipedrive → AlfaQuote
4. Retornar lista de contactos

**Output:**
```typescript
{
  contacts: Array<{
    name: string;
    email: string;
    phone?: string;
    pipedriveId: number;
  }>;
  count: number;
}
```

---

## 6. pipedrive-retry-sync

**Ruta:** `supabase/functions/pipedrive-retry-sync/index.ts`

**Propósito:** Reintentar sincronización fallida

**Input:**
```typescript
{
  logId: string;
  entityId: string;
}
```

**Proceso:**
1. Obtener item del sync log
2. Reintentar operación según tipo
3. Actualizar log con resultado

---

## Ejemplo de Edge Function Template

```typescript
// supabase/functions/generate-kaizen-insights/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, period } = await req.json()
    
    // Crear cliente Supabase con service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    
    // Obtener organización del usuario
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', userId)
      .single()
    
    // Obtener Gemini API key (encriptada en BD, desencriptada aquí)
    const { data: settings } = await supabaseAdmin
      .from('organization_settings')
      .select('gemini_api_key')
      .eq('organization_id', profile.organization_id)
      .single()
    
    if (!settings?.gemini_api_key) {
      throw new Error('Gemini API key not configured')
    }
    
    // TODO: Calcular métricas del vendedor
    // TODO: Obtener benchmarks del equipo
    // TODO: Llamar a Gemini API
    // TODO: Crear insights en tabla
    
    const insights = [] // Insights generados
    
    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
```

---

## Deployment

Para cada Edge Function:

```bash
# Crear función
supabase functions new function-name

# Editar archivo index.ts

# Deploy
supabase functions deploy function-name

# Verificar
supabase functions list
```

---

## Variables de Entorno

Las Edge Functions necesitan acceso a:
- `SUPABASE_URL`: URL del proyecto
- `SUPABASE_SERVICE_ROLE_KEY`: Key con privilegios completos
- (Opcionales): Otras configuraciones

Estas se configuran automáticamente en Supabase.

---

## Testing

```bash
# Test local
supabase functions serve function-name

# Test con curl
curl -X POST http://localhost:54321/functions/v1/function-name \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId":"xxx","period":"weekly"}'
```

---

## Seguridad

✅ API keys nunca expuestas al frontend  
✅ Solo Edge Functions acceden a `service_role`  
✅ RLS policies protegen datos sensibles  
✅ Tokens encriptados en base de datos  
✅ Validación de permisos en cada función  

**NUNCA** envíes API keys al frontend ni las incluyas en el código cliente.
