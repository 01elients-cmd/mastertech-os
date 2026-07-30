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
import { handleApprovalRequest, handleApproveAction, handleRejectAction } from './modules/approval-cycle';
import { handleLogisticsCommand, handleExternalJobCommand, handleExternalReturnCommand } from './modules/logistics';
import { handleWikiCommand, handleBriefingCommand, handleStandupCommand } from './modules/knowledge-briefing';
import { sendOemProtocol } from './modules/sla-oem';
import { handleCreateTopicCommand } from './modules/topic-creator';

export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '123456789:PlaceholderToken');

// Thread de gerencia para alertas
const MANAGEMENT_THREAD = parseInt(process.env.MANAGEMENT_THREAD_ID || '0');

// ==========================================
// 1. COMANDOS POR HILOS (AHORA DISPONIBLES EN CUALQUIER HILO/CHAT)
// ==========================================

bot.command('getid', (ctx) => {
  try {
    const threadId = ctx.message?.message_thread_id;
    ctx.reply(`El ID de este hilo es: ${threadId || 'No es un hilo/Topic (General)'}`);
  } catch (err) {
    console.error('Error en /getid:', err);
  }
});

bot.command('jornada', async (ctx) => {
  try {
    await ctx.reply('⏱️ *Control de Jornada de Trabajo*', {
      parse_mode: 'Markdown',
      reply_parameters: { message_id: ctx.message.message_id },
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🟢 Iniciar Jornada', CALLBACKS.JORNADA_INICIAR)],
        [Markup.button.callback('🔴 Finalizar Jornada', CALLBACKS.JORNADA_FINALIZAR)]
      ])
    });
  } catch (err) {
    console.error('Error en /jornada:', err);
    ctx.reply('⏱️ Control de Jornada:\n1. Iniciar Jornada\n2. Finalizar Jornada');
  }
});

bot.command('recepcion', async (ctx) => {
  try {
    await ctx.reply('👋 Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
      reply_parameters: { message_id: ctx.message.message_id },
      ...Markup.inlineKeyboard([
        Markup.button.callback('🚗 REPORTE NUEVO INGRESO', CALLBACKS.NUEVO_INGRESO)
      ])
    });
  } catch (err) {
    console.error('Error en /recepcion:', err);
  }
});

bot.command('repuestos', async (ctx) => {
  try {
    await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
      reply_parameters: { message_id: ctx.message.message_id },
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('📦 SOLICITUD', CALLBACKS.SOLICITUD_REPUESTO),
          Markup.button.callback('📄 COTIZACIÓN', CALLBACKS.COTIZACION_REPUESTO)
        ]
      ])
    });
  } catch (err) {
    console.error('Error en /repuestos:', err);
  }
});

bot.command('operacion', async (ctx) => {
  try {
    await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
      reply_parameters: { message_id: ctx.message.message_id },
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔧 Nuevos Hallazgos', CALLBACKS.NUEVOS_HALLAZGOS)],
        [Markup.button.callback('⚡ Listo/Parcial', CALLBACKS.LISTO_PARCIAL)],
        [Markup.button.callback('💰 Estatus', CALLBACKS.ESTATUS_OP)]
      ])
    });
  } catch (err) {
    console.error('Error en /operacion:', err);
  }
});

bot.command('garantia', async (ctx) => {
  try {
    await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
      reply_parameters: { message_id: ctx.message.message_id },
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('🧧 GARANTÍA', CALLBACKS.GARANTIA_REINGRESO),
          Markup.button.callback('⚠️ RETRABAJO', CALLBACKS.GARANTIA_RETRABAJO)
        ]
      ])
    });
  } catch (err) {
    console.error('Error en /garantia:', err);
  }
});

bot.command('pendientes', async (ctx) => {
  try {
    await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
      reply_parameters: { message_id: ctx.message.message_id },
      ...Markup.inlineKeyboard([
        [Markup.button.callback('⚙️ CONTROL DE POST-VENTA Y LOGÍSTICA', CALLBACKS.PENDIENTES_POSTVENTA)],
        [Markup.button.callback('📞 SEGUIMIENTO DE LLAMADAS Y CITA', CALLBACKS.PENDIENTES_SEGUIMIENTO)]
      ])
    });
  } catch (err) {
    console.error('Error en /pendientes:', err);
  }
});

bot.command('incidencias', async (ctx) => {
  try {
    await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
      reply_parameters: { message_id: ctx.message.message_id },
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🔴 1. Reporte (Apertura)', CALLBACKS.INCIDENCIA_APERTURA)],
        [Markup.button.callback('🟢 2. Resolución (Cierre)', CALLBACKS.INCIDENCIA_CIERRE)]
      ])
    });
  } catch (err) {
    console.error('Error en /incidencias:', err);
  }
});

