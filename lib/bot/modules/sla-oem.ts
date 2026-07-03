/**
 * MasterTech OS — SLA de Rampa + Protocolos OEM por Kilometraje
 * Alertas por estancamiento y mantenimiento preventivo
 */

import type { Context } from 'telegraf';
import { supabase } from '../supabase';
import { fmt } from '../formatter';

// ===== SLA DE RAMPA (Alertas por estancamiento) =====

const SLA_THRESHOLDS: Record<string, number> = {
  'EN_DIAGNOSTICO': 3 * 60 * 60,       // 3 horas
  'ESPERANDO_APROBACION': 4 * 60 * 60,  // 4 horas
  'ESPERANDO_REPUESTOS': 24 * 60 * 60,  // 24 horas
  'EN_REPARACION': 8 * 60 * 60,         // 8 horas
  'CONTROL_CALIDAD': 2 * 60 * 60,       // 2 horas
};

/** Verifica órdenes estancadas y genera alertas (llamado por cron) */
export async function checkSlaViolations(
  sendAlert: (chatId: number, threadId: number, message: string) => Promise<void>,
  chatId: number,
  managementThreadId: number
): Promise<{ violations: number }> {
  const { data: activeOrders } = await supabase.from('work_orders')
    .select('*, order_status_log(created_at, new_status)')
    .in('status', Object.keys(SLA_THRESHOLDS))
    .order('updated_at', { ascending: true });

  if (!activeOrders) return { violations: 0 };

  let violations = 0;
  const now = Date.now();

  for (const order of activeOrders) {
    const threshold = SLA_THRESHOLDS[order.status];
    if (!threshold) continue;

    const lastUpdate = new Date(order.updated_at).getTime();
    const elapsed = (now - lastUpdate) / 1000;

    if (elapsed >= threshold) {
      violations++;
      const hours = Math.floor(elapsed / 3600);
      const mins = Math.floor((elapsed % 3600) / 60);

      // Verificar si ya se envió alerta reciente (evitar spam)
      const { data: recentAlert } = await supabase.from('alerts')
        .select('id')
        .eq('work_order_id', order.id)
        .eq('type', 'ESTANCAMIENTO')
        .gte('created_at', new Date(now - 60 * 60 * 1000).toISOString()) // última hora
        .limit(1);

      if (recentAlert && recentAlert.length > 0) continue;

      // Crear alerta en BD
      await supabase.from('alerts').insert([{
        type: 'ESTANCAMIENTO',
        severity: hours >= 6 ? 'CRITICA' : 'ALTA',
        work_order_id: order.id,
        title: `Vehículo estancado: ${order.plate}`,
        message: `Lleva ${hours}h ${mins}m en "${order.status.replace(/_/g, ' ')}" sin actualizaciones.`,
        target_thread_id: managementThreadId,
        notified_at: new Date().toISOString()
      }]);

      // Enviar alerta
      const alertMsg = fmt.alertCard({
        type: 'ESTANCAMIENTO SLA',
        severity: hours >= 6 ? 'CRITICA' : 'ALTA',
        title: `⚠️ ${order.plate} — ${hours}h ${mins}m sin movimiento`,
        message: `Estatus: ${order.status.replace(/_/g, ' ')}\nOrden: #${order.order_number}\nTécnico: ${order.assigned_technician || 'N/A'}\n\n¿Requiere asistencia o repuestos?`,
        plate: order.plate,
        orderNumber: order.order_number
      });

      try {
        await sendAlert(chatId, managementThreadId, alertMsg);
      } catch (err) {
        console.error('Error enviando alerta SLA:', err);
      }
    }
  }

  return { violations };
}

// ===== PROTOCOLOS OEM POR KILOMETRAJE =====

