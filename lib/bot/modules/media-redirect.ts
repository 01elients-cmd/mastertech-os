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

  // Buscar o crear el hilo en la Nube (-1003975478850)
  const threadId = await obtenerHiloDestino(ctx, parsed);

  if (threadId) {
    try {
      await ctx.telegram.copyMessage(
        FORUM_THREADS.TALLER_FORO_DESTINO_ID, // -1003975478850 (Nube)
        ctx.chat.id,
        message.message_id,
        { message_thread_id: threadId }
      );
      console.log(`Reporte '${identifier}' redireccionado a la Nube al Hilo: ${threadId}.`);
    } catch (e) {
      console.error(`Error al redireccionar el mensaje a la Nube: ${e}`);
    }
  }
}

async function obtenerHiloDestino(ctx: Context, parsed: { orden?: string; vehiculo?: string; topicTitle: string }): Promise<number | null> {
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

  // Si no existe, crear automáticamente el Topic del vehículo en la Nube (-1003975478850)
  if (parsed.orden || parsed.vehiculo) {
    try {
      const nubeChatId = FORUM_THREADS.TALLER_FORO_DESTINO_ID; // -1003975478850
      const nuevoTema = await ctx.telegram.createForumTopic(nubeChatId, parsed.topicTitle);
      const threadId = nuevoTema.message_thread_id;

      try {
        await supabase.from('vehicle_topics').insert([
          { identifier: parsed.topicTitle, thread_id: threadId },
          { identifier: parsed.orden || parsed.topicTitle, thread_id: threadId }
        ]);
      } catch (e) {}

      // Notificar de la creación en el Topic # General de Operaciones (-1003940815012, thread 1)
      const operacionesChatId = FORUM_THREADS.TALLER_ORIGEN_ID; // -1003940815012
      await ctx.telegram.sendMessage(
        operacionesChatId,
        `☁️ *NUBE - Nuevo Hilo Creado para Evidencia*\n\n✅ *Tema:* "${parsed.topicTitle}"\n🆔 *Hilo Nube:* \`${threadId}\``,
        { message_thread_id: 1, parse_mode: 'Markdown' }
      );

      return threadId;
    } catch (e) {
      console.error('Error creando topic en Nube:', e);
      return null;
    }
  }

  return null;
}
