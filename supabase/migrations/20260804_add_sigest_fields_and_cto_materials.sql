-- Add new fields to sigests table
ALTER TABLE public.sigests ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'balanceado';
ALTER TABLE public.sigests ADD COLUMN IF NOT EXISTS material_requerido integer DEFAULT 0;
ALTER TABLE public.sigests ADD COLUMN IF NOT EXISTS material_entregado integer DEFAULT 0;

-- Add check constraint for tipo
ALTER TABLE public.sigests DROP CONSTRAINT IF EXISTS check_sigest_tipo;
ALTER TABLE public.sigests ADD CONSTRAINT check_sigest_tipo CHECK (tipo IN ('balanceado', 'desbalanceado'));

-- Seed new materials for desbalanced CTOs
INSERT INTO public.materiales (nombre, activo) VALUES
('CTO 70/30', true),
('CTO 50/50', true),
('CTO COMÚN', true)
ON CONFLICT (nombre) DO NOTHING;