// Protocolos genéricos de mantenimiento
const GENERIC_OEM: Array<{ minKm: number; maxKm: number; services: Array<{ name: string; priority: string }> }> = [
  {
    minKm: 5000, maxKm: 15000,
    services: [
      { name: 'Cambio de aceite y filtro', priority: 'ALTA' },
      { name: 'Revisión de niveles de fluidos', priority: 'MEDIA' },
      { name: 'Inspección visual de frenos', priority: 'MEDIA' },
    ]
  },
  {
    minKm: 15000, maxKm: 30000,
    services: [
      { name: 'Cambio de aceite y filtro', priority: 'ALTA' },
      { name: 'Cambio de filtro de aire', priority: 'ALTA' },
      { name: 'Revisión de frenos', priority: 'ALTA' },
      { name: 'Rotación de neumáticos', priority: 'MEDIA' },
    ]
  },
  {
    minKm: 30000, maxKm: 50000,
    services: [
      { name: 'Cambio de aceite y filtro', priority: 'ALTA' },
      { name: 'Cambio de filtro de habitáculo', priority: 'MEDIA' },
      { name: 'Inspección de suspensión', priority: 'ALTA' },
      { name: 'Cambio de bujías (si aplica)', priority: 'MEDIA' },
      { name: 'Revisión de batería', priority: 'MEDIA' },
    ]
  },
  {
    minKm: 50000, maxKm: 80000,
    services: [
      { name: 'Cambio de aceite y filtro', priority: 'ALTA' },
      { name: 'Cambio de líquido de frenos', priority: 'ALTA' },
      { name: 'Inspección de correa/cadena de distribución', priority: 'ALTA' },
      { name: 'Cambio de fluido de transmisión (CVT/AT)', priority: 'ALTA' },
      { name: 'Alineación y balanceo', priority: 'MEDIA' },
    ]
  },
  {
    minKm: 80000, maxKm: 120000,
    services: [
      { name: 'Inspección de banda/cadena de distribución', priority: 'ALTA' },
      { name: 'Cambio de fluido de transmisión', priority: 'ALTA' },
      { name: 'Cambio de bujías', priority: 'ALTA' },
      { name: 'Revisión del sistema de refrigeración', priority: 'ALTA' },
      { name: 'Inspección de diferencial', priority: 'MEDIA' },
      { name: 'Cambio de líquido de dirección', priority: 'MEDIA' },
    ]
  },
  {
    minKm: 120000, maxKm: 200000,
    services: [
      { name: 'Cambio de banda de distribución (si aplica)', priority: 'ALTA' },
      { name: 'Revisión completa de motor', priority: 'ALTA' },
      { name: 'Inspección de embrague (manual)', priority: 'ALTA' },
      { name: 'Cambio de amortiguadores', priority: 'ALTA' },
      { name: 'Revisión de sistema de escape/catalizador', priority: 'MEDIA' },
    ]
  }
];

/** Obtiene los servicios recomendados por kilometraje */
export function getOemServices(km: number, brand?: string): Array<{ name: string; priority: string }> {
  const protocol = GENERIC_OEM.find(p => km >= p.minKm && km < p.maxKm);
  return protocol?.services || [];
}

/** Genera y envía protocolo OEM al registrar un vehículo */
export async function sendOemProtocol(ctx: Context, km: number, brand: string, model?: string): Promise<void> {
  // Buscar primero en BD por marca específica
  const { data: dbProtocol } = await supabase.from('oem_protocols')
    .select('*')
    .eq('brand', brand.toUpperCase())
    .eq('is_active', true)
    .lte('km_interval', km + 5000)
    .gte('km_interval', km - 5000)
    .order('km_interval', { ascending: false })
    .limit(1);

  if (dbProtocol && dbProtocol.length > 0) {
    const p = dbProtocol[0];
    await ctx.reply(fmt.oemProtocol({
      brand: p.brand,
      model: p.model || model,
      km,
      services: p.services as Array<{ name: string; priority?: string }>
    }), { parse_mode: 'HTML' });
    return;
  }

  // Usar genéricos
  const services = getOemServices(km, brand);
  if (services.length === 0) return;

  await ctx.reply(fmt.oemProtocol({ brand, model, km, services }), { parse_mode: 'HTML' });
}
