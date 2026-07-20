import type { Context } from 'telegraf';
import { supabase } from '../supabase';
import { FORUM_THREADS } from '../constants';

export async function handleMediaRedirect(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message) return;

  // Extraer el texto explicativo (caption)
  const caption = ('caption' in message ? message.caption : '') || '';
  if (!caption) {
    console.log('Mensaje multimedia sin texto, no se puede redireccionar.');
    return;
  }

  // La primera línea es el identificador (ej. "Corolla 1667")
  const lines = caption.split('\n');
  const identifier = lines[0].trim();

  if (!identifier) return;

  // Buscar el hilo en la base de datos
  const threadId = await obtenerHiloDestino(ctx, identifier);

  if (threadId) {
    try {
      // Reenviamos/Copiamos el mensaje con su foto/video al tema correspondiente
      await ctx.telegram.copyMessage(
        FORUM_THREADS.TALLER_FORO_DESTINO_ID,
        ctx.chat.id,
        message.message_id,
        { message_thread_id: threadId }
      );
      console.log(`Reporte de '${identifier}' redireccionado con éxito.`);
    } catch (e) {
      console.error(`Error al redireccionar el mensaje: ${e}`);
    }
  }
}

async function obtenerHiloDestino(ctx: Context, identifier: string): Promise<number | null> {
  // 1. Buscar en la base de datos
  const { data, error } = await supabase
    .from('vehicle_topics')
    .select('thread_id')
    .eq('identifier', identifier)
    .single();

  if (data && data.thread_id) {
    return data.thread_id;
  }

  // 2. Si no existe, creamos el Tema automáticamente en el Foro
  try {
    const nuevoTema = await ctx.telegram.createForumTopic(
      FORUM_THREADS.TALLER_FORO_DESTINO_ID,
      `🚗 ${identifier}`
    );
    const threadId = nuevoTema.message_thread_id;

    // Guardamos en la base de datos
    const { error: insertError } = await supabase
      .from('vehicle_topics')
      .insert([{ identifier, thread_id: threadId }]);

    if (insertError) {
      console.error('Error guardando el thread_id en BD:', insertError);
    }

    console.log(`Tema automático creado para: ${identifier} (ID Thread: ${threadId})`);
    return threadId;
  } catch (e) {
    console.error(`No se pudo crear el tema automático: ${e}`);
    return null;
  }
}
