import { NextResponse } from 'next/server';
import { bot } from '@/lib/bot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const secret = req.headers.get('x-telegram-bot-api-secret-token');
    const expectedSecret = process.env.TELEGRAM_SECRET_TOKEN;

    // Solo rechazar si existe un TELEGRAM_SECRET_TOKEN configurado Y se envió un header que no coincide
    if (expectedSecret && secret && secret !== expectedSecret) {
      console.warn('Telegram Webhook: secret token mismatch');
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    await bot.handleUpdate(body);

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Error crítico procesando Webhook Telegraf:', error);
    return NextResponse.json({ error: 'Error manejado' }, { status: 200 });
  }
}
