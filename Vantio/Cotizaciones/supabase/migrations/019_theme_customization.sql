-- Add theme customization support to organization settings
-- Migration: 019_theme_customization

ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS theme_colors JSONB DEFAULT '{
  "primary": "#F97316",
  "secondary": "#0891B2",
  "accent": "#8B5CF6",
  "success": "#10B981",
  "warning": "#F59E0B",
  "error": "#EF4444",
  "info": "#3B82F6",
  "background": "#F9FAFB",
  "surface": "#FFFFFF",
  "border": "#E5E7EB",
  "textPrimary": "#111827",
  "textSecondary": "#6B7280",
  "textMuted": "#9CA3AF"
}'::jsonb;

COMMENT ON COLUMN organization_settings.theme_colors IS 'Custom theme colors for the organization';
