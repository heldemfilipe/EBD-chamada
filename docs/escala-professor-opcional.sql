-- Permite professor_id ser NULL em escalas (professor definido depois)
ALTER TABLE escalas ALTER COLUMN professor_id DROP NOT NULL;
