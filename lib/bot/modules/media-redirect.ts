import type { Context } from 'telegraf';
import { FORUM_THREADS } from '../constants';
import { extractOrderAndVehicle } from './intake-validator';
import { findExistingThreadId } from '../topic-store';
import { fmt } from '../formatter';

interface UserActiveVehicleSession {
  threadId: number;
  topicTitle: string;
  orden?: string;
  vehiculo?: string;
  timestamp: number;
}

// Memoria de vehículo activo por usuario de Telegram (expira a los 3 minutos)
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

export function setActiveUserVehicleSession(userId: number, threadId: number, topicTitle: string, orden?: string, vehiculo?: string) {
  userActiveSessions.set(userId, {
    threadId,
    topicTitle,
    orden,
    vehiculo,
    timestamp: Date.now()
  });
}

/**
 * Función auxiliar para enviar avisos informativos a # General sin eliminar mensajes.
 */
async function sendNoticeToGeneral(ctx: Context, htmlText: string) {
  const operacionesChatId = FORUM_THREADS.TALLER_ORIGEN_ID; // -1003940815012 (# General)
  const formattedMsg = fmt.errorMessage(htmlText);

  try {
    await ctx.telegram.sendMessage(operacionesChatId, formattedMsg, {
      parse_mode: 'HTML',
      message_thread_id: 1
    });
  } catch (e) {
    try {
      await ctx.telegram.sendMessage(operacionesChatId, formattedMsg, {
        parse_mode: 'HTML'
      });
    } catch (err2) {
      console.error('Error enviando aviso a # General:', err2);
    }
  }
}

export async function handleMediaRedirect(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !ctx.chat) return;

  const userId = ctx.from?.id;
  const username = ctx.from?.first_name || 'Técnico';
  const textContent = ('caption' in message ? message.caption : ('text' in message ? message.text : '')) || '';
  const hasExplicitText = !!textContent.trim();

  let threadId: number | null = null;
  let identifier = '';

  // 1. Si el mensaje trae texto/caption explicito, extraemos Orden, VIN, Placa o Vehículo
  if (hasExplicitText) {
    const parsed = extractOrderAndVehicle(textContent);
    if (parsed.orden || parsed.vehiculo || parsed.vin || parsed.placa) {
      threadId = await findExistingThreadId(parsed.orden, parsed.vehiculo, parsed.topicTitle, parsed.vin, parsed.placa);
      identifier = parsed.topicTitle;

      if (userId && threadId) {
        setActiveUserVehicleSession(userId, threadId, parsed.topicTitle, parsed.orden, parsed.vehiculo);
      }
    }
  }

  // 2. Usar la sesión activa del usuario ÚNICAMENTE si el mensaje NO TIENE CAPTION/TEXTO
  if (!threadId && !hasExplicitText && userId && userActiveSessions.has(userId)) {
    const activeSession = userActiveSessions.get(userId)!;
    if (Date.now() - activeSession.timestamp < 3 * 60 * 1000) {
      threadId = activeSession.threadId;
      identifier = activeSession.topicTitle;
      activeSession.timestamp = Date.now(); // Renovar temporizador
    }
  }

  const isMediaMsg = 'photo' in message || 'video' in message || 'document' in message || 'voice' in message || 'audio' in message;

  // 3. SI EL VEHÍCULO NO ESTÁ REGISTRADO EN LA NUBE: NO se elimina la foto/video. Solo se notifica en # General.
  if (hasExplicitText && isMediaMsg && !threadId) {
    const warningNotice = `⚠️ <b>AVISO DE EVIDENCIA RECIBIDA</b>\n\n` +
      `👤 <b>Técnico:</b> ${username}\n` +
      `📌 <b>Texto:</b> <i>"${textContent}"</i>\n` +
      `ℹ️ <b>Nota:</b> La foto/video fue conservada en el grupo, pero este vehículo aún no tiene un Hilo registrado en la Nube.\n\n` +
      `💡 <b>Para enviarla a la Nube automáticamente:</b>\n` +
      `• Ejecuta: <code>/crear #ORDEN NombreVehiculo</code>\n` +
      `• O crea el Hilo desde el Panel Web.`;

    await sendNoticeToGeneral(ctx, warningNotice);
  }

  // 4. Copiar la evidencia (foto/video/álbum/texto) AL HILO CORRECTO en la Nube
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
