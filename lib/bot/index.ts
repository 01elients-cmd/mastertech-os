import { Telegraf, Markup } from 'telegraf';
import { FORUM_THREADS, CALLBACKS } from './constants';
import { SOPS } from '../templates/sops';
import { supabase } from './supabase';
import { fmt } from './formatter';
import { dbGetTemplates, dbGetRecords } from '../dashboard-db';

// Módulos
import { processPreventiveAlerts } from './modules/preventive-alerts';
import { handleFluidCommand, handleStockCommand, handleAddInventoryCommand, handleRestockCommand } from './modules/inventory';
import { handleMediaMessage, handleMediaDataResponse } from './modules/media-registry';
import { handleMediaRedirect } from './modules/media-redirect';
import { handleDtcCommand } from './modules/dtc-dictionary';
import { extractEntities } from './modules/entity-extraction';
import { handleApprovalRequest, handleApproveAction, handleRejectAction } from './modules/approval-cycle';
import { handleLogisticsCommand, handleExternalJobCommand, handleExternalReturnCommand } from './modules/logistics';
import { handleWikiCommand, handleBriefingCommand, handleStandupCommand } from './modules/knowledge-briefing';
import { sendOemProtocol } from './modules/sla-oem';

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '123456789:PlaceholderToken');

// Thread de gerencia para alertas (configurar con el ID real)
const MANAGEMENT_THREAD = parseInt(process.env.MANAGEMENT_THREAD_ID || '0');

// ==========================================
// 1. COMANDOS ORIGINALES POR HILOS
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

