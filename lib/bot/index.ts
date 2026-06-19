import { Telegraf, Markup } from 'telegraf';
import { FORUM_THREADS, CALLBACKS } from './constants';
import { SOPS } from '../templates/sops';
import { supabase } from './supabase';

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// ==========================================
// 1. LISTENERS DE COMANDOS POR HILOS
// ==========================================

bot.command('getid', (ctx) => {
  const threadId = ctx.message.message_thread_id;
  ctx.reply(`El ID de este hilo es: ${threadId || 'No es un hilo/Topic'}`);
});

bot.command('jornada', async (ctx) => {
  await ctx.reply('⏱️ *Control de Jornada de Trabajo*', {
    parse_mode: 'Markdown',
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🟢 Iniciar Jornada', CALLBACKS.JORNADA_INICIAR)],
      [Markup.button.callback('🔴 Finalizar Jornada', CALLBACKS.JORNADA_FINALIZAR)]
    ])
  });
});

bot.command('recepcion', async (ctx) => {
  if (ctx.message.message_thread_id !== FORUM_THREADS.RECEPCION) return;

  await ctx.reply('👋 Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      Markup.button.callback('🚗 REPORTE...', CALLBACKS.NUEVO_INGRESO)
    ])
  });
});

bot.command('repuestos', async (ctx) => {
  if (ctx.message.message_thread_id !== FORUM_THREADS.REPUESTOS) return;

  await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('📦 SOLICITUD', CALLBACKS.SOLICITUD_REPUESTO),
        Markup.button.callback('📄 COTIZACIÓN', CALLBACKS.COTIZACION_REPUESTO)
      ]
    ])
  });
});

bot.command('operacion', async (ctx) => {
  if (ctx.message.message_thread_id !== FORUM_THREADS.OPERACIONES) return;

  await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔧 Nuevos Hallazgos', CALLBACKS.NUEVOS_HALLAZGOS)],
      [Markup.button.callback('⚡ Listo/Parcial', CALLBACKS.LISTO_PARCIAL)],
      [Markup.button.callback('💰 Estatus', CALLBACKS.ESTATUS_OP)]
    ])
  });
});

bot.command('garantia', async (ctx) => {
  if (ctx.message.message_thread_id !== FORUM_THREADS.GARANTIAS) return;

  await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('🧧 GARANTÍA', CALLBACKS.GARANTIA_REINGRESO),
        Markup.button.callback('⚠️ RETRABAJO', CALLBACKS.GARANTIA_RETRABAJO)
      ]
    ])
  });
});

bot.command('pendientes', async (ctx) => {
  if (ctx.message.message_thread_id !== FORUM_THREADS.PENDIENTES) return;

  await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      [Markup.button.callback('⚙️ CONTROL DE POST-VENTA Y LOGÍSTICA', CALLBACKS.PENDIENTES_POSTVENTA)],
      [Markup.button.callback('📞 SEGUIMIENTO DE LLAMADAS Y CITA', CALLBACKS.PENDIENTES_SEGUIMIENTO)]
    ])
  });
});

bot.command('incidencias', async (ctx) => {
  if (ctx.message.message_thread_id !== FORUM_THREADS.INCIDENCIAS) return;

  await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🔴 1. Reporte (Apertura)', CALLBACKS.INCIDENCIA_APERTURA)],
      [Markup.button.callback('🟢 2. Resolución (Cierre)', CALLBACKS.INCIDENCIA_CIERRE)]
    ])
  });
});

bot.command('calidad', async (ctx) => {
  if (ctx.message.message_thread_id !== FORUM_THREADS.CALIDAD) return;

  await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      Markup.button.callback('📋 FORMATO QC', CALLBACKS.FORMATO_QC)
    ])
  });
});

bot.command('inspeccion', async (ctx) => {
  if (ctx.message.message_thread_id !== FORUM_THREADS.INSPECCION) return;

  await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      Markup.button.callback('🔍 Linea Inspeccion', CALLBACKS.LINEA_INSPECCION)
    ])
  });
});

bot.command('mejora', async (ctx) => {
  if (ctx.message.message_thread_id !== FORUM_THREADS.MEJORA) return;

  await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      [Markup.button.callback('💡 Propuesta de Mejora (Apertura)', CALLBACKS.MEJORA_APERTURA)],
      [Markup.button.callback('🚀 Implementación y Resultado (Cierre)', CALLBACKS.MEJORA_CIERRE)]
    ])
  });
});

// ==========================================
// 2. MANEJADOR DE ACCIONES (BOTONES)
// ==========================================

const replyInThread = async (ctx: any, template: string) => {
  await ctx.answerCbQuery();
  const threadId = ctx.callbackQuery.message?.message_thread_id;
  await ctx.reply(template, { 
    parse_mode: 'HTML', // Cambiado a HTML para evitar problemas con Markdown
    message_thread_id: threadId 
  });
};

// Vinculación de botones con sus plantillas
bot.action(CALLBACKS.NUEVO_INGRESO, (ctx) => replyInThread(ctx, SOPS.NUEVO_INGRESO));

bot.action(CALLBACKS.SOLICITUD_REPUESTO, (ctx) => replyInThread(ctx, SOPS.SOLICITUD_REPUESTO));
bot.action(CALLBACKS.COTIZACION_REPUESTO, (ctx) => replyInThread(ctx, SOPS.COTIZACION_REPUESTO));

