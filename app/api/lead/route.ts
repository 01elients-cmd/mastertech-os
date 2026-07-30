import { NextResponse } from 'next/server';
import { dbSaveRecord } from '@/lib/dashboard-db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Extraer campos admitiendo múltiples nombres de propiedades
    const nombre = body.nombre || body.client_name || body.name || 'No proporcionado';
    const telefono = body.telefono || body.phone || body.tel || 'No proporcionado';
    const vehiculo = body.vehiculo || body.vehicle || body.detalles_vehiculo || 'No especificado';

    // 2. Limpieza de Servicio y Falla para evitar duplicaciones
    let servicioRaw = body.servicio || body.service || body.motivo || 'Línea de inspección gratuita';
    let servicioClean = servicioRaw;
    let fallaExtraer = body.falla || body.fault || body.motivo || body.detalles || '';

    // Si el servicio viene concatenado con guión em (ej: "Línea de inspección gratuita — Error en tablero...")
    if (servicioRaw.includes('—')) {
      const parts = servicioRaw.split('—');
      servicioClean = parts[0].trim();
      if (!fallaExtraer || fallaExtraer === servicioRaw) {
        fallaExtraer = parts.slice(1).join('—').trim();
      }
    } else if (servicioRaw.includes('-') && servicioRaw.toLowerCase().includes('inspección') && !fallaExtraer) {
      const parts = servicioRaw.split('-');
      servicioClean = parts[0].trim();
      fallaExtraer = parts.slice(1).join('-').trim();
    }

    // 3. Formato de Fecha / Hora
    let fechaHora = body.fecha_hora || body.fecha || body.date || 'Por agendar';
    if (body.hora && !fechaHora.includes(body.hora)) {
      fechaHora = `${fechaHora} (${body.hora})`;
    }

    // 4. Sanitizar la Falla para eliminar prefijos o fechas duplicadas
    let fallaClean = fallaExtraer;
    fallaClean = fallaClean.replace(/Cita Inspección:\s*\d{4}-\d{2}-\d{2}\s*\([^)]+\)\s*/gi, '').trim();
    fallaClean = fallaClean.replace(/^Línea de inspección gratuita\s*—\s*/gi, '').trim();
    fallaClean = fallaClean.replace(/^Línea de inspección gratuita\s*/gi, '').trim();
    if (!fallaClean) {
      fallaClean = 'No especificada';
    }

    const status = body.status || 'Pendiente';

    // 5. Guardar en Base de Datos (Supabase / Local DB Fallback)
    const recordId = `lead-${Date.now()}`;
    const newRecord = {
      id: recordId,
      category: 'recepcion',
      template_key: 'NUEVO_INGRESO',
      title: `CITA: ${nombre} - ${vehiculo}`,
      client_name: nombre,
      vehicle: vehiculo,
      plate: 'N/A',
      creator: 'tallermastertech.com',
      content: `🔔 **NUEVA CITA REGISTRADA** 🔔\n\n` +
               `👤 **Nombre:** ${nombre}\n` +
               `📞 **Teléfono:** ${telefono}\n` +
               `🚗 **Vehículo:** ${vehiculo}\n` +
               `🔧 **Servicio:** ${servicioClean}\n` +
               `📅 **Fecha/Hora:** ${fechaHora}\n` +
               `⚠️ **Falla:** ${fallaClean}\n` +
               `Status: ${status}`,
      status: 'Pendiente' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    try {
      await dbSaveRecord(newRecord);
    } catch (dbErr) {
      console.warn('Error al guardar cita en BD:', dbErr);
    }

    // 6. Mensaje Formateado Exacto para Telegram sin duplicados
    const token = process.env.TELEGRAM_BOT_TOKEN || '8970513614:AAGCdMrJTbIH1QmKCFXcIzv5QxPX86e_23U';
    const targetGroup = process.env.TALLER_ORIGEN_ID || '-1003940815012';

    const telegramMessage = `🔔 *NUEVA CITA REGISTRADA* 🔔\n` +
      `👤 *Nombre:* ${nombre}\n` +
      `📞 *Teléfono:* ${telefono}\n` +
      `🚗 *Vehículo:* ${vehiculo}\n` +
      `🔧 *Servicio:* ${servicioClean}\n` +
      `📅 *Fecha/Hora:* ${fechaHora}\n` +
      `⚠️ *Falla:* ${fallaClean}\n` +
      `Status: ${status}`;

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetGroup,
          text: telegramMessage,
          parse_mode: 'Markdown'
        })
      });
    } catch (tgErr) {
      console.error('Error enviando notificación a Telegram:', tgErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Cita registrada y enviada a Telegram correctamente.',
      recordId
    });

  } catch (err: any) {
    console.error('Error procesando /api/lead:', err);
    return NextResponse.json({ error: err.message || 'Error procesando cita.' }, { status: 500 });
  }
}
