-- Add sales terms templates to organization settings
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS sales_terms_templates JSONB DEFAULT '{
  "santiago": {
    "name": "Santiago (Región Metropolitana)",
    "terms": "Condiciones de Venta - Santiago:\n\n1. Validez de la Oferta: 30 días desde la fecha de emisión\n2. Forma de Pago: 50% anticipo, 50% contra entrega\n3. Tiempo de Entrega: 15-20 días hábiles\n4. Garantía: 12 meses contra defectos de fabricación\n5. Instalación: No incluida en el precio\n6. Transporte: Incluido dentro de Santiago\n7. Impuestos: IVA no incluido\n\nEstas condiciones pueden variar según el proyecto específico."
  },
  "regiones": {
    "name": "Regiones (Fuera de RM)",
    "terms": "Condiciones de Venta - Regiones:\n\n1. Validez de la Oferta: 30 días desde la fecha de emisión\n2. Forma de Pago: 50% anticipo, 50% contra entrega\n3. Tiempo de Entrega: 20-30 días hábiles (incluye transporte)\n4. Garantía: 12 meses contra defectos de fabricación\n5. Instalación: No incluida en el precio\n6. Transporte: Costo adicional según región de destino\n7. Impuestos: IVA no incluido\n\nEstas condiciones pueden variar según el proyecto específico y la región de destino."
  }
}'::jsonb;
