-- Migration to add assignment fields to activities
ALTER TABLE public.actividades ADD COLUMN IF NOT EXISTS tecnico_asignado text;
ALTER TABLE public.actividades ADD COLUMN IF NOT EXISTS fecha_asignacion timestamptz;
