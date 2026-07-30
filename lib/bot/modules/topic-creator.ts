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

    // 1. Crear el nuevo Tema / Hilo en el Foro de la Nube (ID: -1003975478850)
    const targetChatId = FORUM_THREADS.TALLER_FORO_DESTINO_ID; // -1003975478850
    const newTopic = await ctx.telegram.createForumTopic(targetChatId, topicName);

    // Guardar en la base de datos para vinculación automática
    try {
      await supabase
        .from('vehicle_topics')
        .insert([{ identifier: topicName, thread_id: newTopic.message_thread_id }]);
    } catch (e) {
      console.warn('Advertencia guardando topic en BD:', e);
    }

    // 2. Enviar el mensaje de notificación de creación al grupo ID: -1003940815012
    const notificationChatId = FORUM_THREADS.TALLER_ORIGEN_ID; // -1003940815012
    await ctx.telegram.sendMessage(
      notificationChatId,
      `☁️ *NUBE - Sincronización Automática con el Foro*\n\n✅ *Nuevo Hilo Creado:* "${newTopic.name}"\n🆔 *ID de Hilo:* \`${newTopic.message_thread_id}\`\n\n📌 *Notificación:* El tema ha sido creado en la Nube y está activo para la sincronización de archivos.`,
      { parse_mode: 'Markdown' }
    );

    // Responder también al usuario que invocó el comando
    await ctx.reply(`✅ *Tema creado con éxito en el Foro (-1003975478850)!*\n\n📌 *Nombre:* ${newTopic.name}\n🆔 *ID del Hilo:* \`${newTopic.message_thread_id}\`\n📩 *Notificación enviada al grupo (-1003940815012).*`, {
      parse_mode: 'Markdown'
    });

  } catch (error: any) {
    console.error('Error al crear tema en el foro:', error);
    await ctx.reply(`❌ *Error al crear el tema:* ${error.message || 'Verifica que el bot tenga permisos de Administrador para gestionar temas/hilos.'}`, {
      parse_mode: 'Markdown'
    });
  }
}
