-- Migración para almacenar la relación entre identificadores de vehículos y sus hilos (topics) en Telegram
CREATE TABLE IF NOT EXISTS vehicle_topics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier text UNIQUE NOT NULL, -- Ej: "Corolla 1667"
  thread_id integer NOT NULL,      -- message_thread_id en el grupo foro
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_vehicle_topics_identifier ON vehicle_topics(identifier);
