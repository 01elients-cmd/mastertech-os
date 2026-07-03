/**
 * MasterTech OS — Ciclo de Aprobación de Trabajos
 * Flujo: Hallazgo → Botón ✅/❌ → Notificación al técnico
 */

import type { Context } from 'telegraf';
import { Markup } from 'telegraf';
import { supabase } from '../supabase';
import { fmt } from '../formatter';

/**
 * /aprobar <orden> <descripción> [costo]
 * Crea solicitud de aprobación con botones inline
 */
export async function handleApprovalRequest(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !('text' in message)) return;

  const text = message.text.replace(/^\/aprobar\s*/, '');
  const match = text.match(/^(\d+)\s+(.+?)(?:\s+\$?([\d.]+))?$/);

  if (!match) {
    await ctx.reply(fmt.errorMessage(
      'Uso: /aprobar <orden> <descripción> [costo]\n\nEjemplo:\n  /aprobar 4120 Cambio pastillas traseras $45.00'
    ), { parse_mode: 'HTML' });
    return;
  }

  const orderNum = parseInt(match[1]);
  const description = match[2].trim();
  const cost = match[3] ? parseFloat(match[3]) : undefined;
  const username = ctx.from?.first_name || 'Técnico';

  // Buscar la orden
  const { data: wo } = await supabase.from('work_orders')
    .select('*').eq('order_number', orderNum).single();

  // Crear registro de aprobación
  const { data: approval, error } = await supabase.from('approvals').insert([{
    work_order_id: wo?.id || null,
    plate: wo?.plate || 'N/A',
    description,
    estimated_cost: cost || null,
    requested_by: username,
    requested_by_telegram_id: String(ctx.from?.id || ''),
    status: 'PENDIENTE'
  }]).select().single();

  if (error || !approval) {
    await ctx.reply(fmt.errorMessage('Error creando solicitud.'), { parse_mode: 'HTML' });
    return;
  }

  const card = fmt.approvalCard({
    orderNumber: orderNum,
    plate: wo?.plate || 'N/A',
    model: wo?.model ? `${wo.brand || ''} ${wo.model}` : 'N/A',
    description,
    estimatedCost: cost,
    requestedBy: username,
    ramp: wo?.ramp_number
  });

  await ctx.reply(card + '\n\n¿Autorizar este trabajo adicional?', {
    parse_mode: 'HTML',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Aprobar', `APPROVE_${approval.id}`),
        Markup.button.callback('❌ Rechazar', `REJECT_${approval.id}`)
      ]
    ])
  });
}

/** Handler para botón de aprobar */
export async function handleApproveAction(ctx: Context, approvalId: string): Promise<void> {
  await ctx.answerCbQuery('✅ Trabajo aprobado');
  const approver = ctx.from?.first_name || 'Admin';

  const { data: approval } = await supabase.from('approvals')
    .update({
      status: 'APROBADO',
      approved_by: approver,
      approved_by_telegram_id: String(ctx.from?.id || ''),
      responded_at: new Date().toISOString(),
      notified_technician: true
    })
    .eq('id', approvalId)
    .select('*, work_order_id')
    .single();

  if (!approval) return;

  // Actualizar orden si existe
  if (approval.work_order_id) {
    await supabase.from('work_orders')
      .update({ status: 'APROBADO' })
      .eq('id', approval.work_order_id);
  }

  const msg = fmt.successMessage(
    `TRABAJO APROBADO\n\nAprobado por: ${approver}\nPlaca: ${approval.plate}\nTrabajo: ${approval.description}\n\n→ Proceder con la instalación.`
  );

  await ctx.editMessageText(msg, { parse_mode: 'HTML' });
}

/** Handler para botón de rechazar */
export async function handleRejectAction(ctx: Context, approvalId: string): Promise<void> {
  await ctx.answerCbQuery('❌ Trabajo rechazado');
  const rejecter = ctx.from?.first_name || 'Admin';

  await supabase.from('approvals')
    .update({
      status: 'RECHAZADO',
      approved_by: rejecter,
      approved_by_telegram_id: String(ctx.from?.id || ''),
      responded_at: new Date().toISOString()
    })
    .eq('id', approvalId);

  await ctx.editMessageText(
    fmt.errorMessage(`TRABAJO RECHAZADO por ${rejecter}.`),
    { parse_mode: 'HTML' }
  );
}
