-- =============================================
-- MASTERTECH OS — ESQUEMA COMPLETO DE BASE DE DATOS
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- 1. VEHÍCULOS (Registro maestro)
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plate text UNIQUE NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  year integer,
  vin text,
  color text,
  client_name text,
  client_phone text,
  odometer_km integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_vehicles_plate ON vehicles(plate);
CREATE INDEX idx_vehicles_brand ON vehicles(brand);

-- 2. ÓRDENES DE TRABAJO
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number serial UNIQUE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  plate text NOT NULL,
  brand text,
  model text,
  year integer,
  client_name text,
  reported_issue text,
  confirmed_diagnosis text,
  assigned_technician text,
  technician_telegram_id text,
  ramp_number integer,
  status text DEFAULT 'RECIBIDO' CHECK (status IN (
    'RECIBIDO', 'EN_DIAGNOSTICO', 'ESPERANDO_APROBACION',
    'APROBADO', 'ESPERANDO_REPUESTOS', 'EN_REPARACION',
    'TRABAJO_EXTERNO', 'CONTROL_CALIDAD', 'LISTO_PARA_ENTREGA',
    'ENTREGADO', 'GARANTIA', 'CANCELADO'
  )),
  priority text DEFAULT 'NORMAL' CHECK (priority IN ('BAJA', 'NORMAL', 'ALTA', 'URGENTE')),
  odometer_at_entry integer,
  promised_date timestamptz,
  delivered_at timestamptz,
  total_cost numeric(12, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_work_orders_plate ON work_orders(plate);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_technician ON work_orders(technician_telegram_id);

-- 3. HISTORIAL DE CAMBIOS DE ESTATUS (Time Analytics)
CREATE TABLE IF NOT EXISTS order_status_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by text,
  changed_by_telegram_id text,
  duration_seconds integer, -- tiempo en el estatus anterior
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_status_log_order ON order_status_log(work_order_id);
CREATE INDEX idx_status_log_created ON order_status_log(created_at);

-- 4. INVENTARIO (Piezas + Fluidos a granel)
CREATE TABLE IF NOT EXISTS inventory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sku text UNIQUE,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'REPUESTO', 'FLUIDO', 'CONSUMIBLE', 'HERRAMIENTA', 'ACCESORIO'
  )),
  unit text NOT NULL DEFAULT 'unidad' CHECK (unit IN (
    'unidad', 'litro', 'galon', 'kilogramo', 'metro', 'par', 'juego'
  )),
  quantity numeric(12, 3) DEFAULT 0, -- soporta fracciones (5.5L)
  min_stock numeric(12, 3) DEFAULT 0, -- umbral para alerta
  max_stock numeric(12, 3),
  cost_per_unit numeric(12, 2) DEFAULT 0,
  sale_price numeric(12, 2) DEFAULT 0,
  location text, -- ubicación en almacén
  supplier text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_inventory_category ON inventory(category);
CREATE INDEX idx_inventory_name ON inventory(name);

-- 5. MOVIMIENTOS DE INVENTARIO
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_id uuid REFERENCES inventory(id) ON DELETE CASCADE,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  movement_type text NOT NULL CHECK (movement_type IN ('ENTRADA', 'SALIDA', 'AJUSTE')),
  quantity numeric(12, 3) NOT NULL,
  previous_stock numeric(12, 3),
  new_stock numeric(12, 3),
  reason text,
  registered_by text,
  registered_by_telegram_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_inv_movements_item ON inventory_movements(inventory_id);

