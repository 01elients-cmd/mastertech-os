import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { SOPS } from './templates/sops';

const fallbackPath = path.join(process.cwd(), 'lib', 'database_fallback.json');

// Interface definition for Jornada
export interface Jornada {
  id: string | number;
  telegram_id: number;
  username: string;
  started_at: string;
  ended_at: string | null;
  status: 'ACTIVO' | 'FINALIZADO';
}

// Interface definition for SOP Record
export interface SopRecord {
  id: string;
  category: string;
  template_key: string;
  title: string;
  client_name: string;
  vehicle: string;
  plate: string;
  creator: string;
  content: string;
  status: 'Pendiente' | 'En proceso' | 'Completado' | 'Aprobado' | 'Rechazado';
  created_at: string;
  updated_at: string;
}

// Interface definition for SOP Template
export interface SopTemplate {
  key: string;
  title: string;
  content: string;
  category: string;
  updated_at: string;
}

interface LocalDB {
  jornadas: Jornada[];
  sops_records: SopRecord[];
  sops_templates: SopTemplate[];
}

// Prepopulated mock data for fallback
function getInitialData(): LocalDB {
  const defaultTemplates: SopTemplate[] = [
    { key: 'NUEVO_INGRESO', title: '🚗 Nuevo Ingreso', content: SOPS.NUEVO_INGRESO, category: 'recepcion', updated_at: new Date().toISOString() },
    { key: 'SOLICITUD_REPUESTO', title: '📦 Solicitud de Repuesto', content: SOPS.SOLICITUD_REPUESTO, category: 'repuestos', updated_at: new Date().toISOString() },
    { key: 'COTIZACION_REPUESTO', title: '📄 Cotización/Despacho de Refacción', content: SOPS.COTIZACION_REPUESTO, category: 'repuestos', updated_at: new Date().toISOString() },
    { key: 'NUEVOS_HALLAZGOS', title: '🔍 Nuevos Hallazgos en Diagnóstico', content: SOPS.NUEVOS_HALLAZGOS, category: 'operaciones', updated_at: new Date().toISOString() },
    { key: 'LISTO_PARCIAL', title: '⚡ Diagnóstico Listo/Parcial', content: SOPS.LISTO_PARCIAL, category: 'operaciones', updated_at: new Date().toISOString() },
    { key: 'ESTATUS_OP', title: '💰 Estatus de Cotización', content: SOPS.ESTATUS_OP, category: 'operaciones', updated_at: new Date().toISOString() },
    { key: 'GARANTIA_REINGRESO', title: '🧧 Reingreso por Garantía', content: SOPS.GARANTIA_REINGRESO, category: 'garantias', updated_at: new Date().toISOString() },
    { key: 'GARANTIA_RETRABAJO', title: '⚠️ Reingreso por Retrabajo', content: SOPS.GARANTIA_RETRABAJO, category: 'garantias', updated_at: new Date().toISOString() },
    { key: 'PENDIENTES_POSTVENTA', title: '⚙️ Control de Post-Venta y Logística', content: SOPS.PENDIENTES_POSTVENTA, category: 'pendientes', updated_at: new Date().toISOString() },
    { key: 'PENDIENTES_SEGUIMIENTO', title: '📞 Seguimiento de Llamadas y Cita', content: SOPS.PENDIENTES_SEGUIMIENTO, category: 'pendientes', updated_at: new Date().toISOString() },
    { key: 'INCIDENCIA_APERTURA', title: '🔴 Reporte de Incidencia (Apertura)', content: SOPS.INCIDENCIA_APERTURA, category: 'incidencias', updated_at: new Date().toISOString() },
    { key: 'INCIDENCIA_CIERRE', title: '🟢 Resolución de Incidencia (Cierre)', content: SOPS.INCIDENCIA_CIERRE, category: 'incidencias', updated_at: new Date().toISOString() },
    { key: 'CONTROL_CALIDAD', title: '📋 Control de Calidad QC', content: SOPS.CONTROL_CALIDAD, category: 'calidad', updated_at: new Date().toISOString() },
    { key: 'LINEA_INSPECCION', title: '🔍 Ficha de Inspección', content: SOPS.LINEA_INSPECCION, category: 'inspeccion', updated_at: new Date().toISOString() },
    { key: 'MEJORA_APERTURA', title: '💡 Propuesta de Mejora (Apertura)', content: SOPS.MEJORA_APERTURA, category: 'mejora', updated_at: new Date().toISOString() },
    { key: 'MEJORA_CIERRE', title: '🚀 Implementación de Mejora (Cierre)', content: SOPS.MEJORA_CIERRE, category: 'mejora', updated_at: new Date().toISOString() },
  ];

  const now = new Date();
  
  // High quality realistic mock records
  const sampleRecords: SopRecord[] = [
    {
      id: 'rec-1',
      category: 'recepcion',
      template_key: 'NUEVO_INGRESO',
      title: 'OT #5201 - Toyota Corolla 2018',
      client_name: 'Alejandro Mendoza',
      vehicle: 'Toyota Corolla 2018',
      plate: 'AA890BB',
      creator: 'Carlos Pérez',
      content: `🚗 NUEVO INGRESO

• Vehículo: Toyota Corolla 2018, Gris, Placa AA890BB
• Cliente: Alejandro Mendoza
• Contacto: +58 412-5551234
• Falla Reportada: Ruido metálico al cruzar a la derecha y vibración en el volante a más de 80km/h
• Observaciones general: Golpe leve en el parachoques delantero izquierdo. Caucho delantero derecho desgastado irregularmente en la cara interna.
• Evidencia: Fotos cargadas en el canal. Odómetro marca 115,420 km. AC enciende correctamente. Cluster sin códigos activos.`,
      status: 'Completado',
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'rec-2',
      category: 'repuestos',
      template_key: 'SOLICITUD_REPUESTO',
      title: 'OT #5201 - Mangueta y Amortiguadores',
      client_name: 'Alejandro Mendoza',
      vehicle: 'Toyota Corolla 2018',
      plate: 'AA890BB',
      creator: 'José Gómez',
      content: `📦 SOLICITUD DE REPUESTOS

• Orden: 5201
• Vehículo: Toyota Corolla 2018
• VIN / Serie: 9BRBD48398X004512
• Pieza Solicitada: Amortiguadores delanteros (Juego de 2) y Muela/Mangueta de dirección derecha
• ¿Se requiere kit o componente único?: Kit con bases de amortiguador e isoladores.
• Mecánico que solicita: José Gómez

📸 Fotos de bases agrietadas y amortiguador derecho botando fluido adjuntadas al canal.`,
      status: 'Aprobado',
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'rec-3',
      category: 'operaciones',
      template_key: 'NUEVOS_HALLAZGOS',
      title: 'OT #5201 - Tripeta y guardapolvo roto',
      client_name: 'Alejandro Mendoza',
      vehicle: 'Toyota Corolla 2018',
      plate: 'AA890BB',
      creator: 'José Gómez',
      content: `🔧 Nuevos Hallazgos durante el diagnostico

ORDEN #5201 - Toyota Corolla 2018: Al desmontar la muela derecha, se detectó el guardapolvo de la triceta roto y pérdida de grasa grafitada. La triceta presenta desgaste interno severo, lo cual causa el ruido metálico al cruzar. Requiere reemplazo de punta de eje/triceta.`,
      status: 'En proceso',
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'rec-4',
      category: 'incidencias',
      template_key: 'INCIDENCIA_APERTURA',
      title: 'OT #5198 - Repuesto de año incorrecto',
      client_name: 'Mariana Silva',
      vehicle: 'Honda Civic 2015',
      plate: 'XX123YY',
      creator: 'Alejandro Asesor',
      content: `🔴 1. Reporte de Incidencia (Apertura)

#Incidencia_Apertura
👤 Detecta: Alejandro Asesor
🏢 Área_Afectada: Repuestos / Taller
🎯 Origen_Problema: Proveedor / Repuestos
🛠 Orden (OT): 5198
🚀 Tipo: Retraso por parte equivocada
🔥 Gravedad: Media
📝 Detalle: El proveedor externo envió pastillas de freno delanteras para Civic 2012-2013, las cuales son más pequeñas que las del Civic 2015. El vehículo quedó montado en el elevador bloqueando la bahía 2 por 3 horas extra hasta recibir el repuesto correcto.`,
      status: 'Pendiente',
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ];

  const sampleJornadas: Jornada[] = [
    {
      id: 'jor-1',
      telegram_id: 11223344,
      username: 'Carlos Pérez',
      started_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000 - 8 * 60 * 60 * 1000).toISOString(),
      ended_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'FINALIZADO',
    },
    {
      id: 'jor-2',
      telegram_id: 99887766,
      username: 'José Gómez',
      started_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      ended_at: null,
      status: 'ACTIVO',
    },
    {
      id: 'jor-3',
      telegram_id: 55443322,
      username: 'Marcos Altuve',
      started_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      ended_at: null,
      status: 'ACTIVO',
    }
  ];

  return {
    jornadas: sampleJornadas,
    sops_records: sampleRecords,
    sops_templates: defaultTemplates,
  };
}

