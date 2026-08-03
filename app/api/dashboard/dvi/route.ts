import { NextResponse } from 'next/server';
import { dbGetDviReports, dbSaveDviReport, dbDeleteDviReport } from '@/lib/dvi-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reports = await dbGetDviReports();
    return NextResponse.json({ reports });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const reportData = await req.json();
    if (!reportData.vehicle_name) {
      return NextResponse.json({ error: 'El nombre del vehículo es obligatorio.' }, { status: 400 });
    }

    if (!reportData.id) {
      reportData.id = `dvi-${Date.now()}`;
    }

    reportData.updated_at = new Date().toISOString();
    if (!reportData.created_at) {
      reportData.created_at = new Date().toISOString();
    }

    const report = await dbSaveDviReport(reportData);

    // Enviar notificación limpia a Telegram # General si se incluye el parámetro notifyTelegram
    if (reportData.notifyTelegram) {
      const token = process.env.TELEGRAM_BOT_TOKEN || '8970513614:AAGCdMrJTbIH1QmKCFXcIzv5QxPX86e_23U';
      const targetGroup = process.env.TALLER_ORIGEN_ID || '-1003940815012';

      const statusIcon = report.overall_status === 'BUENO' ? '🟢' : (report.overall_status === 'ATENCION' ? '🟡' : '🔴');

      const telegramMsg = `📋 *INSPECCIÓN DIGITAL DVI FINALIZADA* ${statusIcon}\n\n` +
        `🚗 *Vehículo:* ${report.vehicle_name} (Placa: ${report.plate || 'N/A'})\n` +
        `👤 *Cliente:* ${report.client_name || 'N/A'}\n` +
        `🆔 *Orden (OT):* ${report.ot_number || 'N/A'}\n` +
        `👨‍🔧 *Técnico:* ${report.technician_name || 'MasterTech'}\n` +
        `📊 *Puntaje Salud:* \`${report.health_score}%\`\n\n` +
        `💬 *Dictamen Técnico:*\n_${report.technician_summary.substring(0, 250)}..._`;

      try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: targetGroup,
            message_thread_id: 1,
            text: telegramMsg,
            parse_mode: 'Markdown'
          })
        });
      } catch (tgErr) {
        console.warn('Error notificando DVI a Telegram:', tgErr);
      }
    }

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Falta parámetro id' }, { status: 400 });
    }
    await dbDeleteDviReport(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
