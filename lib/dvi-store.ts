import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { DviItem, DviReport, DEFAULT_DVI_ITEMS } from './dvi-types';

export * from './dvi-types';

const fallbackPath = path.join(process.cwd(), 'lib', 'database_fallback.json');
let inMemoryDvi: DviReport[] | null = null;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

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

  const current = readLocalDvis();
  const idx = current.findIndex(r => r.id === report.id);
  if (idx >= 0) {
    current[idx] = report;
  } else {
    current.unshift(report);
  }
  writeLocalDvis(current);

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
