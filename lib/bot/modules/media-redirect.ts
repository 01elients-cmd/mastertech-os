import type { Context } from 'telegraf';
import { supabase } from '../supabase';
import { FORUM_THREADS } from '../constants';
import { extractOrderAndVehicle } from './intake-validator';

export async function handleMediaRedirect(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !ctx.chat) return;

  // Extraer el texto explicativo (caption) o texto
  const textContent = ('caption' in message ? message.caption : ('text' in message ? message.text : '')) || '';
  if (!textContent) {
    return;
  }

  // Extraer orden y vehículo usando el analizador ultra-flexible
  const parsed = extractOrderAndVehicle(textContent);
  const identifier = parsed.topicTitle;

  // Buscar el hilo en la base de datos (por título completo, por orden "OT-1687" o por vehículo)
  const threadId = await obtenerHiloDestino(ctx, parsed);

  if (threadId) {
    try {
      // Reenviamos/Copiamos el mensaje con su foto/video al tema correspondiente en Operaciones
      await ctx.telegram.copyMessage(
        FORUM_THREADS.TALLER_FORO_DESTINO_ID,
        ctx.chat.id,
        message.message_id,
        { message_thread_id: threadId }
      );
      console.log(`Reporte '${identifier}' redireccionado con éxito al Hilo: ${threadId}.`);
    } catch (e) {
      console.error(`Error al redireccionar el mensaje: ${e}`);
    }
  }
}

async function obtenerHiloDestino(ctx: Context, parsed: { orden?: string; vehiculo?: string; topicTitle: string }): Promise<number | null> {
  const candidates = [parsed.topicTitle, parsed.orden, parsed.vehiculo].filter(Boolean) as string[];

  // 1. Buscar en la base de datos por cualquiera de los identificadores
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

  // 2. Si no existe en BD, crear el Tema automáticamente en Operaciones
  try {
    const nuevoTema = await ctx.telegram.createForumTopic(
      FORUM_THREADS.TALLER_FORO_DESTINO_ID,
      parsed.topicTitle
    );
    const threadId = nuevoTema.message_thread_id;

    // Guardar en BD para futuras fotos
    try {
      await supabase.from('vehicle_topics').insert([
        { identifier: parsed.topicTitle, thread_id: threadId },
        { identifier: parsed.orden || parsed.topicTitle, thread_id: threadId }
      ]);
    } catch (e) {}

    console.log(`Tema automático creado para: ${parsed.topicTitle} (ID Thread: ${threadId})`);
    return threadId;
  } catch (e) {
    console.error(`No se pudo crear el tema automático: ${e}`);
    return null;
  }
}
