/**
 * MasterTech OS — Logística y Trabajos Externalizados
 * Comandos: /logistica, /externo
 */

import type { Context } from 'telegraf';
import { supabase } from '../supabase';
import { fmt } from '../formatter';

/** /logistica [Placa] — Consultar estado logístico */
export async function handleLogisticsCommand(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !('text' in message)) return;
  const plate = message.text.split(/\s+/)[1]?.toUpperCase();

  if (!plate) {
    await ctx.reply(fmt.errorMessage('Uso: /logistica <Placa>\nEjemplo: /logistica XYZ123'), { parse_mode: 'HTML' });
    return;
  }

  const { data: items } = await supabase.from('logistics')
    .select('*').eq('plate', plate).neq('status', 'RECIBIDO').order('eta_date');

  if (!items || items.length === 0) {
    await ctx.reply(fmt.successMessage(`No hay piezas en tránsito para ${plate}.`), { parse_mode: 'HTML' });
    return;
  }

  await ctx.reply(fmt.logisticsCard({
    plate,
    parts: items.map(i => ({ name: i.part_name, status: i.status, eta: i.eta_date || undefined }))
  }), { parse_mode: 'HTML' });
}

/** /externo [Placa] [Proveedor] — Enviar trabajo externo */
export async function handleExternalJobCommand(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !('text' in message)) return;
  const args = message.text.split(/\s+/).slice(1);

  if (args.length < 2) {
    await ctx.reply(fmt.errorMessage('Uso: /externo <Placa> <Proveedor>\nEjemplo: /externo XYZ123 Torneria_Discos'), { parse_mode: 'HTML' });
    return;
  }

  const plate = args[0].toUpperCase();
  const provider = args.slice(1).join(' ').replace(/_/g, ' ');

  const { data: wo } = await supabase.from('work_orders')
    .select('id, order_number, status').eq('plate', plate).neq('status', 'ENTREGADO').order('created_at', { ascending: false }).limit(1).single();

  const now = new Date();
  await supabase.from('external_jobs').insert([{
    work_order_id: wo?.id || null,
    plate,
    provider_name: provider,
    sent_at: now.toISOString(),
    mechanic_time_frozen_at: now.toISOString(),
    status: 'ENVIADO'
  }]);

  if (wo) {
    await supabase.from('work_orders').update({ status: 'TRABAJO_EXTERNO' }).eq('id', wo.id);
  }

  await ctx.reply(fmt.externalJobCard({
    plate, provider, service: 'Pendiente de detallar',
    sentAt: now.toLocaleString('es-VE', { timeZone: 'America/Caracas' }),
    status: 'ENVIADO'
  }), { parse_mode: 'HTML' });
}

/** /retorno_externo [Placa] — Marcar retorno de trabajo externo */
export async function handleExternalReturnCommand(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !('text' in message)) return;
  const plate = message.text.split(/\s+/)[1]?.toUpperCase();

  if (!plate) {
    await ctx.reply(fmt.errorMessage('Uso: /retorno_externo <Placa>'), { parse_mode: 'HTML' });
    return;
  }

  const { data: job } = await supabase.from('external_jobs')
    .select('*').eq('plate', plate).eq('status', 'ENVIADO').order('sent_at', { ascending: false }).limit(1).single();

  if (!job) {
    await ctx.reply(fmt.errorMessage(`No hay trabajos externos pendientes para ${plate}.`), { parse_mode: 'HTML' });
    return;
  }

  const now = new Date();
  const sentAt = new Date(job.sent_at);
  const durationSec = Math.round((now.getTime() - sentAt.getTime()) / 1000);
  const hours = Math.floor(durationSec / 3600);
  const mins = Math.floor((durationSec % 3600) / 60);

  await supabase.from('external_jobs').update({
    returned_at: now.toISOString(),
    provider_duration_seconds: durationSec,
    status: 'COMPLETADO'
  }).eq('id', job.id);

  if (job.work_order_id) {
    await supabase.from('work_orders').update({ status: 'EN_REPARACION' }).eq('id', job.work_order_id);
  }

  await ctx.reply(fmt.externalJobCard({
    plate, provider: job.provider_name, service: job.service_description || 'N/A',
    sentAt: sentAt.toLocaleString('es-VE', { timeZone: 'America/Caracas' }),
    status: 'COMPLETADO',
    duration: `${hours}h ${mins}m`
  }), { parse_mode: 'HTML' });
}