// Read local JSON file DB
export function readLocalDB(): LocalDB {
  try {
    if (!fs.existsSync(fallbackPath)) {
      const initial = getInitialData();
      writeLocalDB(initial);
      return initial;
    }
    const raw = fs.readFileSync(fallbackPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local fallback db:', err);
    return getInitialData();
  }
}

// Write local JSON file DB
export function writeLocalDB(data: LocalDB) {
  try {
    const parentDir = path.dirname(fallbackPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(fallbackPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing local fallback db:', err);
  }
}

// Try client connection
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Hybrid operation functions helper
export async function dbGetTemplates(): Promise<SopTemplate[]> {
  const defaults = getInitialData().sops_templates;
  const supabase = getSupabaseClient();
  
  if (supabase) {
    try {
      const { data, error } = await supabase.from('sops_templates').select('*');
      if (!error && data) {
        // Merge Supabase templates on top of default ones
        const remoteTemplates = data as SopTemplate[];
        const merged = defaults.map(def => {
          const found = remoteTemplates.find(r => r.key === def.key);
          return found ? found : def;
        });
        
        // Append any extra keys defined in Supabase that are not in defaults
        remoteTemplates.forEach(r => {
          if (!merged.some(m => m.key === r.key)) {
            merged.push(r);
          }
        });
        
        return merged;
      } else if (error) {
        console.error('Supabase get templates error:', error.message);
      }
    } catch (e) {
      console.warn('Supabase templates fetch failed, falling back to local file:', e);
    }
  }
  return readLocalDB().sops_templates;
}

export async function dbUpsertTemplate(key: string, title: string, content: string, category: string): Promise<SopTemplate> {
  const updated_at = new Date().toISOString();
  const templateObj = { key, title, content, category, updated_at };
  
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('sops_templates').upsert(templateObj, { onConflict: 'key' });
      if (!error) return templateObj;
      console.error('Supabase upsert template error:', error);
    } catch (e) {
      console.error('Supabase upsert template exception:', e);
    }
  }

  // Fallback to local
  const db = readLocalDB();
  const index = db.sops_templates.findIndex((t) => t.key === key);
  if (index >= 0) {
    db.sops_templates[index] = templateObj;
  } else {
    db.sops_templates.push(templateObj);
  }
  writeLocalDB(db);
  return templateObj;
}

export async function dbGetRecords(): Promise<SopRecord[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('sops_records').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data as SopRecord[];
      }
    } catch (e) {
      console.warn('Supabase records fetch failed, falling back to local file:', e);
    }
  }
  return readLocalDB().sops_records;
}

