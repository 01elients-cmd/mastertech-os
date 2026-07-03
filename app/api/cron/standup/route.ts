/**
 * Cron: Daily Standup — 7:30 AM
 * Vercel Cron or external caller
 */
import { NextResponse } from 'next/server';
import { generateStandupData } from '@/lib/bot/modules/knowledge-briefing';
import { fmt } from '@/lib/bot/formatter';
import { bot } from '@/lib/bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Verificar cron secret
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await generateStandupData();
    const message = fmt.standupReport(data);

    const chatId = process.env.MASTERTECH_GROUP_ID;
    const threadId = process.env.MANAGEMENT_THREAD_ID;

    if (chatId) {
      await bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        message_thread_id: threadId ? parseInt(threadId) : undefined
      });
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error('Error en standup cron:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}
