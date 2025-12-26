-- Add payment_terms and delivery_time to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS payment_terms TEXT,
ADD COLUMN IF NOT EXISTS delivery_time TEXT;

-- Verify columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'payment_terms') THEN
        ALTER TABLE public.quotes ADD COLUMN payment_terms TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'delivery_time') THEN
        ALTER TABLE public.quotes ADD COLUMN delivery_time TEXT;
    END IF;
END $$;
