import fs from 'fs';
import path from 'path';
import { supabase } from './supabase';

export interface VehicleTopicRecord {
  identifier: string;
  thread_id: number;
  created_at?: string;
}

// Memory Cache para velocidad instantánea
const memoryTopicCache = new Map<string, number>();

// Archivo local de almacenamiento persistente
const fallbackDbPath = path.join(process.cwd(), 'lib', 'database_fallback.json');

function normalizeKey(str: string): string {
  if (!str) return '';
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // Dejar solo letras y números
    .trim();
}

function readLocalFallback(): VehicleTopicRecord[] {
  try {
    if (fs.existsSync(fallbackDbPath)) {
      const data = fs.readFileSync(fallbackDbPath, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.vehicle_topics || [];
    }
  } catch (e) {
    console.warn('Error leyendo database_fallback.json para vehicle_topics:', e);
  }
  return [];
}

function writeLocalFallback(records: VehicleTopicRecord[]) {
  try {
    let currentDb: any = {};
    if (fs.existsSync(fallbackDbPath)) {
      const data = fs.readFileSync(fallbackDbPath, 'utf8');
      currentDb = JSON.parse(data);
    }
    currentDb.vehicle_topics = records;
    fs.writeFileSync(fallbackDbPath, JSON.stringify(currentDb, null, 2), 'utf8');
  } catch (e) {
    console.error('Error guardando vehicle_topics en database_fallback.json:', e);
  }
}

/**
 * Obtiene todos los temas/hilos registrados
 */
export async function getAllVehicleTopics(): Promise<VehicleTopicRecord[]> {
  const local = readLocalFallback();
  try {
    const { data } = await supabase.from('vehicle_topics').select('*');
    if (data && data.length > 0) {
      const merged = [...local];
      data.forEach(r => {
        if (!merged.some(m => m.thread_id === r.thread_id && m.identifier === r.identifier)) {
          merged.push(r);
        }
      });
      return merged;
    }
  } catch (e) {}

  return local;
}

/**
 * Elimina un registro de topic
 */
export async function deleteVehicleTopic(threadId: number): Promise<void> {
  for (const [k, v] of memoryTopicCache.entries()) {
    if (v === threadId) memoryTopicCache.delete(k);
  }

  const local = readLocalFallback().filter(r => r.thread_id !== threadId);
  writeLocalFallback(local);

  try {
    await supabase.from('vehicle_topics').delete().eq('thread_id', threadId);
  } catch (e) {}
}

/**
 * Busca si ya existe un Hilo/Topic para la Orden, Vehículo, VIN o Placa
 */
export async function findExistingThreadId(
  orden?: string, 
  vehiculo?: string, 
  topicTitle?: string,
  vin?: string,
  placa?: string
): Promise<number | null> {
  const rawKeys = [
    vin,
    vin ? vin.slice(-6) : '',
    vin ? `VIN${vin.slice(-6)}` : '',
    placa,
    orden,
    orden ? orden.replace(/^OT-?/i, '') : '',
    topicTitle,
    vehiculo,
    (orden && vehiculo) ? `${orden} ${vehiculo}` : ''
  ].filter(Boolean) as string[];

  const normalizedKeys = Array.from(new Set(rawKeys.map(normalizeKey))).filter(Boolean);

  // 1. Buscar en Caché de Memoria
  for (const key of normalizedKeys) {
    if (memoryTopicCache.has(key)) {
      const threadId = memoryTopicCache.get(key)!;
      console.log(`[TopicStore] Hilo encontrado en Memoria para '${key}': Thread ID ${threadId}`);
      return threadId;
    }
  }

  // 2. Buscar en Archivo Local JSON
  const localRecords = readLocalFallback();
  for (const rec of localRecords) {
    const recKey = normalizeKey(rec.identifier);
    for (const key of normalizedKeys) {
      if (recKey.includes(key) || key.includes(recKey)) {
        memoryTopicCache.set(key, rec.thread_id);
        console.log(`[TopicStore] Hilo encontrado en JSON Local para '${key}': Thread ID ${rec.thread_id}`);
        return rec.thread_id;
      }
    }
  }

  // 3. Buscar en Supabase
  try {
    for (const rawKey of rawKeys) {
      const { data } = await supabase
        .from('vehicle_topics')
        .select('thread_id')
        .ilike('identifier', `%${rawKey}%`)
        .limit(1)
        .single();

      if (data && data.thread_id) {
        const normKey = normalizeKey(rawKey);
        memoryTopicCache.set(normKey, data.thread_id);
        console.log(`[TopicStore] Hilo encontrado en Supabase para '${rawKey}': Thread ID ${data.thread_id}`);
        return data.thread_id;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Guarda el Hilo/Topic creado en Memoria, JSON Local y Supabase simultáneamente
 */
export async function saveVehicleTopic(
  threadId: number, 
  topicTitle: string, 
  orden?: string, 
  vehiculo?: string,
  vin?: string,
  placa?: string
) {
  const identifiers = Array.from(new Set([
    topicTitle,
    vin,
    vin ? vin.slice(-6) : '',
    vin ? `VIN-${vin.slice(-6)}` : '',
    placa,
    orden,
    orden ? orden.replace(/^OT-?/i, '') : '',
    vehiculo,
    (orden && vehiculo) ? `${orden} ${vehiculo}` : ''
  ].filter(Boolean) as string[]));

  // 1. Guardar en Memoria
  for (const id of identifiers) {
    const norm = normalizeKey(id);
    if (norm) {
      memoryTopicCache.set(norm, threadId);
    }
  }

  // 2. Guardar en JSON Local
  const localRecords = readLocalFallback();
  for (const id of identifiers) {
    if (!localRecords.some(r => r.identifier === id && r.thread_id === threadId)) {
      localRecords.push({ identifier: id, thread_id: threadId, created_at: new Date().toISOString() });
    }
  }
  writeLocalFallback(localRecords);

  // 3. Guardar en Supabase
  try {
    for (const id of identifiers) {
      await supabase.from('vehicle_topics').insert([{ identifier: id, thread_id: threadId }]);
    }
  } catch (e) {
    console.warn('Advertencia al insertar topic en Supabase:', e);
  }
}
