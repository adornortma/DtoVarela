-- Table to store weekly statistics for each technician
CREATE TABLE IF NOT EXISTS weekly_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    week TEXT NOT NULL, -- Format like '2024-W45'
    district TEXT DEFAULT 'Varela',
    cell TEXT NOT NULL, -- e.g., 'Berazategui', 'Varela 1'
    technician TEXT NOT NULL,
    resolution NUMERIC(5, 2), -- 0.00 to 100.00
    reiteros NUMERIC(5, 2), -- 0.00 to 100.00
    punctuality NUMERIC(5, 2), -- 0.00 to 100.00
    productivity NUMERIC(5, 2) -- 0 to 10.0
);

-- Index for fast lookup by week and cell
CREATE INDEX idx_weekly_stats_week_cell ON weekly_stats (week, cell);

-- Settings Table for Thresholds (Optional persistence)
CREATE TABLE IF NOT EXISTS kpi_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    kpi_name TEXT UNIQUE NOT NULL,
    green_val NUMERIC(5, 2),
    yellow_val NUMERIC(5, 2)
);

-- Initial default data (UPSERT if exists)
INSERT INTO kpi_thresholds (kpi_name, green_val, yellow_val) VALUES
('reiteros', 10, 15),
('resolution', 90, 85),
('punctuality', 95, 90),
('productivity', 8, 6)
ON CONFLICT (kpi_name) DO UPDATE SET green_val = EXCLUDED.green_val, yellow_val = EXCLUDED.yellow_val;
