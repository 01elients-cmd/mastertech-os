/**
 * MasterTech OS — Extracción de Entidades con LLM
 * Clasifica texto libre en: Vehículo, Requerimiento, Etiqueta
 */

import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ExtractedEntity {
  vehiculo: string | null;
  requerimiento: string | null;
  etiqueta: string | null;
  prioridad: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  confianza: number;
}

export async function extractEntities(text: string): Promise<ExtractedEntity> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Eres un asistente de taller automotriz. Extrae entidades del texto del técnico.
Responde SOLO en JSON con este formato exacto:
{
  "vehiculo": "Marca Modelo (si se menciona)" o null,
  "requerimiento": "Qué se necesita/reporta" o null,
  "etiqueta": una de ["Repuestos/Inventario","Diagnóstico","Reparación","Mantenimiento","Logística","Garantía","Calidad","Incidencia","General"],
  "prioridad": una de ["BAJA","NORMAL","ALTA","URGENTE"],
  "confianza": número entre 0 y 1
}`
        },
        { role: 'user', content: text }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return defaultEntity();
    return JSON.parse(content) as ExtractedEntity;
  } catch (error) {
    console.error('Error en extracción de entidades:', error);
    return defaultEntity();
  }
}

function defaultEntity(): ExtractedEntity {
  return { vehiculo: null, requerimiento: null, etiqueta: 'General', prioridad: 'NORMAL', confianza: 0 };
}
