import type { Context } from 'telegraf';
import { FORUM_THREADS } from '../constants';
import { saveVehicleTopic } from '../topic-store';

export async function handleCreateTopicCommand(ctx: Context): Promise<void> {
  try {
    const message = ctx.message;
    if (!message || !('text' in message)) return;

    const args = message.text.split(/\s+/).slice(1);
    if (args.length === 0) {
      await ctx.reply(
        '⚠️ *Uso:* `/crear <Nombre u Orden del Vehículo>`\n\n*Ejemplo:* `/crear OT-5250 Toyota Corolla`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const rawInput = args.join(' ').trim();
    const topicName = rawInput.startsWith('🚗') ? rawInput : `🚗 ${rawInput}`;

    // 1. Crear el nuevo Tema / Hilo en el Foro de la Nube (ID: -1003975478850)
    const targetChatId = FORUM_THREADS.TALLER_FORO_DESTINO_ID; // -1003975478850
    const newTopic = await ctx.telegram.createForumTopic(targetChatId, topicName);
    const threadId = newTopic.message_thread_id;

    // Guardar en la base de datos híbrida (Memoria + JSON + Supabase)
    await saveVehicleTopic(threadId, topicName, rawInput, rawInput);

    // 2. Enviar notificación al canal # General del grupo Operaciones (-1003940815012)
    const notificationChatId = FORUM_THREADS.TALLER_ORIGEN_ID; // -1003940815012
    const notificationText = `☁️ *NUBE - Nuevo Hilo Creado*\n\n✅ *Tema:* "${newTopic.name}"\n🆔 *ID de Hilo:* \`${threadId}\`\n\n📌 *Estado:* Activo en la Nube para recibir reportes y fotos.`;

    try {
      await ctx.telegram.sendMessage(notificationChatId, notificationText, {
        message_thread_id: 1,
        parse_mode: 'Markdown'
      });
    } catch (e) {
      try {
        await ctx.telegram.sendMessage(notificationChatId, notificationText, {
          parse_mode: 'Markdown'
        });
      } catch (errNotif) {
        console.warn('Advertencia enviando notificación a Operaciones:', errNotif);
      }
    }

    // 3. Confirmar al usuario que invocó el comando /crear
    await ctx.reply(
      `✅ *Tema creado con éxito en la Nube!*\n\n📌 *Nombre:* "${newTopic.name}"\n🆔 *ID de Hilo:* \`${threadId}\``,
      { parse_mode: 'Markdown' }
    );

  } catch (error: any) {
    console.error('Error al crear tema en el foro:', error);
    await ctx.reply(
      `❌ *Error al crear el tema:* ${error.message || 'Verifica permisos del bot.'}`,
      { parse_mode: 'Markdown' }
    );
  }
}
