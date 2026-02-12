-- Add last_polled_at to events for adaptive polling cooldown
ALTER TABLE events ADD COLUMN last_polled_at TIMESTAMP;
