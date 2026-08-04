export interface DviItem {
  id: string;
  category: string;
  name: string;
  status: 'BUENO' | 'ATENCION' | 'URGENTE';
  notes?: string;
  photo_url?: string;
}

export interface DviReport {
  id: string;
  ot_number?: string;
  vin?: string;
  vehicle_name: string;
  plate: string;
  mileage: string;
  client_name: string;
  client_phone: string;
  technician_name: string;
  overall_status: 'BUENO' | 'ATENCION' | 'URGENTE';
  health_score: number; // 0 - 100%
  items: DviItem[];
  technician_summary: string;
  created_at: string;
  updated_at: string;
}

// Plantilla estándar de 30 Puntos DVI para Inspección Digital
export const DEFAULT_DVI_ITEMS: Omit<DviItem, 'status'>[] = [
  // 🛢️ MOTOR Y FLUIDOS
  { id: 'm1', category: 'Motor y Fluidos', name: 'Nivel y Estado de Aceite de Motor' },
  { id: 'm2', category: 'Motor y Fluidos', name: 'Líquido Refrigerante / Coolant' },
  { id: 'm3', category: 'Motor y Fluidos', name: 'Líquido de Frenos (Humedad/Punto Ebullición)' },
  { id: 'm4', category: 'Motor y Fluidos', name: 'Fluido de Dirección Hidráulica' },
  { id: 'm5', category: 'Motor y Fluidos', name: 'Estado de Batería y Bornes (Voltaje)' },
  { id: 'm6', category: 'Motor y Fluidos', name: 'Fugas Visuales de Aceite o Refrigerante' },

  // 🛑 FRENOS Y SEGURIDAD
  { id: 'f1', category: 'Frenos y Seguridad', name: 'Pastillas de Freno Delanteras (% Vida)' },
  { id: 'f2', category: 'Frenos y Seguridad', name: 'Pastillas / Zapatas Traseras (% Vida)' },
  { id: 'f3', category: 'Frenos y Seguridad', name: 'Estado y Grosor de Discos de Freno' },
  { id: 'f4', category: 'Frenos y Seguridad', name: 'Líneas y Mangueras de Freno (Fugas)' },
  { id: 'f5', category: 'Frenos y Seguridad', name: 'Freno de Mano / Estacionamiento' },

  // ⚙️ SUSPENSIÓN Y DIRECCIÓN
  { id: 's1', category: 'Suspensión y Dirección', name: 'Amortiguadores Delanteros (Fluido/Rebote)' },
  { id: 's2', category: 'Suspensión y Dirección', name: 'Amortiguadores Traseros (Fluido/Rebote)' },
  { id: 's3', category: 'Suspensión y Dirección', name: 'Bujes de Mesetas y Barras Estabilizadoras' },
  { id: 's4', category: 'Suspensión y Dirección', name: 'Rotulas y Muñones de Dirección' },
  { id: 's5', category: 'Suspensión y Dirección', name: 'Tricetas y Guardapolvos de Ejes' },

  // ⚡ SISTEMA ELÉCTRICO Y LUCES
  { id: 'e1', category: 'Sistema Eléctrico', name: 'Luces Altas, Bajas y Antiniebla' },
  { id: 'e2', category: 'Sistema Eléctrico', name: 'Luces de Cruce, Freno y Reversa' },
  { id: 'e3', category: 'Sistema Eléctrico', name: 'Limpiaparabrisas y Nivel de Pluma' },
  { id: 'e4', category: 'Sistema Eléctrico', name: 'Testigos Activos en Tablero (Check Engine/ABS/Airbag)' },
  { id: 'e5', category: 'Sistema Eléctrico', name: 'Escaneo de Módulos Electrónicos (DTCs)' },

  // 🛞 NEUMÁTICOS Y LLANTAS
  { id: 'n1', category: 'Neumáticos', name: 'Neumático Delantero Izquierdo (Presión/Banda)' },
  { id: 'n2', category: 'Neumáticos', name: 'Neumático Delantero Derecho (Presión/Banda)' },
  { id: 'n3', category: 'Neumáticos', name: 'Neumático Trasero Izquierdo (Presión/Banda)' },
  { id: 'n4', category: 'Neumáticos', name: 'Neumático Trasero Derecho (Presión/Banda)' },
  { id: 'n5', category: 'Neumáticos', name: 'Rueda de Repuesto y Kit de Gato/Llave' },

  // 🧼 CARROCERÍA E INTERIOR
  { id: 'c1', category: 'Interior y Carrocería', name: 'Funcionamiento del Aire Acondicionado' },
  { id: 'c2', category: 'Interior y Carrocería', name: 'Cristales y Parabrisas (Sin Grietas)' },
  { id: 'c3', category: 'Interior y Carrocería', name: 'Estado de Pintura y Carrocería Exterior' }
];
