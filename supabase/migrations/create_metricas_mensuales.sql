-- Crear tabla de metricas_mensuales
CREATE TABLE metricas_mensuales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mes VARCHAR(255) NOT NULL,
    distrito VARCHAR(255) NOT NULL,
    resolucion NUMERIC,
    reiteros NUMERIC,
    puntualidad NUMERIC,
    productividad NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(mes, distrito)
);