bot.command('informe_incidencias', async (ctx) => {
  const records = await dbGetRecords();
  const incidents = records.filter(r => r.category === 'incidencias');
  
  if (incidents.length === 0) {
    await ctx.reply(fmt.successMessage('No hay incidencias registradas.'), { parse_mode: 'HTML' });
    return;
  }
  
  const byPerson: Record<string, number> = {};
  incidents.forEach(inc => {
    let person = 'Desconocido';
    const match = inc.content?.match(/Origen_Problema:\s*([^\n]+)/i);
    if (match && match[1]) {
      person = match[1].trim();
    } else if (inc.creator) {
      person = inc.creator;
    }
    
    // Fallback if the extracted person still has brackets (not filled out properly)
    if (person.startsWith('[')) person = 'Desconocido';
    
    byPerson[person] = (byPerson[person] || 0) + 1;
  });
  
  const reportHTML = fmt.incidentsReport({
    total: incidents.length,
    byPerson
  });
  
  await ctx.reply(reportHTML, { parse_mode: 'HTML' });
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
// 2. NUEVOS COMANDOS (MÓDULOS)
// ==========================================

// Inventario
bot.command('fluido', handleFluidCommand);
bot.command('stock', handleStockCommand);
bot.command('agregar_inventario', handleAddInventoryCommand);
bot.command('reabastecer', handleRestockCommand);

// DTC Dictionary
bot.command('dtc', handleDtcCommand);

// Aprobaciones
bot.command('aprobar', handleApprovalRequest);

// Logística y trabajos externos
bot.command('logistica', handleLogisticsCommand);
bot.command('externo', handleExternalJobCommand);
bot.command('retorno_externo', handleExternalReturnCommand);

// Knowledge Base y Briefings
bot.command('wiki', handleWikiCommand);
bot.command('briefing_direccion', handleBriefingCommand);
bot.command('standup', handleStandupCommand);

// Ingreso con kilometraje (dispara protocolo OEM)
bot.command('ingreso', async (ctx) => {
  const args = ctx.message.text.split(/\s+/).slice(1);
  if (args.length === 0) {
    await ctx.reply(fmt.errorMessage('Uso: /ingreso <km> [marca] [modelo]\nEjemplo: /ingreso 80000 Toyota Tacoma'), { parse_mode: 'HTML' });
    return;
  }
  const km = parseInt(args[0]);
  const brand = args[1] || 'General';
  const model = args.slice(2).join(' ') || undefined;

  if (isNaN(km)) {
    await ctx.reply(fmt.errorMessage('El kilometraje debe ser un número.'), { parse_mode: 'HTML' });
    return;
  }

  await ctx.reply(fmt.successMessage(`Ingreso registrado: ${km.toLocaleString()} km\nMarca: ${brand}${model ? '\nModelo: ' + model : ''}`), { parse_mode: 'HTML' });

  // Disparar protocolo OEM
  await sendOemProtocol(ctx, km, brand, model);
});

// ==========================================
// 3. MANEJADOR DE ACCIONES (BOTONES DINÁMICOS)
// ==========================================

const replyInThread = async (ctx: any, callbackKey: string) => {
  await ctx.answerCbQuery();
  const threadId = ctx.callbackQuery.message?.message_thread_id;
  
  let templateContent = '';
  try {
    const templates = await dbGetTemplates();
    const found = templates.find((t) => t.key === callbackKey);
    templateContent = found ? found.content : (SOPS[callbackKey as keyof typeof SOPS] || 'Falta plantilla');
  } catch (err) {
    console.error(`Error loading dynamic template for key ${callbackKey}:`, err);
    templateContent = SOPS[callbackKey as keyof typeof SOPS] || 'Error al cargar plantilla';
  }

  await ctx.reply(templateContent, { 
    parse_mode: 'HTML',
    message_thread_id: threadId 
  });
};

// Vinculación de botones con sus plantillas dinámicas / estáticas
bot.action(CALLBACKS.NUEVO_INGRESO, (ctx) => replyInThread(ctx, 'NUEVO_INGRESO'));
bot.action(CALLBACKS.SOLICITUD_REPUESTO, (ctx) => replyInThread(ctx, 'SOLICITUD_REPUESTO'));
bot.action(CALLBACKS.COTIZACION_REPUESTO, (ctx) => replyInThread(ctx, 'COTIZACION_REPUESTO'));
bot.action(CALLBACKS.NUEVOS_HALLAZGOS, (ctx) => replyInThread(ctx, 'NUEVOS_HALLAZGOS'));
bot.action(CALLBACKS.LISTO_PARCIAL, (ctx) => replyInThread(ctx, 'LISTO_PARCIAL'));
bot.action(CALLBACKS.ESTATUS_OP, (ctx) => replyInThread(ctx, 'ESTATUS_OP'));
bot.action(CALLBACKS.GARANTIA_REINGRESO, (ctx) => replyInThread(ctx, 'GARANTIA_REINGRESO'));
bot.action(CALLBACKS.GARANTIA_RETRABAJO, (ctx) => replyInThread(ctx, 'GARANTIA_RETRABAJO'));
bot.action(CALLBACKS.PENDIENTES_POSTVENTA, (ctx) => replyInThread(ctx, 'PENDIENTES_POSTVENTA'));
bot.action(CALLBACKS.PENDIENTES_SEGUIMIENTO, (ctx) => replyInThread(ctx, 'PENDIENTES_SEGUIMIENTO'));
bot.action(CALLBACKS.INCIDENCIA_APERTURA, (ctx) => replyInThread(ctx, 'INCIDENCIA_APERTURA'));
bot.action(CALLBACKS.INCIDENCIA_CIERRE, (ctx) => replyInThread(ctx, 'INCIDENCIA_CIERRE'));
bot.action(CALLBACKS.FORMATO_QC, (ctx) => replyInThread(ctx, 'CONTROL_CALIDAD'));
bot.action(CALLBACKS.LINEA_INSPECCION, (ctx) => replyInThread(ctx, 'LINEA_INSPECCION'));
bot.action(CALLBACKS.MEJORA_APERTURA, (ctx) => replyInThread(ctx, 'MEJORA_APERTURA'));
bot.action(CALLBACKS.MEJORA_CIERRE, (ctx) => replyInThread(ctx, 'MEJORA_CIERRE'));

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

  const time = new Date().toLocaleTimeString('es-VE', { timeZone: 'America/Caracas' });
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

// Acciones de Aprobación (botones dinámicos APPROVE_/REJECT_)
bot.action(/^APPROVE_(.+)$/, async (ctx) => {
  const approvalId = ctx.match[1];
  await handleApproveAction(ctx, approvalId);
});

bot.action(/^REJECT_(.+)$/, async (ctx) => {
  const approvalId = ctx.match[1];
  await handleRejectAction(ctx, approvalId);
});

// ==========================================
// 4. MANEJO DE MEDIOS (FOTOS/VIDEOS)
// ==========================================

bot.on(['photo', 'video', 'document'], async (ctx) => {
  // Si viene del grupo origen, redirigir al foro correspondiente
  if (ctx.chat.id === FORUM_THREADS.TALLER_ORIGEN_ID || ctx.chat.id.toString() === process.env.TALLER_ORIGEN_ID) {
    await handleMediaRedirect(ctx);
    return;
  }
  
  await handleMediaMessage(ctx);
});

// ==========================================
// 5. MANEJO DE TEXTO LIBRE
// ==========================================

bot.on('text', async (ctx) => {
  const text = ctx.message.text;

  // Ignorar comandos (ya manejados arriba)
  if (text.startsWith('/')) return;

  // Primero: verificar si el usuario tiene media pendiente de datos
  const handled = await handleMediaDataResponse(ctx);
  if (handled) return;

  // Alertas preventivas en todos los mensajes de texto
  if (MANAGEMENT_THREAD) {
    await processPreventiveAlerts(ctx, text, MANAGEMENT_THREAD);
  }
});