bot.command('informe_incidencias', async (ctx) => {
  try {
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
      
      if (person.startsWith('[')) person = 'Desconocido';
      byPerson[person] = (byPerson[person] || 0) + 1;
    });
    
    const reportHTML = fmt.incidentsReport({
      total: incidents.length,
      byPerson
    });
    
    await ctx.reply(reportHTML, { parse_mode: 'HTML' });
  } catch (err) {
    console.error('Error en /informe_incidencias:', err);
    ctx.reply('❌ No se pudo obtener el informe de incidencias en este momento.');
  }
});

bot.command('calidad', async (ctx) => {
  try {
    await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
      reply_parameters: { message_id: ctx.message.message_id },
      ...Markup.inlineKeyboard([
        Markup.button.callback('📋 FORMATO QC', CALLBACKS.FORMATO_QC)
      ])
    });
  } catch (err) {
    console.error('Error en /calidad:', err);
  }
});

bot.command('inspeccion', async (ctx) => {
  try {
    await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
      reply_parameters: { message_id: ctx.message.message_id },
      ...Markup.inlineKeyboard([
        Markup.button.callback('🔍 Linea Inspeccion', CALLBACKS.LINEA_INSPECCION)
      ])
    });
  } catch (err) {
    console.error('Error en /inspeccion:', err);
  }
});

bot.command('mejora', async (ctx) => {
  try {
    await ctx.reply('Bienvenido al sistema de MasterTech. ¿En qué puedo ayudarte hoy?', {
      reply_parameters: { message_id: ctx.message.message_id },
      ...Markup.inlineKeyboard([
        [Markup.button.callback('💡 Propuesta de Mejora (Apertura)', CALLBACKS.MEJORA_APERTURA)],
        [Markup.button.callback('🚀 Implementación y Resultado (Cierre)', CALLBACKS.MEJORA_CIERRE)]
      ])
    });
  } catch (err) {
    console.error('Error en /mejora:', err);
  }
});

// ==========================================
// 2. NUEVOS COMANDOS (MÓDULOS)
// ==========================================

bot.command('fluido', handleFluidCommand);
bot.command('stock', handleStockCommand);
bot.command('agregar_inventario', handleAddInventoryCommand);
bot.command('reabastecer', handleRestockCommand);
bot.command('dtc', handleDtcCommand);
bot.command('aprobar', handleApprovalRequest);
bot.command('logistica', handleLogisticsCommand);
bot.command('externo', handleExternalJobCommand);
bot.command('retorno_externo', handleExternalReturnCommand);
bot.command('wiki', handleWikiCommand);
bot.command('briefing_direccion', handleBriefingCommand);
bot.command('standup', handleStandupCommand);
bot.command('crear_hilo', handleCreateTopicCommand);
bot.command('crear_topic', handleCreateTopicCommand);

bot.command('ingreso', async (ctx) => {
  try {
    const args = ctx.message.text.split(/\s+/).slice(1);
    if (args.length === 0) {
      await ctx.reply('Uso: /ingreso <km> [marca] [modelo]\nEjemplo: /ingreso 80000 Toyota Tacoma');
      return;
    }
    const km = parseInt(args[0]);
    const brand = args[1] || 'General';
    const model = args.slice(2).join(' ') || undefined;

    if (isNaN(km)) {
      await ctx.reply('El kilometraje debe ser un número.');
      return;
    }

    await ctx.reply(`Ingreso registrado: ${km.toLocaleString()} km\nMarca: ${brand}${model ? '\nModelo: ' + model : ''}`);
    await sendOemProtocol(ctx, km, brand, model);
  } catch (err) {
    console.error('Error en /ingreso:', err);
  }
});

// ==========================================
// 3. MANEJADOR DE ACCIONES (BOTONES DINÁMICOS CON FALLBACK SEGURO)
// ==========================================

const replyInThread = async (ctx: any, callbackKey: string) => {
  try {
    await ctx.answerCbQuery();
  } catch (e) {
    // Si la llamada a answerCbQuery falla o expira
  }
  
  const threadId = ctx.callbackQuery?.message?.message_thread_id;
  
  let templateContent = '';
  try {
    const templates = await dbGetTemplates();
    const found = templates.find((t) => t.key === callbackKey);
    templateContent = found ? found.content : (SOPS[callbackKey as keyof typeof SOPS] || 'Falta plantilla');
  } catch (err) {
    console.error(`Error loading dynamic template for key ${callbackKey}:`, err);
    templateContent = SOPS[callbackKey as keyof typeof SOPS] || 'Error al cargar plantilla';
  }

  const replyOpts: any = {};
  if (threadId) {
    replyOpts.message_thread_id = threadId;
  }

  try {
    // Intentar responder como texto plano primero para evitar fallos de parser HTML de Telegram
    await ctx.reply(templateContent, replyOpts);
  } catch (err) {
    console.error('Error al responder con plantilla:', err);
    try {
      await ctx.reply(`Plantilla: ${callbackKey}\n\n${templateContent}`, replyOpts);
    } catch (e2) {
      console.error('Error crítico en replyInThread:', e2);
    }
  }
};

