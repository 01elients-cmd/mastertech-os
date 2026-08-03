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
      // Limpiar texto largo o comentarios adicionales
      const cleanLine = remainingLine.replace(/^[•#\s\d*️⃣]+/, '').replace(/^[:\s•]+/, '').trim();
      if (cleanLine.length < 35) {
        rawVehiculo = cleanLine;
      }
    }
  }

  let ordenFormatted = rawOrden;
  if (rawOrden && /^\d+$/.test(rawOrden)) {
    ordenFormatted = `OT-${rawOrden}`;
  } else if (rawOrden && !rawOrden.toUpperCase().startsWith('OT')) {
    ordenFormatted = `OT-${rawOrden.toUpperCase()}`;
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

/**
 * Validador de mensajes: NO crea temas automáticos en el chat.
 * Si detecta una orden existente en BD, registra la información.
 * Si es una orden nueva, solicita confirmación explícita mediante un botón antes de crear un tema.
 */
export async function processIntakeValidation(ctx: Context, text: string): Promise<boolean> {
  const userId = ctx.from?.id;
  if (userId) {
    for (const [id, pending] of pendingIntakes.entries()) {
      if (pending.userId === userId && pending.state === 'AWAITING_MANUAL_ORDEN') {
        const ordenManualInput = text.trim();
        const ordenFormatted = /^\d+$/.test(ordenManualInput) ? `OT-${ordenManualInput}` : ordenManualInput.toUpperCase();
        await createIntakeTopicDirect(ctx, ordenFormatted, pending.vehiculo, `🚗 ${ordenFormatted} ${pending.vehiculo}`);
        pendingIntakes.delete(id);
        return true;
      }
    }
  }

  const parsed = extractOrderAndVehicle(text);

  if (!parsed.orden && !parsed.vehiculo) {
    return false;
  }

  // Verificar si la orden ya existe en el sistema
  const existingThreadId = await findExistingThreadId(parsed.orden, parsed.vehiculo, parsed.topicTitle);
  if (existingThreadId) {
    // Si ya existe, NO crea un tema nuevo; simplemente registra la evidencia en el hilo existente
    console.log(`[IntakeValidator] Orden ${parsed.orden} ya existe en Hilo ID: ${existingThreadId}`);
    return false;
  }

  // Si la orden NO existe, pedir confirmación manual con botón (Evita creación automática descontrolada)
  if (parsed.orden) {
    const pendingId = `confirm_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    if (ctx.from?.id && ctx.chat?.id) {
      pendingIntakes.set(pendingId, {
        id: pendingId,
        vehiculo: parsed.vehiculo || 'Vehículo',
        originalText: text,
        userId: ctx.from.id,
        chatId: ctx.chat.id,
        state: 'AWAITING_CHOICE',
        createdAt: Date.now()
      });
    }

    await ctx.reply(
      `📌 *DETECCIÓN DE ORDEN DE SERVICIO*\n\n🆔 *Orden:* \`${parsed.orden}\`\n🚘 *Vehículo:* \`${parsed.vehiculo || 'Sin especificar'}\`\n\n¿Deseas crear un nuevo Hilo/Topic para este vehículo en la Nube?`,
      {
        parse_mode: 'Markdown',
        reply_parameters: ctx.message?.message_id ? { message_id: ctx.message.message_id } : undefined,
        ...Markup.inlineKeyboard([
          [Markup.button.callback(`➕ Confirmar Creación: ${parsed.orden}`, `CONFIRM_CREATE:${pendingId}`)],
          [Markup.button.callback('✍️ Editar Orden / Vehículo', `INTAKE_MANUAL:${pendingId}`)],
          [Markup.button.callback('❌ Omitir (No Crear)', `INTAKE_CANCEL:${pendingId}`)]
        ])
      }
    );
    return true;
  }

  return false;
}

// Crea explícitamente el Topic en la Nube sólo cuando el usuario lo confirma
export async function createIntakeTopicDirect(ctx: Context, orden: string, vehiculo: string, topicTitle: string) {
  const nubeForumId = FORUM_THREADS.TALLER_FORO_DESTINO_ID; // -1003975478850 (Nube)
  const operacionesGroup = FORUM_THREADS.TALLER_ORIGEN_ID; // -1003940815012 (Operaciones)

  try {
    const existingThreadId = await findExistingThreadId(orden, vehiculo, topicTitle);

    let threadId: number;
    if (existingThreadId) {
      threadId = existingThreadId;
    } else {
      const newTopic = await ctx.telegram.createForumTopic(nubeForumId, topicTitle);
      threadId = newTopic.message_thread_id;
      await saveVehicleTopic(threadId, topicTitle, orden, vehiculo);
    }

    await ctx.telegram.sendMessage(
      nubeForumId,
      `📋 *Expediente de Ingreso Registrado*\n\n🚘 *Vehículo:* ${vehiculo}\n🆔 *Orden:* ${orden}\n⏱️ *Estado:* Tema activo en la Nube.`,
      { message_thread_id: threadId, parse_mode: 'Markdown' }
    );

    const notificationText = `☁️ *NUBE - Nuevo Hilo Creado*\n\n✅ *Tema en la Nube:* "${topicTitle}"\n🆔 *Hilo ID Nube:* \`${threadId}\``;
    await sendNotificationWithFallback(ctx, operacionesGroup, notificationText);

    await ctx.reply(`✅ *Tema creado con éxito en la Nube:* "${topicTitle}"`, { parse_mode: 'Markdown' });

  } catch (err: any) {
    console.error('Error al crear tema:', err);
    await ctx.reply(`❌ *Error al crear el tema:* ${err.message || 'Verifica permisos del bot.'}`, { parse_mode: 'Markdown' });
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
  // Confirmar creación manual por botón
  bot.action(/^CONFIRM_CREATE:(.+)$/, async (ctx: any) => {
    await ctx.answerCbQuery();
    const pendingId = ctx.match[1];
    const pending = pendingIntakes.get(pendingId);

    if (!pending) {
      return ctx.reply('⚠️ Esta solicitud expiró o ya fue procesada.');
    }

    const parsed = extractOrderAndVehicle(pending.originalText);
    await createIntakeTopicDirect(ctx, parsed.orden || 'OT-NUEVO', pending.vehiculo, parsed.topicTitle);
    pendingIntakes.delete(pendingId);
  });

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

  bot.action(/^INTAKE_CANCEL:(.+)$/, async (ctx: any) => {
    await ctx.answerCbQuery();
    const pendingId = ctx.match[1];
    pendingIntakes.delete(pendingId);

    try {
      await ctx.editMessageText('❌ *Creación de Hilo Omitida.*', { parse_mode: 'Markdown' });
    } catch (e) {
      await ctx.reply('❌ *Creación de Hilo Omitida.*', { parse_mode: 'Markdown' });
    }
  });
}
