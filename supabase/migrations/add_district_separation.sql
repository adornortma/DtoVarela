-- Migration to add district separation

-- 1. Create distritos table
CREATE TABLE IF NOT EXISTS public.distritos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    slug text UNIQUE NOT NULL,
    nombre text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Insert Varela and Lanús districts
INSERT INTO public.distritos (slug, nombre) VALUES 
('varela', 'Florencio Varela'),
('lanus', 'Lanús')
ON CONFLICT (slug) DO NOTHING;

-- 2. Create celulas table
CREATE TABLE IF NOT EXISTS public.celulas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    distrito_id uuid NOT NULL REFERENCES public.distritos(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE (nombre, distrito_id)
);

-- Populate Varela cells
DO $$
DECLARE
    varela_id uuid;
BEGIN
    SELECT id INTO varela_id FROM public.distritos WHERE slug = 'varela';
    IF varela_id IS NOT NULL THEN
        INSERT INTO public.celulas (nombre, distrito_id) VALUES
        ('BERAZATEGUI', varela_id),
        ('BERNAL', varela_id),
        ('QUILMES', varela_id),
        ('RANELAGH', varela_id),
        ('VARELA 1', varela_id),
        ('VARELA 2', varela_id)
        ON CONFLICT (nombre, distrito_id) DO NOTHING;
    END IF;
END $$;

-- 3. Add distrito_id to existing tables
ALTER TABLE public.tecnicos ADD COLUMN IF NOT EXISTS distrito_id uuid REFERENCES public.distritos(id);
ALTER TABLE public.metricas ADD COLUMN IF NOT EXISTS distrito_id uuid REFERENCES public.distritos(id);
ALTER TABLE public.metricas_celula ADD COLUMN IF NOT EXISTS distrito_id uuid REFERENCES public.distritos(id);
ALTER TABLE public.metricas_mensuales ADD COLUMN IF NOT EXISTS distrito_id uuid REFERENCES public.distritos(id);
ALTER TABLE public.indicadores_distrito ADD COLUMN IF NOT EXISTS distrito_id uuid REFERENCES public.distritos(id);
ALTER TABLE public.actuaciones ADD COLUMN IF NOT EXISTS distrito_id uuid REFERENCES public.distritos(id);

-- 4. Associate existing records with Varela
DO $$
DECLARE
    varela_id uuid;
BEGIN
    SELECT id INTO varela_id FROM public.distritos WHERE slug = 'varela';
    IF varela_id IS NOT NULL THEN
        UPDATE public.tecnicos SET distrito_id = varela_id WHERE distrito_id IS NULL;
        UPDATE public.metricas SET distrito_id = varela_id WHERE distrito_id IS NULL;
        UPDATE public.metricas_celula SET distrito_id = varela_id WHERE distrito_id IS NULL;
        UPDATE public.metricas_mensuales SET distrito_id = varela_id WHERE distrito_id IS NULL;
        UPDATE public.indicadores_distrito SET distrito_id = varela_id WHERE distrito_id IS NULL;
        UPDATE public.actuaciones SET distrito_id = varela_id WHERE distrito_id IS NULL;
    END IF;
END $$;

-- 5. Enforce NOT NULL constraints where applicable
ALTER TABLE public.tecnicos ALTER COLUMN distrito_id SET NOT NULL;
ALTER TABLE public.metricas ALTER COLUMN distrito_id SET NOT NULL;
ALTER TABLE public.metricas_celula ALTER COLUMN distrito_id SET NOT NULL;
ALTER TABLE public.metricas_mensuales ALTER COLUMN distrito_id SET NOT NULL;
ALTER TABLE public.indicadores_distrito ALTER COLUMN distrito_id SET NOT NULL;
ALTER TABLE public.actuaciones ALTER COLUMN distrito_id SET NOT NULL;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tecnicos_distrito ON public.tecnicos(distrito_id);
CREATE INDEX IF NOT EXISTS idx_metricas_distrito ON public.metricas(distrito_id);
CREATE INDEX IF NOT EXISTS idx_metricas_celula_distrito ON public.metricas_celula(distrito_id);
CREATE INDEX IF NOT EXISTS idx_metricas_mensuales_distrito ON public.metricas_mensuales(distrito_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_distrito_distrito ON public.indicadores_distrito(distrito_id);
CREATE INDEX IF NOT EXISTS idx_actuaciones_distrito ON public.actuaciones(distrito_id);
