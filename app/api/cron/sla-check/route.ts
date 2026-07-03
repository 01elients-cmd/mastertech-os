/**
 * Cron: SLA Check — cada 30 min
 * Verifica vehículos estancados
 */
import { NextResponse } from 'next/server';
import { checkSlaViolations } from '@/lib/bot/modules/sla-oem';
import { bot } from '@/lib/bot';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const chatId = parseInt(process.env.MASTERTECH_GROUP_ID || '0');
    const threadId = parseInt(process.env.MANAGEMENT_THREAD_ID || '0');

    if (!chatId) {
      return NextResponse.json({ error: 'No chat ID configured' }, { status: 400 });
    }

    const sendAlert = async (cid: number, tid: number, message: string) => {
      await bot.telegram.sendMessage(cid, message, {
        parse_mode: 'HTML',
        message_thread_id: tid || undefined
      });
    };

    const result = await checkSlaViolations(sendAlert, chatId, threadId);
    return NextResponse.json({ ok: true, violations: result.violations });
  } catch (error) {
    console.error('Error en SLA check cron:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
