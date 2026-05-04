-- Crear tabla de metricas_mensuales (Recrear si ya existe)
DROP TABLE IF EXISTS metricas_mensuales;

CREATE TABLE metricas_mensuales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mes VARCHAR(255) NOT NULL,
    celula VARCHAR(255),
    tecnico_id UUID REFERENCES tecnicos(id) ON DELETE CASCADE,
    resolucion NUMERIC,
    reiteros NUMERIC,
    puntualidad NUMERIC,
    productividad NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indice único para los totales de célula (tecnico_id es nulo)
CREATE UNIQUE INDEX idx_mm_celula ON metricas_mensuales(mes, celula) WHERE tecnico_id IS NULL;

-- Indice único para los técnicos individuales
CREATE UNIQUE INDEX idx_mm_tecnico ON metricas_mensuales(mes, tecnico_id) WHERE tecnico_id IS NOT NULL;