-- 6. LOGÍSTICA (Rastreo de piezas en tránsito)
CREATE TABLE IF NOT EXISTS logistics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  plate text,
  part_name text NOT NULL,
  supplier text,
  freight_forwarder text,
  origin_country text,
  tracking_number text,
  status text DEFAULT 'SOLICITADO' CHECK (status IN (
    'SOLICITADO', 'EN_PRODUCCION', 'DESPACHADO', 'EN_TRANSITO',
    'EN_ADUANA', 'LIBERADO', 'EN_CAMINO_TALLER', 'RECIBIDO'
  )),
  eta_date date,
  actual_arrival date,
  cost numeric(12, 2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_logistics_plate ON logistics(plate);
CREATE INDEX idx_logistics_status ON logistics(status);

-- 7. TRABAJOS EXTERNALIZADOS
CREATE TABLE IF NOT EXISTS external_jobs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  plate text NOT NULL,
  provider_name text NOT NULL,
  service_description text,
  sent_at timestamptz DEFAULT now(),
  returned_at timestamptz,
  mechanic_time_frozen_at timestamptz DEFAULT now(), -- cuando se congeló el tiempo del mecánico
  provider_duration_seconds integer, -- tiempo total del proveedor
  status text DEFAULT 'ENVIADO' CHECK (status IN ('ENVIADO', 'EN_PROCESO', 'COMPLETADO', 'RETRASADO')),
  cost numeric(12, 2),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_external_jobs_plate ON external_jobs(plate);

-- 8. ALERTAS DEL SISTEMA
CREATE TABLE IF NOT EXISTS alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN (
    'PREVENTIVA', 'ESTANCAMIENTO', 'INVENTARIO_BAJO',
    'APROBACION_PENDIENTE', 'LOGISTICA', 'GENERAL'
  )),
  severity text DEFAULT 'MEDIA' CHECK (severity IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  title text NOT NULL,
  message text NOT NULL,
  keywords_detected text[], -- palabras clave que dispararon la alerta
  is_resolved boolean DEFAULT false,
  resolved_by text,
  resolved_at timestamptz,
  notified_at timestamptz,
  target_thread_id integer, -- hilo de Telegram donde se envió
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_resolved ON alerts(is_resolved);

-- 9. INSPECCIONES PDI
CREATE TABLE IF NOT EXISTS pdi_inspections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  plate text NOT NULL,
  brand text,
  model text,
  inspector_name text,
  inspector_telegram_id text,
  inspection_type text DEFAULT 'ENTRADA' CHECK (inspection_type IN ('ENTRADA', 'SALIDA', 'COMPLETA')),
  checklist jsonb DEFAULT '{}', -- {"pintura": true, "fluidos": false, ...}
  photos jsonb DEFAULT '[]', -- [{file_id, step, timestamp}]
  odometer_photo_file_id text,
  status text DEFAULT 'EN_PROGRESO' CHECK (status IN ('EN_PROGRESO', 'COMPLETADA', 'CANCELADA')),
  current_step integer DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pdi_plate ON pdi_inspections(plate);

-- 10. CICLO DE APROBACIONES
CREATE TABLE IF NOT EXISTS approvals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE CASCADE,
  plate text,
  description text NOT NULL, -- qué trabajo extra se encontró
  estimated_cost numeric(12, 2),
  requested_by text,
  requested_by_telegram_id text,
  approved_by text,
  approved_by_telegram_id text,
  status text DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
  telegram_message_id integer, -- ID del mensaje con los botones
  notified_technician boolean DEFAULT false,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_order ON approvals(work_order_id);

-- 11. REGISTRO DE MEDIA (Fotos/Videos obligatorios)
CREATE TABLE IF NOT EXISTS media_registry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  order_number integer,
  plate text,
  brand text,
  model text,
  file_id text NOT NULL, -- Telegram file_id
  file_type text CHECK (file_type IN ('photo', 'video', 'document')),
  caption text,
  category text, -- exterior, interior, diagnostico, entrega, etc
  uploaded_by text,
  uploaded_by_telegram_id text,
  thread_id integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_media_order ON media_registry(work_order_id);
CREATE INDEX idx_media_plate ON media_registry(plate);

-- 12. CÓDIGOS DTC (Diccionario OBD2)
CREATE TABLE IF NOT EXISTS dtc_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL, -- P0420, B1234, etc
  system text, -- powertrain, body, chassis, network
  description_en text,
  description_es text NOT NULL,
  common_causes text[], -- array de causas comunes
  severity text DEFAULT 'MEDIA',
  brand_specific text, -- si es específico de una marca
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_dtc_code_brand ON dtc_codes(code, COALESCE(brand_specific, ''));
CREATE INDEX idx_dtc_code ON dtc_codes(code);

-- 13. PROTOCOLOS OEM POR KILOMETRAJE
CREATE TABLE IF NOT EXISTS oem_protocols (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand text NOT NULL,
  model text, -- null = aplica a toda la marca
  km_interval integer NOT NULL, -- ej: 10000, 20000, 80000
  km_tolerance integer DEFAULT 5000, -- margen +/-
  services jsonb NOT NULL, -- [{name, description, priority}]
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_oem_brand_km ON oem_protocols(brand, km_interval);

-- 14. BASE DE CONOCIMIENTO
CREATE TABLE IF NOT EXISTS knowledge_base (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  brand text,
  model text,
  year integer,
  issue_description text NOT NULL,
  solution_description text NOT NULL,
  parts_used text[],
  torque_specs jsonb, -- {component: value}
  technician text,
  tags text[], -- para búsqueda
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_kb_brand_model ON knowledge_base(brand, model);
CREATE INDEX idx_kb_tags ON knowledge_base USING GIN(tags);

-- =============================================
-- FUNCIONES AUXILIARES
-- =============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
CREATE TRIGGER trg_vehicles_updated_at
  BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_work_orders_updated_at
  BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_logistics_updated_at
  BEFORE UPDATE ON logistics FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función para registrar cambios de estatus automáticamente
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  prev_log_time timestamptz;
  duration integer;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Calcular duración en el estatus anterior
    SELECT created_at INTO prev_log_time
    FROM order_status_log
    WHERE work_order_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;

    IF prev_log_time IS NOT NULL THEN
      duration = EXTRACT(EPOCH FROM (now() - prev_log_time))::integer;
    ELSE
      duration = EXTRACT(EPOCH FROM (now() - OLD.created_at))::integer;
    END IF;

    INSERT INTO order_status_log (
      work_order_id, previous_status, new_status, duration_seconds
    ) VALUES (
      NEW.id, OLD.status, NEW.status, duration
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_work_order_status_log
  AFTER UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION log_order_status_change();

-- Función para alerta automática de inventario bajo
CREATE OR REPLACE FUNCTION check_inventory_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity <= NEW.min_stock AND NEW.min_stock > 0 THEN
    INSERT INTO alerts (type, severity, title, message)
    VALUES (
      'INVENTARIO_BAJO',
      CASE WHEN NEW.quantity <= 0 THEN 'CRITICA' ELSE 'ALTA' END,
      '⚠️ Stock bajo: ' || NEW.name,
      'El producto "' || NEW.name || '" tiene ' || NEW.quantity || ' ' || NEW.unit ||
      '(s) restantes. Mínimo configurado: ' || NEW.min_stock || ' ' || NEW.unit || '(s).'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_inventory_low_stock
  AFTER UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION check_inventory_low_stock();
