import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { FORUM_THREADS } from '../constants';
import { findExistingThreadId, saveVehicleTopic } from '../topic-store';

interface PendingIntake {
  id: string;
  vehiculo: string;
  originalText: string;
  userId: number;
  chatId: number;
  state: 'AWAITING_CHOICE' | 'AWAITING_MANUAL_ORDEN';
  createdAt: number;
}

const pendingIntakes = new Map<string, PendingIntake>();

// Limpiar solicitudes antiguas de más de 30 minutos
setInterval(() => {
  const now = Date.now();
  for (const [id, item] of pendingIntakes.entries()) {
    if (now - item.createdAt > 30 * 60 * 1000) {
      pendingIntakes.delete(id);
    }
  }
}, 5 * 60 * 1000);

export function extractOrderAndVehicle(text: string): { orden?: string; vehiculo?: string; topicTitle: string } {
  const ordenMatch = text.match(/(?:#?\b(?:orden(?:\s+de\s+(?:servicio|trabajo))?|nro(?:\s+de)?\s+orden|ot)\b[:\s#•]*)([a-z0-9-]+)/i);
  
  let rawOrden = ordenMatch ? ordenMatch[1].trim() : '';

  rawOrden = rawOrden.replace(/^[^a-z0-9]+/i, '').trim();

  if (!rawOrden) {
    const standaloneNumMatch = text.match(/\b([0-9]{3,6})\b/);
    if (standaloneNumMatch) {
      rawOrden = standaloneNumMatch[1];
    }
  }

  const vehiculoMatch = text.match(/(?:veh[íi]culo|auto|carro)[:\s•]*([^\n•]+)/i);
  let rawVehiculo = vehiculoMatch ? vehiculoMatch[1].trim() : '';

  if (!rawVehiculo && ordenMatch) {
    const fullMatchedStr = ordenMatch[0];
    const indexAfterOrden = text.indexOf(fullMatchedStr) + fullMatchedStr.length;
    const remainingLine = text.substring(indexAfterOrden).split('\n')[0].trim();
    if (remainingLine) {
      rawVehiculo = remainingLine.replace(/^[•#\s\d*️⃣]+/, '').replace(/^[:\s•]+/, '').trim();
    }
  }

  let ordenFormatted = rawOrden;
  if (rawOrden && /^\d+$/.test(rawOrden)) {
    ordenFormatted = `OT-${rawOrden}`;
  } else if (rawOrden && !rawOrden.toUpperCase().startsWith('OT')) {
    ordenFormatted = `OT-${rawOrden.toUpperCase()}`;
  }

  if (!rawVehiculo && text.includes('\n')) {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const nonOrdenLine = lines.find(l => !l.match(/orden|ot|nro/i));
    if (nonOrdenLine) {
      rawVehiculo = nonOrdenLine.replace(/^[•#\s\d*️⃣]+/, '').trim();
    }
  }

  const topicTitle = ordenFormatted && rawVehiculo 
    ? `🚗 ${ordenFormatted} ${rawVehiculo}`
    : (ordenFormatted ? `🚗 ${ordenFormatted}` : (rawVehiculo ? `🚗 ${rawVehiculo}` : '🚗 General'));

  return {
    orden: ordenFormatted || undefined,
    vehiculo: rawVehiculo || undefined,
    topicTitle
  };
}

export async function processIntakeValidation(ctx: Context, text: string): Promise<boolean> {
  const userId = ctx.from?.id;
  if (userId) {
    for (const [id, pending] of pendingIntakes.entries()) {
      if (pending.userId === userId && pending.state === 'AWAITING_MANUAL_ORDEN') {
        const ordenManualInput = text.trim();
        const ordenFormatted = /^\d+$/.test(ordenManualInput) ? `OT-${ordenManualInput}` : ordenManualInput.toUpperCase();
        await finalizeIntakeCreation(ctx, pending, ordenFormatted);
        pendingIntakes.delete(id);
        return true;
      }
    }
  }

  const parsed = extractOrderAndVehicle(text);

  if (!parsed.vehiculo && !parsed.orden) {
    return false;
  }

  if (parsed.orden && parsed.vehiculo) {
    await processIntakeDirect(ctx, parsed.orden, parsed.vehiculo, parsed.topicTitle);
    return true;
  } else if (parsed.vehiculo && !parsed.orden) {
    const pendingId = `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    if (ctx.from?.id && ctx.chat?.id) {
      pendingIntakes.set(pendingId, {
        id: pendingId,
        vehiculo: parsed.vehiculo,
        originalText: text,
        userId: ctx.from.id,
        chatId: ctx.chat.id,
        state: 'AWAITING_CHOICE',
        createdAt: Date.now()
      });
    }

    await ctx.reply(
      `⚠️ *DATOS INCOMPLETOS EN EL INGRESO*\n\n🚘 *Vehículo detectado:* \`${parsed.vehiculo}\`\n❌ *Falta:* Número de Orden / OT.\n\nPor favor selecciona una opción para continuar:`,
      {
        parse_mode: 'Markdown',
        reply_parameters: ctx.message?.message_id ? { message_id: ctx.message.message_id } : undefined,
        ...Markup.inlineKeyboard([
          [Markup.button.callback('✍️ Ingresar Orden Manual', `INTAKE_MANUAL:${pendingId}`)],
          [Markup.button.callback('⚡ Registrar sin Orden (Temporal)', `INTAKE_TEMP:${pendingId}`)],
          [Markup.button.callback('❌ Cancelar Registro', `INTAKE_CANCEL:${pendingId}`)]
        ])
      }
    );
    return true;
  }

  return false;
}

// Verifica si la orden ya existe antes de crear un nuevo Tema en la Nube
async function processIntakeDirect(ctx: Context, orden: string, vehiculo: string, topicTitle: string) {
  const nubeForumId = FORUM_THREADS.TALLER_FORO_DESTINO_ID; // -1003975478850 (Nube)
  const operacionesGroup = FORUM_THREADS.TALLER_ORIGEN_ID; // -1003940815012 (Operaciones)

  try {
    // 1. VERIFICACIÓN ANTI-DUPLICADOS: Consultar en Memoria / JSON / Supabase si ya existe el Hilo
    const existingThreadId = await findExistingThreadId(orden, vehiculo, topicTitle);

    let threadId: number;

    if (existingThreadId) {
      console.log(`[AntiDuplicados] Hilo existente reutilizado para '${topicTitle}': Thread ID ${existingThreadId}`);
      threadId = existingThreadId;
    } else {
      // Si NO existe, crear el Hilo en la Nube (-1003975478850)
      const newTopic = await ctx.telegram.createForumTopic(nubeForumId, topicTitle);
      threadId = newTopic.message_thread_id;

      // Guardar inmediatamente en el almacenamiento híbrido
      await saveVehicleTopic(threadId, topicTitle, orden, vehiculo);
    }

    // Mensaje dentro del Tema en NUBE
    await ctx.telegram.sendMessage(
      nubeForumId,
      `📋 *Expediente de Ingreso Registrado*\n\n🚘 *Vehículo:* ${vehiculo}\n🆔 *Orden:* ${orden}\n⏱️ *Estado:* Tema activo en la Nube.`,
      { message_thread_id: threadId, parse_mode: 'Markdown' }
    );

    // Notificación en Operaciones # General
    const notificationText = `☁️ *NUBE - Ingreso Registrado*\n\n✅ *Tema en la Nube:* "${topicTitle}"\n🆔 *Hilo ID Nube:* \`${threadId}\``;
    await sendNotificationWithFallback(ctx, operacionesGroup, notificationText);

    await ctx.reply(`✅ *Ingreso Registrado:* "${topicTitle}"`, { parse_mode: 'Markdown' });

  } catch (err: any) {
    console.error('Error al procesar ingreso:', err);
    await ctx.reply(`❌ *Error al registrar ingreso:* ${err.message || 'Verifica permisos del bot.'}`, { parse_mode: 'Markdown' });
  }
}

async function finalizeIntakeCreation(ctx: Context, pending: PendingIntake, orden: string) {
  const topicTitle = `🚗 ${orden} ${pending.vehiculo}`;
  const nubeForumId = FORUM_THREADS.TALLER_FORO_DESTINO_ID; // -1003975478850
  const operacionesGroup = FORUM_THREADS.TALLER_ORIGEN_ID; // -1003940815012

  try {
    const existingThreadId = await findExistingThreadId(orden, pending.vehiculo, topicTitle);

    let threadId: number;
    if (existingThreadId) {
      threadId = existingThreadId;
    } else {
      const newTopic = await ctx.telegram.createForumTopic(nubeForumId, topicTitle);
      threadId = newTopic.message_thread_id;
      await saveVehicleTopic(threadId, topicTitle, orden, pending.vehiculo);
    }

    await ctx.telegram.sendMessage(
      nubeForumId,
      `📋 *Expediente de Ingreso Registrado*\n\n🚘 *Vehículo:* ${pending.vehiculo}\n🆔 *Orden:* ${orden}\n⏱️ *Estado:* Tema activo en la Nube.`,
      { message_thread_id: threadId, parse_mode: 'Markdown' }
    );

    const notificationText = `☁️ *NUBE - Ingreso Procesado*\n\n✅ *Tema en la Nube:* "${topicTitle}"\n🆔 *Hilo ID Nube:* \`${threadId}\``;
    await sendNotificationWithFallback(ctx, operacionesGroup, notificationText);

    await ctx.reply(`✅ *¡Registro Completado con éxito!*\n\n📌 *Tema en Nube:* "${topicTitle}"`, { parse_mode: 'Markdown' });

  } catch (err: any) {
    console.error('Error en finalizeIntakeCreation:', err);
    await ctx.reply(`❌ *Error al registrar el expediente:* ${err.message || 'Verifica permisos.'}`, { parse_mode: 'Markdown' });
  }
}

async function sendNotificationWithFallback(ctx: Context, chatId: number, text: string) {
  try {
    await ctx.telegram.sendMessage(chatId, text, { message_thread_id: 1, parse_mode: 'Markdown' });
  } catch (err: any) {
    try {
      await ctx.telegram.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('Error enviando notificación con fallback:', e);
    }
  }
}

export function registerIntakeActionHandlers(bot: any) {
  bot.action(/^INTAKE_MANUAL:(.+)$/, async (ctx: any) => {
    await ctx.answerCbQuery();
    const pendingId = ctx.match[1];
    const pending = pendingIntakes.get(pendingId);

    if (!pending) {
      return ctx.reply('⚠️ Esta solicitud expiró o ya fue procesada.');
    }

    pending.state = 'AWAITING_MANUAL_ORDEN';
    await ctx.reply(
      `✍️ *Por favor responde escribiendo únicamente el número de Orden o número de OT para el vehículo:* \`${pending.vehiculo}\``,
      { parse_mode: 'Markdown' }
    );
  });

  bot.action(/^INTAKE_TEMP:(.+)$/, async (ctx: any) => {
    await ctx.answerCbQuery();
    const pendingId = ctx.match[1];
    const pending = pendingIntakes.get(pendingId);

    if (!pending) {
      return ctx.reply('⚠️ Esta solicitud expiró o ya fue procesada.');
    }

    const tempOrden = `OT-TEMP-${Math.floor(1000 + Math.random() * 9000)}`;
    await finalizeIntakeCreation(ctx, pending, tempOrden);
    pendingIntakes.delete(pendingId);
  });

  bot.action(/^INTAKE_CANCEL:(.+)$/, async (ctx: any) => {
    await ctx.answerCbQuery();
    const pendingId = ctx.match[1];
    pendingIntakes.delete(pendingId);

    try {
      await ctx.editMessageText('❌ *Solicitud de Registro Cancelada.*', { parse_mode: 'Markdown' });
    } catch (e) {
      await ctx.reply('❌ *Solicitud de Registro Cancelada.*', { parse_mode: 'Markdown' });
    }
  });
}
