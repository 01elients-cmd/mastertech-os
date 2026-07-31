import type { Context } from 'telegraf';
import { supabase } from '../supabase';
import { FORUM_THREADS } from '../constants';
import { extractOrderAndVehicle } from './intake-validator';

export async function handleMediaRedirect(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !ctx.chat) return;

  const textContent = ('caption' in message ? message.caption : ('text' in message ? message.text : '')) || '';
  if (!textContent) {
    return;
  }

  const parsed = extractOrderAndVehicle(textContent);
  const identifier = parsed.topicTitle;

  // Buscar si ya existe un hilo previamente registrado en la BD
  const threadId = await obtenerHiloDestino(parsed);

  if (threadId && threadId !== 1) {
    try {
      await ctx.telegram.copyMessage(
        FORUM_THREADS.TALLER_FORO_DESTINO_ID,
        ctx.chat.id,
        message.message_id,
        { message_thread_id: threadId }
      );
      console.log(`Reporte '${identifier}' redireccionado al Hilo: ${threadId}.`);
    } catch (e) {
      console.error(`Error al redireccionar el mensaje: ${e}`);
    }
  }
}

async function obtenerHiloDestino(parsed: { orden?: string; vehiculo?: string; topicTitle: string }): Promise<number | null> {
  const candidates = [parsed.topicTitle, parsed.orden, parsed.vehiculo].filter(Boolean) as string[];

  for (const cand of candidates) {
    const { data } = await supabase
      .from('vehicle_topics')
      .select('thread_id')
      .ilike('identifier', `%${cand}%`)
      .limit(1)
      .single();

    if (data && data.thread_id) {
      return data.thread_id;
    }
  }

  // NO crear nuevos temas/topics automáticamente en -1003940815012
  return null;
}
