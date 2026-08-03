import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

const fallbackPath = path.join(process.cwd(), 'lib', 'database_fallback.json');
let inMemoryDvi: DviReport[] | null = null;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
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

const sampleDvis: DviReport[] = [
  {
    id: 'dvi-1001',
    ot_number: 'OT-5201',
    vin: '9BRBD48398X004512',
    vehicle_name: 'Toyota Corolla 2018',
    plate: 'AA890BB',
    mileage: '115,420 km',
    client_name: 'Alejandro Mendoza',
    client_phone: '+58 412-5551234',
    technician_name: 'José Gómez',
    overall_status: 'ATENCION',
    health_score: 78,
    technician_summary: 'El vehículo se encuentra en buen estado general. Se detectó desgaste severo en la mangueta derecha y agrietamiento en el guardapolvo de la triceta.',
    items: DEFAULT_DVI_ITEMS.map((item, idx) => ({
      ...item,
      status: idx === 11 || idx === 14 ? 'URGENTE' : (idx === 0 || idx === 6 ? 'ATENCION' : 'BUENO'),
      notes: idx === 11 ? 'Amortiguador derecho botando fluido' : (idx === 14 ? 'Guardapolvo roto con fuga de grasa' : undefined)
    })),
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  }
];

export function readLocalDvis(): DviReport[] {
  if (inMemoryDvi) return inMemoryDvi;
  try {
    if (fs.existsSync(fallbackPath)) {
      const raw = fs.readFileSync(fallbackPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.dvi_reports) {
        inMemoryDvi = parsed.dvi_reports;
        return inMemoryDvi!;
      }
    }
  } catch (err) {
    console.error('Error leyendo DVI local:', err);
  }
  inMemoryDvi = sampleDvis;
  writeLocalDvis(inMemoryDvi);
  return inMemoryDvi;
}

export function writeLocalDvis(reports: DviReport[]) {
  inMemoryDvi = reports;
  try {
    let currentDb: any = {};
    if (fs.existsSync(fallbackPath)) {
      const raw = fs.readFileSync(fallbackPath, 'utf8');
      currentDb = JSON.parse(raw);
    }
    currentDb.dvi_reports = reports;
    fs.writeFileSync(fallbackPath, JSON.stringify(currentDb, null, 2), 'utf8');
  } catch (err) {
    console.error('Error escribiendo DVI local:', err);
  }
}

export async function dbGetDviReports(): Promise<DviReport[]> {
  const localDvis = readLocalDvis();
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase.from('dvi_reports').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return data as DviReport[];
      }
    } catch (e) {
      console.warn('Supabase DVI fetch failed, falling back to local:', e);
    }
  }

  return localDvis;
}

export async function dbSaveDviReport(report: DviReport): Promise<DviReport> {
  // Calcular puntaje de salud automáticamente si no se especificó
  let totalPoints = report.items.length;
  let score = 100;
  if (totalPoints > 0) {
    let badPoints = 0;
    report.items.forEach(i => {
      if (i.status === 'URGENTE') badPoints += 2;
      else if (i.status === 'ATENCION') badPoints += 1;
    });
    score = Math.max(10, Math.round(100 - (badPoints / (totalPoints * 2)) * 100));
  }
  report.health_score = score;

  // 1. Guardar en memoria y JSON local
  const current = readLocalDvis();
  const idx = current.findIndex(r => r.id === report.id);
  if (idx >= 0) {
    current[idx] = report;
  } else {
    current.unshift(report);
  }
  writeLocalDvis(current);

  // 2. Guardar en Supabase si está disponible
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('dvi_reports').upsert(report, { onConflict: 'id' });
    } catch (e) {
      console.error('Supabase DVI upsert exception:', e);
    }
  }

  return report;
}

export async function dbDeleteDviReport(id: string): Promise<boolean> {
  const current = readLocalDvis();
  const filtered = current.filter(r => r.id !== id);
  writeLocalDvis(filtered);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('dvi_reports').delete().eq('id', id);
    } catch (e) {}
  }
  return true;
}
