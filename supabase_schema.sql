-- ==========================================
-- ESTRUCTURA COMPLETA BASE DE DATOS KPI VARELA
-- ==========================================

-- 1. Tabla de Técnicos (Maestro)
CREATE TABLE IF NOT EXISTS public.tecnicos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dni text UNIQUE,
    nombre text,
    apellido text,
    nombre_normalizado text,
    created_at timestamptz DEFAULT now()
);

-- 2. Alias de Técnicos (Para matching inteligente)
CREATE TABLE IF NOT EXISTS public.tecnico_alias (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tecnico_id uuid REFERENCES public.tecnicos(id) ON DELETE CASCADE,
    valor_original text,
    tipo text, -- 'dni_nombre', 'nombre'
    created_at timestamptz DEFAULT now()
);

-- 3. Métricas Diarias por Técnico (Resumen)
CREATE TABLE IF NOT EXISTS public.metricas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tecnico_id uuid REFERENCES public.tecnicos(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    celula text,
    resolucion numeric,
    reitero numeric,
    puntualidad numeric,
    productividad numeric,
    inicio numeric,
    ok1 numeric,
    cierres numeric,
    completadas numeric,
    no_encontrados numeric,
    deriva_bajadas numeric,
    created_at timestamptz DEFAULT now(),
    UNIQUE(tecnico_id, fecha)
);

-- 4. Métricas Diarias por Célula (Totales)
CREATE TABLE IF NOT EXISTS public.metricas_celula (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    celula text NOT NULL,
    fecha date NOT NULL,
    resolucion numeric,
    reitero numeric,
    puntualidad numeric,
    productividad numeric,
    inicio numeric,
    ok1 numeric,
    cierres numeric,
    completadas numeric,
    no_encontrados numeric,
    deriva_bajadas numeric,
    created_at timestamptz DEFAULT now(),
    UNIQUE(celula, fecha)
);

-- 5. Indicadores Distrito (Metadata Global)
CREATE TABLE IF NOT EXISTS public.indicadores_distrito (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    resolucion numeric,
    reiteros numeric,
    puntualidad numeric,
    productividad numeric,
    updated_at timestamptz DEFAULT now()
);

-- 6. Detalle de Actuaciones (Detalle Diario)
CREATE TABLE IF NOT EXISTS public.actuaciones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tx_celula text NOT NULL,
    fecha_cita date NOT NULL,
    estado text NOT NULL,
    recurso text NOT NULL,
    resolucion text,
    created_at timestamptz DEFAULT now()
);

-- 7. Días Operativos (Metadata por día)
CREATE TABLE IF NOT EXISTS public.dias_operativos (
    fecha date PRIMARY KEY,
    lluvia boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Índices Sugeridos
CREATE INDEX IF NOT EXISTS idx_metricas_fecha ON metricas(fecha);
CREATE INDEX IF NOT EXISTS idx_actuaciones_fecha ON actuaciones(fecha_cita);
CREATE INDEX IF NOT EXISTS idx_tecnicos_normalizado ON tecnicos(nombre_normalizado);
