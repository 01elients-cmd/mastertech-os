import type { Context } from 'telegraf';
import { FORUM_THREADS } from '../constants';
import { supabase } from '../supabase';

export async function handleCreateTopicCommand(ctx: Context): Promise<void> {
  try {
    const message = ctx.message;
    if (!message || !('text' in message)) return;

    const args = message.text.split(/\s+/).slice(1);
    if (args.length === 0) {
      await ctx.reply('⚠️ *Uso:* `/crear_hilo <Nombre del Tema>`\n\n*Ejemplo:* `/crear_hilo OT-5250 Toyota Corolla`', { parse_mode: 'Markdown' });
      return;
    }

    const topicName = args.join(' ').trim();

    // Determinar el grupo destino del foro (usa el grupo de foro configurado o el chat actual)
    const targetChatId = FORUM_THREADS.TALLER_FORO_DESTINO_ID || ctx.chat?.id;

    if (!targetChatId) {
      await ctx.reply('❌ No se encontró el ID del grupo foro de destino.');
      return;
    }

    // Crear el nuevo Tema / Hilo en el Foro de Telegram
    const newTopic = await ctx.telegram.createForumTopic(targetChatId, topicName);

    // Guardar en la base de datos para vinculación automática
    try {
      await supabase
        .from('vehicle_topics')
        .insert([{ identifier: topicName, thread_id: newTopic.message_thread_id }]);
    } catch (e) {
      console.warn('Advertencia guardando topic en BD:', e);
    }

    await ctx.reply(`✅ *¡Tema creado con éxito en el Foro!*\n\n📌 *Nombre:* ${newTopic.name}\n🆔 *ID del Hilo:* \`${newTopic.message_thread_id}\``, {
      parse_mode: 'Markdown'
    });

  } catch (error: any) {
    console.error('Error al crear tema en el foro:', error);
    await ctx.reply(`❌ *Error al crear el tema:* ${error.message || 'Verifica que el bot tenga permisos de Administrador para gestionar temas/hilos.'}`, {
      parse_mode: 'Markdown'
    });
  }
}
