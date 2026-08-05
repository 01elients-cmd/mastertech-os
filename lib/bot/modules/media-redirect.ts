import type { Context } from 'telegraf';
import { FORUM_THREADS } from '../constants';
import { extractOrderAndVehicle } from './intake-validator';
import { findExistingThreadId, saveVehicleTopic } from '../topic-store';

interface UserActiveVehicleSession {
  threadId: number;
  topicTitle: string;
  orden?: string;
  vehiculo?: string;
  timestamp: number;
}

// Memoria de vehículo activo por usuario de Telegram (expira a los 15 minutos)
const userActiveSessions = new Map<number, UserActiveVehicleSession>();

// Limpiar sesiones inactivas de más de 15 minutos
setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of userActiveSessions.entries()) {
    if (now - session.timestamp > 15 * 60 * 1000) {
      userActiveSessions.delete(userId);
    }
  }
}, 3 * 60 * 1000);

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

  // 2. Si la foto/video NO trae texto (o no tenía orden), usamos el vehículo activo de la sesión del asesor
  if (!threadId && userId && userActiveSessions.has(userId)) {
    const activeSession = userActiveSessions.get(userId)!;
    // Verificar que la sesión no haya expirado (15 min)
    if (Date.now() - activeSession.timestamp < 15 * 60 * 1000) {
      threadId = activeSession.threadId;
      identifier = activeSession.topicTitle;
      // Renovar el temporizador de la sesión
      activeSession.timestamp = Date.now();
    }
  }

  // 3. Copiar la evidencia (foto/video/álbum) al Hilo correspondiente en la Nube
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
  // Buscar Hilo existente por Orden, VIN, Placa o Vehículo
  const existingThreadId = await findExistingThreadId(parsed.orden, parsed.vehiculo, parsed.topicTitle, parsed.vin, parsed.placa);

  if (existingThreadId) {
    return existingThreadId;
  }

  // Si no existe pero hay orden o VIN, crear el hilo por única vez
  if (parsed.orden || parsed.vehiculo || parsed.vin) {
    try {
      const nubeChatId = FORUM_THREADS.TALLER_FORO_DESTINO_ID; // -1003975478850
      const nuevoTema = await ctx.telegram.createForumTopic(nubeChatId, parsed.topicTitle);
      const threadId = nuevoTema.message_thread_id;

      await saveVehicleTopic(threadId, parsed.topicTitle, parsed.orden, parsed.vehiculo, parsed.vin, parsed.placa);

      // Notificar en Operaciones # General
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
