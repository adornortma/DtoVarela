-- Migration to add Tiempo Operativo KPI and OCR upload logs

-- 1. Add column to metricas
ALTER TABLE public.metricas ADD COLUMN IF NOT EXISTS tiempo_operativo numeric;

-- 2. Add column to metricas_celula
ALTER TABLE public.metricas_celula ADD COLUMN IF NOT EXISTS tiempo_operativo numeric;

-- 3. Add column to metricas_mensuales
ALTER TABLE public.metricas_mensuales ADD COLUMN IF NOT EXISTS tiempo_operativo numeric;

-- 4. Add column to indicadores_distrito
ALTER TABLE public.indicadores_distrito ADD COLUMN IF NOT EXISTS tiempo_operativo numeric;

-- 5. Add cell operability flag
ALTER TABLE public.celulas ADD COLUMN IF NOT EXISTS operativa boolean DEFAULT true;

-- 6. Create OCR Cargas logging table
CREATE TABLE IF NOT EXISTS public.ocr_cargas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    distrito_id uuid REFERENCES public.distritos(id) ON DELETE SET NULL,
    celula text, -- NULL if Resumen Distrito
    mes smallint NOT NULL, -- 1 to 12
    anio smallint NOT NULL,
    imagen_url text, -- Supabase storage URL/path
    ocr_raw text, -- Raw text output of Tesseract.js
    datos_interpretados jsonb, -- Parsed JSON rows and metrics
    ocr_confidence numeric, -- Average confidence score (0 to 100)
    uploaded_by text,
    uploaded_at timestamptz DEFAULT now(),
    replaced_previous boolean DEFAULT false,
    processing_status text CHECK (processing_status IN ('pending', 'processed', 'error', 'confirmed'))
);

-- Indexing for lookup speed
CREATE INDEX IF NOT EXISTS idx_ocr_cargas_distrito ON public.ocr_cargas(distrito_id);
