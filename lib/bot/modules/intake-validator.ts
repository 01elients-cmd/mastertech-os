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

export function extractOrderAndVehicle(text: string): { 
  orden?: string; 
  vehiculo?: string; 
  vin?: string; 
  placa?: string; 
  topicTitle: string 
} {
  // Extraer VIN (17 caracteres alfanuméricos o patrón VIN: XXXXXX)
  const vinMatch = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i) || text.match(/(?:vin|chasis)[:\s•]*([a-z0-9]{6,17})/i);
  const rawVin = vinMatch ? vinMatch[1].trim().toUpperCase() : undefined;

  // Extraer Placa / Patente
  const placaMatch = text.match(/(?:placa|patente)[:\s•]*([a-z0-9-]+)/i);
  const rawPlaca = placaMatch ? placaMatch[1].trim().toUpperCase() : undefined;

  // Extraer Número de Orden / OT
  const ordenMatch = text.match(/(?:#?\b(?:orden(?:\s+de\s+(?:servicio|trabajo))?|nro(?:\s+de)?\s+orden|ot)\b[:\s#•]*)([a-z0-9-]+)/i);
  let rawOrden = ordenMatch ? ordenMatch[1].trim() : '';
  rawOrden = rawOrden.replace(/^[^a-z0-9]+/i, '').trim();

  if (!rawOrden) {
    const standaloneNumMatch = text.match(/\b([0-9]{3,6})\b/);
    if (standaloneNumMatch) {
      rawOrden = standaloneNumMatch[1];
    }
  }

  // Extraer Vehículo
  const vehiculoMatch = text.match(/(?:veh[íi]culo|auto|carro)[:\s•]*([^\n•]+)/i);
  let rawVehiculo = vehiculoMatch ? vehiculoMatch[1].trim() : '';

  if (!rawVehiculo && ordenMatch) {
    const fullMatchedStr = ordenMatch[0];
    const indexAfterOrden = text.indexOf(fullMatchedStr) + fullMatchedStr.length;
    const remainingLine = text.substring(indexAfterOrden).split('\n')[0].trim();
    if (remainingLine) {
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

  let vinTag = rawVin ? ` [VIN: ...${rawVin.slice(-6)}]` : '';
  let placaTag = rawPlaca ? ` (${rawPlaca})` : '';

  const topicTitle = ordenFormatted && rawVehiculo 
    ? `🚗 ${ordenFormatted}${placaTag}${vinTag} ${rawVehiculo}`
    : (ordenFormatted ? `🚗 ${ordenFormatted}${placaTag}${vinTag}` : (rawVehiculo ? `🚗 ${rawVehiculo}${placaTag}${vinTag}` : '🚗 General'));

  return {
    orden: ordenFormatted || undefined,
    vehiculo: rawVehiculo || undefined,
    vin: rawVin,
    placa: rawPlaca,
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

  if (!parsed.orden && !parsed.vehiculo && !parsed.vin) {
    return false;
  }

  // Verificar si la orden, VIN o vehículo ya existe en el sistema
  const existingThreadId = await findExistingThreadId(parsed.orden, parsed.vehiculo, parsed.topicTitle, parsed.vin, parsed.placa);
  if (existingThreadId) {
    console.log(`[IntakeValidator] Vehículo/Orden ${parsed.orden || parsed.vin} ya existe en Hilo ID: ${existingThreadId}`);
    return false;
  }

  // Si no existe, pedir confirmación manual con botón
  if (parsed.orden || parsed.vin) {
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

    const idLabel = parsed.orden ? `Orden: ${parsed.orden}` : `VIN: ...${parsed.vin?.slice(-6)}`;

    await ctx.reply(
      `📌 *DETECCIÓN DE VEHÍCULO / ORDEN*\n\n🆔 *Identificador:* \`${idLabel}\`\n🚘 *Vehículo:* \`${parsed.vehiculo || 'Sin especificar'}\`\n\n¿Deseas crear un nuevo Hilo/Topic para este vehículo en la Nube?`,
      {
        parse_mode: 'Markdown',
        reply_parameters: ctx.message?.message_id ? { message_id: ctx.message.message_id } : undefined,
        ...Markup.inlineKeyboard([
          [Markup.button.callback(`➕ Confirmar Creación`, `CONFIRM_CREATE:${pendingId}`)],
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
export async function createIntakeTopicDirect(
  ctx: Context, 
  orden: string, 
  vehiculo: string, 
  topicTitle: string,
  vin?: string,
  placa?: string
) {
  const nubeForumId = FORUM_THREADS.TALLER_FORO_DESTINO_ID; // -1003975478850 (Nube)
  const operacionesGroup = FORUM_THREADS.TALLER_ORIGEN_ID; // -1003940815012 (Operaciones)

  try {
    const existingThreadId = await findExistingThreadId(orden, vehiculo, topicTitle, vin, placa);

    let threadId: number;
    if (existingThreadId) {
      threadId = existingThreadId;
    } else {
      const newTopic = await ctx.telegram.createForumTopic(nubeForumId, topicTitle);
      threadId = newTopic.message_thread_id;
      await saveVehicleTopic(threadId, topicTitle, orden, vehiculo, vin, placa);
    }

    await ctx.telegram.sendMessage(
      nubeForumId,
      `📋 *Expediente de Ingreso Registrado*\n\n🚘 *Vehículo:* ${vehiculo}\n🆔 *Orden/ID:* ${orden || vin}\n⏱️ *Estado:* Tema activo en la Nube.`,
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
  bot.action(/^CONFIRM_CREATE:(.+)$/, async (ctx: any) => {
    await ctx.answerCbQuery();
    const pendingId = ctx.match[1];
    const pending = pendingIntakes.get(pendingId);

    if (!pending) {
      return ctx.reply('⚠️ Esta solicitud expiró o ya fue procesada.');
    }

    const parsed = extractOrderAndVehicle(pending.originalText);
    await createIntakeTopicDirect(
      ctx, 
      parsed.orden || 'OT-NUEVO', 
      pending.vehiculo, 
      parsed.topicTitle, 
      parsed.vin, 
      parsed.placa
    );
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
      `✍️ *Por favor responde escribiendo el número de Orden, Placa o VIN para el vehículo:* \`${pending.vehiculo}\``,
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
