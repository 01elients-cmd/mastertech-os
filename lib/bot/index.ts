import { Telegraf, Markup } from 'telegraf';
import { FORUM_THREADS, CALLBACKS } from './constants';
import { SOPS } from '../templates/sops';

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);

// ==========================================
// 1. LISTENERS DE COMANDOS POR HILOS
// ==========================================

bot.command('getid', (ctx) => {
  const threadId = ctx.message.message_thread_id;
  ctx.reply(`El ID de este hilo es: ${threadId || 'No es un hilo/Topic'}`);
});

bot.command('recepcion', async (ctx) => {
  const threadId = ctx.message.message_thread_id;
  
  if (threadId !== FORUM_THREADS.RECEPCION) {
    return ctx.reply('⚠️ Por favor usa este comando en el hilo de Recepción.', { 
      reply_parameters: { message_id: ctx.message.message_id }
    });
  }

  await ctx.reply('👋 Bienvenido a Recepción. Selecciona una acción:', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      Markup.button.callback('🚗 NUEVO INGRESO', CALLBACKS.NUEVO_INGRESO)
    ])
  });
});

bot.command('repuestos', async (ctx) => {
  if (ctx.message.message_thread_id !== FORUM_THREADS.REPUESTOS) return;

  await ctx.reply('📦 Departamento de Repuestos. Selecciona una acción:', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      Markup.button.callback('📦 SOLICITUD', CALLBACKS.SOLICITUD_REPUESTO),
      Markup.button.callback('📄 COTIZACIÓN', CALLBACKS.COTIZACION_REPUESTO)
    ])
  });
});

bot.command('servicios', async (ctx) => {
  if (ctx.message.message_thread_id !== FORUM_THREADS.OPERACIONES) return;

  await ctx.reply('🔧 Operaciones de Taller:', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      Markup.button.callback('Nuevos Hallazgos', CALLBACKS.NUEVOS_HALLAZGOS),
      Markup.button.callback('Listo/Parcial', CALLBACKS.LISTO_PARCIAL),
      Markup.button.callback('Estatus', CALLBACKS.ESTATUS_OP)
    ])
  });
});

bot.command('calidad', async (ctx) => {
  if (ctx.message.message_thread_id !== FORUM_THREADS.CALIDAD) return;

  await ctx.reply('🔍 Control de Calidad:', {
    reply_parameters: { message_id: ctx.message.message_id },
    ...Markup.inlineKeyboard([
      Markup.button.callback('📋 FORMATO QC', CALLBACKS.FORMATO_QC)
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
    parse_mode: 'Markdown',
    message_thread_id: threadId 
  });
};

bot.action(CALLBACKS.NUEVO_INGRESO, (ctx) => replyInThread(ctx, SOPS.NUEVO_INGRESO));
bot.action(CALLBACKS.SOLICITUD_REPUESTO, (ctx) => replyInThread(ctx, SOPS.SOLICITUD_REPUESTOS));
bot.action(CALLBACKS.FORMATO_QC, (ctx) => replyInThread(ctx, SOPS.CONTROL_CALIDAD));


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