export async function dbUpsertRecord(record: SopRecord): Promise<SopRecord> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('sops_records').upsert(record);
      if (!error) return record;
      console.error('Supabase upsert record error:', error);
    } catch (e) {
      console.error('Supabase upsert record exception:', e);
    }
  }

  // Fallback to local
  const db = readLocalDB();
  const index = db.sops_records.findIndex((r) => r.id === record.id);
  if (index >= 0) {
    db.sops_records[index] = { ...record, updated_at: new Date().toISOString() };
  } else {
    db.sops_records.unshift(record); // Add to beginning
  }
  writeLocalDB(db);
  return record;
}

export async function dbDeleteRecord(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('sops_records').delete().eq('id', id);
      if (!error) return true;
      console.error('Supabase delete record error:', error);
    } catch (e) {
      console.error('Supabase delete record exception:', e);
    }
  }

  // Fallback to local
  const db = readLocalDB();
  const initialLength = db.sops_records.length;
  db.sops_records = db.sops_records.filter((r) => r.id !== id);
  writeLocalDB(db);
  return db.sops_records.length < initialLength;
}

export async function dbGetJornadas(): Promise<Jornada[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('jornadas').select('*').order('started_at', { ascending: false });
      if (!error && data) {
        return data as Jornada[];
      }
    } catch (e) {
      console.warn('Supabase jornadas fetch failed, falling back to local file:', e);
    }
  }
  return readLocalDB().jornadas;
}

export async function dbUpsertJornada(jornada: Jornada): Promise<Jornada> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('jornadas').upsert(jornada);
      if (!error) return { ...jornada };
      console.error('Supabase upsert jornada error:', error);
    } catch (e) {
      console.error('Supabase upsert jornada exception:', e);
    }
  }

  // Fallback to local
  const db = readLocalDB();
  const index = db.jornadas.findIndex((j) => String(j.id) === String(jornada.id));
  if (index >= 0) {
    db.jornadas[index] = { ...jornada };
  } else {
    db.jornadas.unshift(jornada);
  }
  writeLocalDB(db);
  return jornada;
}

export async function dbDeleteJornada(id: string | number): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase.from('jornadas').delete().eq('id', id);
      if (!error) return true;
      console.error('Supabase delete jornada error:', error);
    } catch (e) {
      console.error('Supabase delete jornada exception:', e);
    }
  }

  // Fallback to local
  const db = readLocalDB();
  const initialLength = db.jornadas.length;
  db.jornadas = db.jornadas.filter((j) => String(j.id) !== String(id));
  writeLocalDB(db);
  return db.jornadas.length < initialLength;
}
