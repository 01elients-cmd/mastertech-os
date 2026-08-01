import type { Context } from 'telegraf';
import { FORUM_THREADS } from '../constants';
import { extractOrderAndVehicle } from './intake-validator';
import { findExistingThreadId, saveVehicleTopic } from '../topic-store';

export async function handleMediaRedirect(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !ctx.chat) return;

  const textContent = ('caption' in message ? message.caption : ('text' in message ? message.text : '')) || '';
  if (!textContent) {
    return;
  }

  const parsed = extractOrderAndVehicle(textContent);
  const identifier = parsed.topicTitle;

  // Buscar o crear el hilo en la Nube (-1003975478850) con protección anti-duplicación
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
  // 1. VERIFICACIÓN ANTI-DUPLICADOS: Consultar si ya existe el Hilo en Memoria, JSON Local o Supabase
  const existingThreadId = await findExistingThreadId(parsed.orden, parsed.vehiculo, parsed.topicTitle);

  if (existingThreadId) {
    console.log(`[MediaRedirect] Hilo existente reutilizado para '${parsed.topicTitle}': Thread ID ${existingThreadId}`);
    return existingThreadId;
  }

  // 2. Si no existe, crear automáticamente el Topic del vehículo en la Nube (-1003975478850)
  if (parsed.orden || parsed.vehiculo) {
    try {
      const nubeChatId = FORUM_THREADS.TALLER_FORO_DESTINO_ID; // -1003975478850
      const nuevoTema = await ctx.telegram.createForumTopic(nubeChatId, parsed.topicTitle);
      const threadId = nuevoTema.message_thread_id;

      // Guardar inmediatamente en Memoria, JSON Local y Supabase
      await saveVehicleTopic(threadId, parsed.topicTitle, parsed.orden, parsed.vehiculo);

      // Notificar en Operaciones # General
      const operacionesChatId = FORUM_THREADS.TALLER_ORIGEN_ID; // -1003940815012
      try {
        await ctx.telegram.sendMessage(
          operacionesChatId,
          `☁️ *NUBE - Nuevo Hilo Creado para Evidencia*\n\n✅ *Tema:* "${parsed.topicTitle}"\n🆔 *Hilo Nube:* \`${threadId}\``,
          { message_thread_id: 1, parse_mode: 'Markdown' }
        );
      } catch (e) {
        await ctx.telegram.sendMessage(
          operacionesChatId,
          `☁️ *NUBE - Nuevo Hilo Creado para Evidencia*\n\n✅ *Tema:* "${parsed.topicTitle}"\n🆔 *Hilo Nube:* \`${threadId}\``,
          { parse_mode: 'Markdown' }
        );
      }

      return threadId;
    } catch (e) {
      console.error('Error creando topic en Nube:', e);
      return null;
    }
  }

  return null;
}
