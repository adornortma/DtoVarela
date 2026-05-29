-- Migration to add Utilizacion KPI column
ALTER TABLE public.metricas ADD COLUMN IF NOT EXISTS utilizacion numeric;
ALTER TABLE public.metricas_celula ADD COLUMN IF NOT EXISTS utilizacion numeric;
ALTER TABLE public.metricas_mensuales ADD COLUMN IF NOT EXISTS utilizacion numeric;
ALTER TABLE public.indicadores_distrito ADD COLUMN IF NOT EXISTS utilizacion numeric;
