-- Migration to add Lomas and Montegrande districts

INSERT INTO public.distritos (slug, nombre) VALUES 
('lomas', 'Lomas'),
('montegrande', 'Montegrande')
ON CONFLICT (slug) DO NOTHING;