// Vinculación de botones
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

// Acciones de Jornada (Resilientes)
bot.action(CALLBACKS.JORNADA_INICIAR, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    const username = ctx.from?.first_name || 'Técnico';
    
    if (!userId) return;

    try {
      const { data: activeJornada } = await supabase
        .from('jornadas')
        .select('*')
        .eq('telegram_id', userId)
        .eq('status', 'ACTIVO')
        .single();

      if (activeJornada) {
        return ctx.reply(`⚠️ ${username}, ya tienes una jornada iniciada desde las ${new Date(activeJornada.started_at).toLocaleTimeString('es-VE')}.`);
      }

      await supabase
        .from('jornadas')
        .insert([{ telegram_id: userId, username, status: 'ACTIVO' }]);
    } catch (dbErr) {
      console.warn('Supabase no disponible para registrar jornada, continuando respuesta...', dbErr);
    }

    const time = new Date().toLocaleTimeString('es-VE', { timeZone: 'America/Caracas' });
    await ctx.reply(`✅ *Jornada iniciada* con éxito a las ${time}.\n¡Que tengas un excelente turno, ${username}!`, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('Error en callback JORNADA_INICIAR:', err);
  }
});

bot.action(CALLBACKS.JORNADA_FINALIZAR, async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const userId = ctx.from?.id;
    const username = ctx.from?.first_name || 'Técnico';
    
    if (!userId) return;

    let activeJornada: any = null;
    try {
      const { data } = await supabase
        .from('jornadas')
        .select('*')
        .eq('telegram_id', userId)
        .eq('status', 'ACTIVO')
        .single();
      activeJornada = data;
    } catch (dbErr) {
      console.warn('Supabase error al buscar jornada activa:', dbErr);
    }

    const now = new Date();
    if (activeJornada) {
      try {
        await supabase
          .from('jornadas')
          .update({ ended_at: now.toISOString(), status: 'FINALIZADO' })
          .eq('id', activeJornada.id);
      } catch (e) {}

      const startTime = new Date(activeJornada.started_at);
      const diffMs = now.getTime() - startTime.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return ctx.reply(`🛑 *Jornada finalizada*.\n\n👤 *Técnico:* ${username}\n⏱️ *Tiempo trabajado:* ${diffHrs} horas y ${diffMins} minutos.\n\n¡Buen trabajo hoy! Descansa.`, { parse_mode: 'Markdown' });
    }

    await ctx.reply(`🛑 *Jornada finalizada* para ${username}.\n¡Buen trabajo hoy! Descansa.`, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('Error en callback JORNADA_FINALIZAR:', err);
  }
});

// Acciones de Aprobación
bot.action(/^APPROVE_(.+)$/, async (ctx) => {
  try {
    const approvalId = ctx.match[1];
    await handleApproveAction(ctx, approvalId);
  } catch (err) {
    console.error('Error en APPROVE action:', err);
  }
});

bot.action(/^REJECT_(.+)$/, async (ctx) => {
  try {
    const approvalId = ctx.match[1];
    await handleRejectAction(ctx, approvalId);
  } catch (err) {
    console.error('Error en REJECT action:', err);
  }
});

// ==========================================
// 4. MANEJO DE MEDIOS Y TEXTO
// ==========================================

bot.on(['photo', 'video', 'document'], async (ctx) => {
  try {
    if (ctx.chat.id === FORUM_THREADS.TALLER_ORIGEN_ID || ctx.chat.id.toString() === process.env.TALLER_ORIGEN_ID) {
      await handleMediaRedirect(ctx);
      return;
    }
    await handleMediaMessage(ctx);
  } catch (err) {
    console.error('Error en el manejo de medios:', err);
  }
});

bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text;
    if (text.startsWith('/')) return;

    const handled = await handleMediaDataResponse(ctx);
    if (handled) return;

    if (MANAGEMENT_THREAD) {
      await processPreventiveAlerts(ctx, text, MANAGEMENT_THREAD);
    }
  } catch (err) {
    console.error('Error en manejo de texto:', err);
  }
});
