import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { FORUM_THREADS } from '../constants';
import { supabase } from '../supabase';

interface PendingIntake {
  id: string;
  vehiculo: string;
  originalText: string;
  userId: number;
  chatId: number;
  state: 'AWAITING_CHOICE' | 'AWAITING_MANUAL_ORDEN';
  createdAt: number;
}

// Almacenamiento en memoria para las solicitudes en pausa
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

export async function processIntakeValidation(ctx: Context, text: string): Promise<boolean> {
  // 1. Verificar si el usuario está respondiendo a una orden manual pendiente
  const userId = ctx.from?.id;
  if (userId) {
    for (const [id, pending] of pendingIntakes.entries()) {
      if (pending.userId === userId && pending.state === 'AWAITING_MANUAL_ORDEN') {
        const ordenManual = text.trim();
        await finalizeIntakeCreation(ctx, pending, ordenManual);
        pendingIntakes.delete(id);
        return true;
      }
    }
  }

  // 2. Condición de Activación: Debe contener "Vehículo:" o "Vehiculo:"
  const vehiculoMatch = text.match(/veh[íi]culo:\s*([^\n]+)/i);
  if (!vehiculoMatch) return false;

  const vehiculoTexto = vehiculoMatch[1].trim();

  // 3. Evaluación de Datos: Verificar si incluye "Orden:" u "OT:"
  const ordenMatch = text.match(/(?:orden|#?ot):\s*([^\n]+)/i);

  if (ordenMatch && ordenMatch[1].trim()) {
    // CASO A: VIENE COMPLETO
    const ordenTexto = ordenMatch[1].trim();
    await createIntakeTopicDirect(ctx, ordenTexto, vehiculoTexto);
    return true;
  } else {
    // CASO B: FALTA LA ORDEN (Mostrar menú de alerta e iteración)
    const pendingId = `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    if (ctx.from?.id && ctx.chat?.id) {
      pendingIntakes.set(pendingId, {
        id: pendingId,
        vehiculo: vehiculoTexto,
        originalText: text,
        userId: ctx.from.id,
        chatId: ctx.chat.id,
        state: 'AWAITING_CHOICE',
        createdAt: Date.now()
      });
    }

    await ctx.reply(
      `⚠️ *DATOS INCOMPLETOS EN EL INGRESO*\n\n🚘 *Vehículo detectado:* \`${vehiculoTexto}\`\n❌ *Falta:* Número de Orden / OT.\n\nPor favor selecciona una opción para continuar con el registro:`,
      {
        parse_mode: 'Markdown',
        reply_parameters: ctx.message?.message_id ? { message_id: ctx.message.message_id } : undefined,
        ...Markup.inlineKeyboard([
          [Markup.button.callback('✍️ Ingresar Orden Manual', `INTAKE_MANUAL:${pendingId}`)],
          [Markup.button.callback('⚡ Crear sin Orden (Temporal)', `INTAKE_TEMP:${pendingId}`)],
          [Markup.button.callback('❌ Cancelar Registro', `INTAKE_CANCEL:${pendingId}`)]
        ])
      }
    );
    return true;
  }
}

// ----------------------------------------------------
// CREACIÓN DIRECTA (CASO COMPLETO)
// ----------------------------------------------------
async function createIntakeTopicDirect(ctx: Context, orden: string, vehiculo: string) {
  const topicTitle = `🚗 ${orden} ${vehiculo}`;
  const targetForumId = FORUM_THREADS.TALLER_FORO_DESTINO_ID; // -1003975478850
  const notificationId = FORUM_THREADS.TALLER_ORIGEN_ID;      // -1003940815012

  try {
    // Crear Tema en NUBE (-1003975478850)
    const newTopic = await ctx.telegram.createForumTopic(targetForumId, topicTitle);
    const threadId = newTopic.message_thread_id;

    // Guardar en BD
    try {
      await supabase.from('vehicle_topics').insert([{ identifier: topicTitle, thread_id: threadId }]);
    } catch (e) {}

    // Mensaje dentro del nuevo Tema en NUBE
    await ctx.telegram.sendMessage(
      targetForumId,
      `📋 *Expediente de Ingreso Registrado*\n\n🚘 *Vehículo:* ${vehiculo}\n🆔 *Orden:* ${orden}\n⏱️ *Estado:* Tema activo en la Nube.`,
      { message_thread_id: threadId, parse_mode: 'Markdown' }
    );

    // Mensaje de Notificación en Operaciones (-1003940815012)
    await ctx.telegram.sendMessage(
      notificationId,
      `📢 *Nuevo Ingreso Validado*\n\n✅ *Tema Creado:* "${topicTitle}"\n📍 *Ubicación:* Grupo Nube (\`-1003975478850\`)\n🆔 *Hilo:* \`${threadId}\``,
      { parse_mode: 'Markdown' }
    );

    await ctx.reply(`✅ *Ingreso Validado y Tema Creado:* "${topicTitle}"`, { parse_mode: 'Markdown' });

  } catch (err: any) {
    console.error('Error al crear tema automático:', err);
    await ctx.reply(`❌ *Error creando el tema:* ${err.message || 'Verifica permisos del bot.'}`, { parse_mode: 'Markdown' });
  }
}

// ----------------------------------------------------
// FINALIZAR CREACIÓN DESDE RESPUESTA MANUAL O TEMPORAL
// ----------------------------------------------------
async function finalizeIntakeCreation(ctx: Context, pending: PendingIntake, orden: string) {
  const topicTitle = `🚗 ${orden} ${pending.vehiculo}`;
  const targetForumId = FORUM_THREADS.TALLER_FORO_DESTINO_ID; // -1003975478850
  const notificationId = FORUM_THREADS.TALLER_ORIGEN_ID;      // -1003940815012

  try {
    const newTopic = await ctx.telegram.createForumTopic(targetForumId, topicTitle);
    const threadId = newTopic.message_thread_id;

    try {
      await supabase.from('vehicle_topics').insert([{ identifier: topicTitle, thread_id: threadId }]);
    } catch (e) {}

    await ctx.telegram.sendMessage(
      targetForumId,
      `📋 *Expediente de Ingreso Registrado*\n\n🚘 *Vehículo:* ${pending.vehiculo}\n🆔 *Orden:* ${orden}\n⏱️ *Estado:* Tema activo en la Nube.`,
      { message_thread_id: threadId, parse_mode: 'Markdown' }
    );

    await ctx.telegram.sendMessage(
      notificationId,
      `📢 *Nuevo Ingreso Procesado*\n\n✅ *Tema Creado:* "${topicTitle}"\n📍 *Ubicación:* Grupo Nube (\`-1003975478850\`)\n🆔 *Hilo:* \`${threadId}\``,
      { parse_mode: 'Markdown' }
    );

    await ctx.reply(`✅ *¡Registro Completado con éxito!*\n\n📌 *Tema Creado:* "${topicTitle}"\n🆔 *Hilo Nube:* \`${threadId}\``, { parse_mode: 'Markdown' });

  } catch (err: any) {
    console.error('Error en finalizeIntakeCreation:', err);
    await ctx.reply(`❌ *Error al crear el tema:* ${err.message || 'Verifica permisos.'}`, { parse_mode: 'Markdown' });
  }
}

// ----------------------------------------------------
// MANEJADORES DE ACCIONES DE LOS BOTONES
// ----------------------------------------------------
export function registerIntakeActionHandlers(bot: any) {
  // Botón 1: Ingresar Orden Manual
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

  // Botón 2: Crear sin Orden (Temporal)
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

  // Botón 3: Cancelar Registro
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
