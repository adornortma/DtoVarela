-- Table for aggregated NPS data
CREATE TABLE IF NOT EXISTS nps_agregado (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    mes VARCHAR(7) NOT NULL, -- Format MM-YYYY
    distrito VARCHAR(255) NOT NULL,
    celula VARCHAR(255), -- Optional, can be null for district total
    nps NUMERIC NOT NULL,
    total_encuestas INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Unique constraint to avoid duplicates per month/distrito/celula
    UNIQUE(mes, distrito, celula)
);

-- Table for raw NPS survey details
CREATE TABLE IF NOT EXISTS nps_detalles (
    access_id VARCHAR(255) PRIMARY KEY, -- Provided in Excel as unique ID
    fecha TIMESTAMP WITH TIME ZONE NOT NULL,
    tx_celula VARCHAR(255) NOT NULL,
    dni_tecnico VARCHAR(20),
    nombre_tecnico VARCHAR(255),
    recomendacion INTEGER,
    cordialidad_tecnico INTEGER,
    promotor INTEGER DEFAULT 0,
    detractor INTEGER DEFAULT 0,
    obs_recomendacion TEXT,
    obs_wapp TEXT,
    obs_resoluci TEXT,
    evidencia TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (adjust as needed based on project patterns)
ALTER TABLE nps_agregado ENABLE ROW LEVEL SECURITY;
ALTER TABLE nps_detalles ENABLE ROW LEVEL SECURITY;

-- Allow all for now (simpler for this prototype, matching current project patterns)
CREATE POLICY "Allow all for nps_agregado" ON nps_agregado FOR ALL USING (true);
CREATE POLICY "Allow all for nps_detalles" ON nps_detalles FOR ALL USING (true);
