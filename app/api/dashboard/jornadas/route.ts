import { NextResponse } from 'next/server';
import { dbGetJornadas, dbUpsertJornada, dbDeleteJornada, Jornada } from '@/lib/dashboard-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const jornadas = await dbGetJornadas();
    return NextResponse.json({ jornadas });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.username || !body.status) {
      return NextResponse.json({ error: 'Faltan campos requeridos: username y status' }, { status: 400 });
    }

    const id = body.id || `jor-${Date.now()}`;
    const started_at = body.started_at || new Date().toISOString();
    const ended_at = body.ended_at || null;

    const jornada: Jornada = {
      id,
      telegram_id: body.telegram_id || 0,
      username: body.username,
      started_at,
      ended_at,
      status: body.status,
    };

    const saved = await dbUpsertJornada(jornada);
    return NextResponse.json({ success: true, jornada: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido para eliminar' }, { status: 400 });
    }
    const success = await dbDeleteJornada(id);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
