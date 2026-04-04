-- Kör detta i Supabase SQL Editor efter supabase-schema.sql

-- Öka bokade med 1 (atomisk operation)
CREATE OR REPLACE FUNCTION increment_booked(slot_id TEXT)
RETURNS void AS $$
  UPDATE slots SET booked = booked + 1 WHERE id = slot_id;
$$ LANGUAGE SQL;

-- Minska bokade med 1 vid avbokning
CREATE OR REPLACE FUNCTION decrement_booked(slot_id TEXT)
RETURNS void AS $$
  UPDATE slots SET booked = GREATEST(booked - 1, 0) WHERE id = slot_id;
$$ LANGUAGE SQL;
