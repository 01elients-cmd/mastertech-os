/**
 * MasterTech OS — Knowledge Base + Briefing + Daily Standup
 * Comandos: /wiki, /briefing_direccion, /standup
 */

import type { Context } from 'telegraf';
import OpenAI from 'openai';
import { supabase } from '../supabase';
import { fmt } from '../formatter';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-build' });

/** /wiki [consulta] — Busca en historial de OTs cerradas */
export async function handleWikiCommand(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !('text' in message)) return;
  const query = message.text.replace(/^\/wiki\s*/, '').trim();

  if (!query) {
    await ctx.reply(fmt.errorMessage('Uso: /wiki <consulta>\nEjemplo: /wiki torque culata Corolla GR'), { parse_mode: 'HTML' });
    return;
  }

  // Buscar en knowledge_base por tags y descripciones
  const { data: results } = await supabase.from('knowledge_base')
    .select('*').or(`issue_description.ilike.%${query}%,solution_description.ilike.%${query}%`)
    .limit(5);

  if (results && results.length > 0) {
    await ctx.reply(fmt.wikiResult({
      query,
      results: results.map(r => ({
        brand: r.brand || '', model: r.model || '',
        issue: r.issue_description, solution: r.solution_description,
        technician: r.technician, date: r.created_at?.split('T')[0]
      }))
    }), { parse_mode: 'HTML' });
    return;
  }

  // Si no hay resultados directos, usar IA para buscar en OTs cerradas
  const { data: closedOrders } = await supabase.from('work_orders')
    .select('order_number, brand, model, reported_issue, confirmed_diagnosis')
    .eq('status', 'ENTREGADO')
    .not('confirmed_diagnosis', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!closedOrders || closedOrders.length === 0) {
    await ctx.reply(fmt.wikiResult({ query, results: [] }), { parse_mode: 'HTML' });
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
          content: `Eres el cerebro técnico de un taller automotriz. Busca en el historial de órdenes cerradas para responder la consulta del técnico. Responde de forma concisa y técnica. Si no encuentras información relevante, dilo claramente.`
        },
        {
          role: 'user',
          content: `Consulta: "${query}"\n\nHistorial de OTs:\n${closedOrders.map(o =>
            `OT#${o.order_number} | ${o.brand} ${o.model} | Falla: ${o.reported_issue} | Diagnóstico: ${o.confirmed_diagnosis}`
          ).join('\n')}`
        }
      ]
    });

    const answer = response.choices[0]?.message?.content || 'Sin respuesta';
    await ctx.reply(`<pre>📚 WIKI — Búsqueda IA\n━━━━━━━━━━━━━━━━━━━━━━━━\nConsulta: "${query}"\n\n${answer}</pre>`, { parse_mode: 'HTML' });
  } catch {
    await ctx.reply(fmt.errorMessage('Error consultando la base de conocimiento.'), { parse_mode: 'HTML' });
  }
}

/** /briefing_direccion — Resumen ejecutivo semanal */
export async function handleBriefingCommand(ctx: Context): Promise<void> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [orders, alerts, inventory, external] = await Promise.all([
    supabase.from('work_orders').select('status, brand, total_cost').gte('created_at', weekAgo),
    supabase.from('alerts').select('type, severity').gte('created_at', weekAgo),
    supabase.from('inventory').select('name, quantity, min_stock, unit').eq('is_active', true),
    supabase.from('external_jobs').select('provider_name, provider_duration_seconds').gte('created_at', weekAgo),
  ]);

  const totalOrders = orders.data?.length || 0;
  const delivered = orders.data?.filter(o => o.status === 'ENTREGADO').length || 0;
  const blocked = orders.data?.filter(o => ['ESPERANDO_REPUESTOS', 'TRABAJO_EXTERNO'].includes(o.status)).length || 0;
  const totalAlerts = alerts.data?.length || 0;
  const criticalAlerts = alerts.data?.filter(a => a.severity === 'CRITICA').length || 0;
  const lowStock = inventory.data?.filter(i => i.quantity <= i.min_stock).length || 0;

  const summary = [
    `Periodo: Últimos 7 días`,
    ``,
    `VOLUMEN OPERATIVO:`,
    `  Órdenes creadas:    ${totalOrders}`,
    `  Vehículos entregados: ${delivered}`,
    `  Bloqueados:          ${blocked}`,
    ``,
    `ALERTAS:`,
    `  Total:    ${totalAlerts}`,
    `  Críticas: ${criticalAlerts}`,
    ``,
    `INVENTARIO:`,
    `  Items bajo mínimo: ${lowStock}`,
    ``,
    `TRABAJOS EXTERNOS:`,
    `  Enviados: ${external.data?.length || 0}`,
  ].join('\n');

  await ctx.reply(fmt.briefingReport(summary), { parse_mode: 'HTML' });
}

/** Genera datos para el Daily Standup (usado por cron o /standup) */
export async function generateStandupData() {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().split('T')[0];

  const [ingresosAyer, bloqueados, entregasHoy, aprobaciones, alertas, stockBajo] = await Promise.all([
    supabase.from('work_orders').select('id', { count: 'exact' }).gte('created_at', yesterday),
    supabase.from('work_orders').select('id', { count: 'exact' }).in('status', ['ESPERANDO_REPUESTOS', 'ESPERANDO_APROBACION', 'TRABAJO_EXTERNO']),
    supabase.from('work_orders').select('id', { count: 'exact' }).eq('status', 'LISTO_PARA_ENTREGA'),
    supabase.from('approvals').select('id', { count: 'exact' }).eq('status', 'PENDIENTE'),
    supabase.from('alerts').select('id', { count: 'exact' }).eq('is_resolved', false),
    supabase.from('inventory').select('id, name, quantity, min_stock').eq('is_active', true),
  ]);

  const lowStockCount = stockBajo.data?.filter(i => i.quantity <= i.min_stock).length || 0;

  return {
    date: today,
    vehiclesIn: ingresosAyer.count || 0,
    vehiclesBlocked: bloqueados.count || 0,
    deliveriesToday: entregasHoy.count || 0,
    pendingApprovals: aprobaciones.count || 0,
    lowStockItems: lowStockCount,
    activeAlerts: alertas.count || 0,
  };
}

export async function handleStandupCommand(ctx: Context): Promise<void> {
  const data = await generateStandupData();
  await ctx.reply(fmt.standupReport(data), { parse_mode: 'HTML' });
}