bot.action(CALLBACKS.NUEVOS_HALLAZGOS, (ctx) => replyInThread(ctx, SOPS.NUEVOS_HALLAZGOS));
bot.action(CALLBACKS.LISTO_PARCIAL, (ctx) => replyInThread(ctx, SOPS.LISTO_PARCIAL));
bot.action(CALLBACKS.ESTATUS_OP, (ctx) => replyInThread(ctx, SOPS.ESTATUS_OP));

bot.action(CALLBACKS.GARANTIA_REINGRESO, (ctx) => replyInThread(ctx, SOPS.GARANTIA_REINGRESO));
bot.action(CALLBACKS.GARANTIA_RETRABAJO, (ctx) => replyInThread(ctx, SOPS.GARANTIA_RETRABAJO));

bot.action(CALLBACKS.PENDIENTES_POSTVENTA, (ctx) => replyInThread(ctx, SOPS.PENDIENTES_POSTVENTA));
bot.action(CALLBACKS.PENDIENTES_SEGUIMIENTO, (ctx) => replyInThread(ctx, SOPS.PENDIENTES_SEGUIMIENTO));

bot.action(CALLBACKS.INCIDENCIA_APERTURA, (ctx) => replyInThread(ctx, SOPS.INCIDENCIA_APERTURA));
bot.action(CALLBACKS.INCIDENCIA_CIERRE, (ctx) => replyInThread(ctx, SOPS.INCIDENCIA_CIERRE));

bot.action(CALLBACKS.FORMATO_QC, (ctx) => replyInThread(ctx, SOPS.CONTROL_CALIDAD));

bot.action(CALLBACKS.LINEA_INSPECCION, (ctx) => replyInThread(ctx, SOPS.LINEA_INSPECCION));

bot.action(CALLBACKS.MEJORA_APERTURA, (ctx) => replyInThread(ctx, SOPS.MEJORA_APERTURA));
bot.action(CALLBACKS.MEJORA_CIERRE, (ctx) => replyInThread(ctx, SOPS.MEJORA_CIERRE));

// Acciones de Jornada
bot.action(CALLBACKS.JORNADA_INICIAR, async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  const username = ctx.from?.first_name || 'Técnico';
  
  if (!userId) return;

  // Verificar si ya tiene una jornada activa
  const { data: activeJornada } = await supabase
    .from('jornadas')
    .select('*')
    .eq('telegram_id', userId)
    .eq('status', 'ACTIVO')
    .single();

  if (activeJornada) {
    return ctx.reply(`⚠️ ${username}, ya tienes una jornada iniciada desde las ${new Date(activeJornada.started_at).toLocaleTimeString('es-VE')}.`);
  }

  // Insertar nueva jornada
  const { error } = await supabase
    .from('jornadas')
    .insert([{ telegram_id: userId, username, status: 'ACTIVO' }]);

  if (error) {
    console.error(error);
    return ctx.reply('❌ Hubo un error al iniciar tu jornada. Por favor avisa a soporte.');
  }

  const time = new Date().toLocaleTimeString('es-VE');
  ctx.reply(`✅ *Jornada iniciada* con éxito a las ${time}.\n¡Que tengas un excelente turno, ${username}!`, { parse_mode: 'Markdown' });
});

bot.action(CALLBACKS.JORNADA_FINALIZAR, async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from?.id;
  const username = ctx.from?.first_name || 'Técnico';
  
  if (!userId) return;

  // Buscar jornada activa
  const { data: activeJornada } = await supabase
    .from('jornadas')
    .select('*')
    .eq('telegram_id', userId)
    .eq('status', 'ACTIVO')
    .single();

  if (!activeJornada) {
    return ctx.reply(`⚠️ ${username}, no tienes ninguna jornada activa. Usa "Iniciar Jornada" primero.`);
  }

  const now = new Date();
  
  // Actualizar la jornada a finalizada
  const { error } = await supabase
    .from('jornadas')
    .update({ ended_at: now.toISOString(), status: 'FINALIZADO' })
    .eq('id', activeJornada.id);

  if (error) {
    return ctx.reply('❌ Hubo un error al finalizar tu jornada. Por favor avisa a soporte.');
  }

  const startTime = new Date(activeJornada.started_at);
  const diffMs = now.getTime() - startTime.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  ctx.reply(`🛑 *Jornada finalizada*.\n\n👤 *Técnico:* ${username}\n⏱️ *Tiempo trabajado:* ${diffHrs} horas y ${diffMins} minutos.\n\n¡Buen trabajo hoy! Descansa.`, { parse_mode: 'Markdown' });
});

// ==========================================
// 3. MANEJO DE MEDIOS (RÁFAGAS DE FOTOS/VIDEOS)
// ==========================================

bot.on(['photo', 'video', 'document'], async (ctx) => {
  const message = ctx.message;
  const caption = 'caption' in message ? message.caption : '';
  
  if (caption && caption.includes('#OT')) {
    const otMatch = caption.match(/#OT(\d+)/); 
    
    if (otMatch) {
      const otNumber = otMatch[1];
      
      let fileId = '';
      if ('photo' in message) fileId = message.photo[message.photo.length - 1].file_id;
      else if ('video' in message) fileId = message.video.file_id;

      console.log(`Guardando media para OT: ${otNumber}. FileID: ${fileId}`);
    }
  }
});
