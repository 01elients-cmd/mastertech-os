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
    if (parsed.orden || parsed.vehiculo || parsed.vin || parsed.placa) {
      threadId = await findExistingThreadId(parsed.orden, parsed.vehiculo, parsed.topicTitle, parsed.vin, parsed.placa);
      identifier = parsed.topicTitle;

      if (userId && threadId) {
        setActiveUserVehicleSession(userId, threadId, parsed.topicTitle, parsed.orden, parsed.vehiculo);
      }
    }
  }

  // 2. Si la foto/video NO trae orden explícita, usamos el vehículo activo de la sesión del asesor (3 min)
  if (!threadId && userId && userActiveSessions.has(userId)) {
    const activeSession = userActiveSessions.get(userId)!;
    if (Date.now() - activeSession.timestamp < 3 * 60 * 1000) {
      threadId = activeSession.threadId;
      identifier = activeSession.topicTitle;
      activeSession.timestamp = Date.now(); // Renovar temporizador
    }
  }

  const isStrict = process.env.REQUIRE_MEDIA_CAPTION === 'true';
  const isMediaMsg = 'photo' in message || 'video' in message || 'document' in message || 'voice' in message || 'audio' in message;

  // 3. FLUJO DE RECHAZO (Si no hay un Hilo Creado previamente y el formato estricto está activo)
  if (isStrict && isMediaMsg && !threadId) {
    try {
      await ctx.deleteMessage();
    } catch (e) {
      console.warn('No se pudo borrar el mensaje (posiblemente el bot no es administrador):', e);
    }

    const currentThreadId = 'message_thread_id' in message ? (message as any).message_thread_id : undefined;

    const warningNotice = `🗑️ <b>EVIDENCIA RECHAZADA POR FALTA DE HILO REGISTRADO</b>\n\n` +
      `👤 <b>Técnico:</b> ${username}\n` +
      `⚠️ <b>Motivo:</b> No existe un Hilo registrado en la Nube para esta orden o vehículo.\n\n` +
      `💡 <b>¿Cómo registrar el vehículo primero?</b>\n` +
      `• Ejecuta: <code>/crear #5250 Toyota Corolla</code>\n` +
      `• O crea el Hilo desde el Panel Web.\n` +
      `• Una vez creado, tus fotos se redirigirán automáticamente.`;

    try {
      await ctx.reply(fmt.errorMessage(warningNotice), { 
        parse_mode: 'HTML',
        message_thread_id: currentThreadId
      });
    } catch (e) {
      await ctx.reply(`⚠️ ${username}, la foto/video fue eliminada. Registra primero el vehículo con /crear #ORDEN Nombre.`);
    }
    return;
  }

  // 4. Copiar la evidencia (foto/video/álbum/texto) al Hilo EXISTENTE en la Nube (NO CREA TEMAS AUTOMÁTICOS FANTASMA)
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
