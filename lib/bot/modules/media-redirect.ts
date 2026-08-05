import type { Context } from 'telegraf';
import { FORUM_THREADS } from '../constants';
import { extractOrderAndVehicle } from './intake-validator';
import { findExistingThreadId, saveVehicleTopic } from '../topic-store';
import { fmt } from '../formatter';

interface UserActiveVehicleSession {
  threadId: number;
  topicTitle: string;
  orden?: string;
  vehiculo?: string;
  timestamp: number;
}

// Memoria de vehículo activo por usuario de Telegram (expira a los 3 minutos para evitar envíos cruzados)
const userActiveSessions = new Map<number, UserActiveVehicleSession>();

// Limpiar sesiones inactivas de más de 3 minutos
setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of userActiveSessions.entries()) {
    if (now - session.timestamp > 3 * 60 * 1000) {
      userActiveSessions.delete(userId);
    }
  }
}, 60 * 1000);

/**
 * Permite establecer el vehículo activo del usuario al ejecutar comandos o iniciar ingresos
 */
export function setActiveUserVehicleSession(userId: number, threadId: number, topicTitle: string, orden?: string, vehiculo?: string) {
  userActiveSessions.set(userId, {
    threadId,
    topicTitle,
    orden,
    vehiculo,
    timestamp: Date.now()
  });
}

export async function handleMediaRedirect(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !ctx.chat) return;

  const userId = ctx.from?.id;
  const username = ctx.from?.first_name || 'Técnico';
  const textContent = ('caption' in message ? message.caption : ('text' in message ? message.text : '')) || '';

  let threadId: number | null = null;
  let identifier = '';

  // 1. Si el mensaje trae texto, extraemos la Orden, VIN, Placa o Vehículo
  if (textContent.trim()) {
    const parsed = extractOrderAndVehicle(textContent);
    if (parsed.orden || parsed.vehiculo || parsed.vin) {
      threadId = await obtenerHiloDestino(ctx, parsed);
      identifier = parsed.topicTitle;

      // Actualizar la sesión activa del usuario para futuros envíos sin texto
      if (userId && threadId) {
        setActiveUserVehicleSession(userId, threadId, parsed.topicTitle, parsed.orden, parsed.vehiculo);
      }
    }
  }

  // 2. Si la foto/video NO trae texto (o no tenía orden), usamos el vehículo activo de la sesión del asesor (máximo 3 min)
  if (!threadId && userId && userActiveSessions.has(userId)) {
    const activeSession = userActiveSessions.get(userId)!;
    if (Date.now() - activeSession.timestamp < 3 * 60 * 1000) {
      threadId = activeSession.threadId;
      identifier = activeSession.topicTitle;
      activeSession.timestamp = Date.now(); // Renovar el temporizador
    }
  }

  const isStrict = process.env.REQUIRE_MEDIA_CAPTION === 'true';
  const isMediaMsg = 'photo' in message || 'video' in message || 'document' in message || 'voice' in message || 'audio' in message;

  // 3. FLUJO DE RECHAZO Y ELIMINACIÓN (Si el formato estricto está activo y es un archivo multimedia sin orden/vehículo activo)
  if (isStrict && isMediaMsg && !threadId) {
    try {
      await ctx.deleteMessage();
    } catch (e) {
      console.warn('No se pudo borrar el mensaje (posiblemente el bot no es administrador):', e);
    }

    const currentThreadId = 'message_thread_id' in message ? (message as any).message_thread_id : undefined;

    const warningNotice = `🗑️ <b>EVIDENCIA ELIMINADA POR FORMATO INCOMPLETO</b>\n\n` +
      `👤 <b>Técnico:</b> ${username}\n` +
      `⚠️ <b>Motivo de eliminación:</b> La opción de <i>Formato Estricto en Fotos/Videos</i> está activada y el archivo no incluía la descripción.\n\n` +
      `💡 <b>¿Cómo enviarlo correctamente?</b>\n` +
      `Al adjuntar la foto o video, añade una descripción a la imagen indicando el número de orden con # (ej: <code>#5250</code>) o el modelo del vehículo.`;

    try {
      await ctx.reply(fmt.errorMessage(warningNotice), { 
        parse_mode: 'HTML',
        message_thread_id: currentThreadId
      });
    } catch (e) {
      await ctx.reply(`⚠️ ${username}, tu foto/video fue eliminada porque no incluía número de orden (#5250) o vehículo en la descripción.`);
    }
    return;
  }

  // 4. Copiar la evidencia (foto/video/álbum/texto) al Hilo correspondiente en la Nube
  if (threadId) {
    try {
      await ctx.telegram.copyMessage(
        FORUM_THREADS.TALLER_FORO_DESTINO_ID, // -1003975478850 (Nube)
        ctx.chat.id,
        message.message_id,
        { message_thread_id: threadId }
      );
      console.log(`[MediaRedirect] Evidencia '${identifier}' redireccionada automáticamente al Hilo: ${threadId}.`);
    } catch (e) {
      console.error(`[MediaRedirect] Error al redireccionar mensaje al Hilo ${threadId}:`, e);
    }
  }
}

async function obtenerHiloDestino(
  ctx: Context, 
  parsed: { orden?: string; vehiculo?: string; vin?: string; placa?: string; topicTitle: string }
): Promise<number | null> {
  const existingThreadId = await findExistingThreadId(parsed.orden, parsed.vehiculo, parsed.topicTitle, parsed.vin, parsed.placa);

  if (existingThreadId) {
    return existingThreadId;
  }

  if (parsed.orden || parsed.vehiculo || parsed.vin) {
    try {
      const nubeChatId = FORUM_THREADS.TALLER_FORO_DESTINO_ID; // -1003975478850
      const nuevoTema = await ctx.telegram.createForumTopic(nubeChatId, parsed.topicTitle);
      const threadId = nuevoTema.message_thread_id;

      await saveVehicleTopic(threadId, parsed.topicTitle, parsed.orden, parsed.vehiculo, parsed.vin, parsed.placa);

      const operacionesChatId = FORUM_THREADS.TALLER_ORIGEN_ID; // -1003940815012
      const notifText = `☁️ *NUBE - Nuevo Hilo Creado para Evidencia*\n\n✅ *Tema:* "${parsed.topicTitle}"\n🆔 *Hilo Nube:* \`${threadId}\``;
      try {
        await ctx.telegram.sendMessage(operacionesChatId, notifText, { message_thread_id: 1, parse_mode: 'Markdown' });
      } catch (e) {
        try {
          await ctx.telegram.sendMessage(operacionesChatId, notifText, { parse_mode: 'Markdown' });
        } catch (errNotif) {}
      }

      return threadId;
    } catch (e) {
      console.error('Error creando topic en Nube:', e);
      return null;
    }
  }

  return null;
}
