-- 1. Catálogo de Estados
CREATE TABLE IF NOT EXISTS public.despliegues_estados (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text UNIQUE NOT NULL, -- 'Pendiente', 'En proceso', 'Completado', 'Observado'
    color_hex text,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by text,
    updated_by text
);

-- 2. Catálogo de Tipos de Actividad
CREATE TABLE IF NOT EXISTS public.despliegues_tipos_actividad (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text UNIQUE NOT NULL, -- 'Instalar CTO', 'Certificar CTO'
    codigo_sufijo text, -- '_1' para Instalar, '_5' para Certificar
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by text,
    updated_by text
);

-- 3. Tabla de SIGEST (Sin estado_general almacenado)
CREATE TABLE IF NOT EXISTS public.sigests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_sigest text UNIQUE NOT NULL,
    central text NOT NULL,
    fecha_creacion timestamptz DEFAULT now(),
    fecha_actualizacion timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by text,
    updated_by text
);

-- 4. Tabla de CTO (Código único por SIGEST)
CREATE TABLE IF NOT EXISTS public.ctos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sigest_id uuid REFERENCES public.sigests(id) ON DELETE CASCADE,
    codigo text NOT NULL,
    direccion text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by text,
    updated_by text,
    CONSTRAINT ctos_sigest_codigo_unique UNIQUE (sigest_id, codigo)
);

-- 5. Tabla de Actividades (Con tecnico_nombre y auditoría)
CREATE TABLE IF NOT EXISTS public.actividades (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    cto_id uuid REFERENCES public.ctos(id) ON DELETE CASCADE,
    tipo_actividad_id uuid REFERENCES public.despliegues_tipos_actividad(id),
    estado_id uuid REFERENCES public.despliegues_estados(id),
    observaciones text,
    tecnico_nombre text,
    fecha_estado timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by text,
    updated_by text
);

-- 6. Tabla de Fotos (Con auditoría completa)
CREATE TABLE IF NOT EXISTS public.fotos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    actividad_id uuid REFERENCES public.actividades(id) ON DELETE CASCADE,
    url text NOT NULL,
    usuario text NOT NULL,
    fecha_subida timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by text,
    updated_by text
);

-- 7. Tabla de Catálogo de Materiales (Con estado activo y auditoría)
CREATE TABLE IF NOT EXISTS public.materiales (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text UNIQUE NOT NULL,
    activo boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by text,
    updated_by text
);

-- 8. Tabla Intermedia Actividad-Materiales
CREATE TABLE IF NOT EXISTS public.actividad_materiales (
    actividad_id uuid REFERENCES public.actividades(id) ON DELETE CASCADE,
    material_id uuid REFERENCES public.materiales(id) ON DELETE CASCADE,
    cantidad integer NOT NULL DEFAULT 1,
    origen text, -- 'Preparado de fábrica', 'Preparado por técnico'
    PRIMARY KEY (actividad_id, material_id)
);

-- 9. Tabla de Historial Ampliado
CREATE TABLE IF NOT EXISTS public.historial_despliegues (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    actividad_id uuid REFERENCES public.actividades(id) ON DELETE CASCADE,
    usuario text NOT NULL,
    fecha timestamptz DEFAULT now(),
    accion text NOT NULL, -- 'CAMBIO_ESTADO', 'SUBIO_FOTO', 'ELIMINO_FOTO', 'AGREGO_MATERIAL', 'EDITO_OBSERVACION'
    estado_anterior text NOT NULL,
    estado_nuevo text NOT NULL,
    observaciones text
);

-- Índices recomendados para optimización de búsquedas
CREATE INDEX IF NOT EXISTS idx_sigests_numero ON public.sigests(numero_sigest);
CREATE INDEX IF NOT EXISTS idx_sigests_central ON public.sigests(central);
CREATE INDEX IF NOT EXISTS idx_ctos_codigo ON public.ctos(codigo);
CREATE INDEX IF NOT EXISTS idx_actividades_cto ON public.actividades(cto_id);

-- --- Datos Semilla / Inicialización ---
-- Estados
INSERT INTO public.despliegues_estados (nombre, color_hex) VALUES
('Pendiente', '#64748b'),
('En proceso', '#f59e0b'),
('Completado', '#10b981'),
('Observado', '#ef4444')
ON CONFLICT (nombre) DO NOTHING;

-- Tipos de Actividad
INSERT INTO public.despliegues_tipos_actividad (nombre, codigo_sufijo) VALUES
('Instalar CTO', '_1'),
('Certificar CTO', '_5')
ON CONFLICT (nombre) DO NOTHING;

-- Catálogo de Materiales
INSERT INTO public.materiales (nombre, activo) VALUES
('Caja CTO', true),
('Drop 75 mts', true),
('Drop 125 mts', true),
('Drop 175 mts', true)
ON CONFLICT (nombre) DO NOTHING;
