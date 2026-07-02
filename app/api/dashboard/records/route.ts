import { NextResponse } from 'next/server';
import { dbGetRecords, dbUpsertRecord, dbDeleteRecord, SopRecord } from '@/lib/dashboard-db';

export async function GET() {
  try {
    const records = await dbGetRecords();
    return NextResponse.json({ records });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Simple validation
    if (!body.category || !body.title || !body.content) {
      return NextResponse.json({ error: 'Faltan campos requeridos: category, title, y content' }, { status: 400 });
    }

    const record: SopRecord = {
      id: body.id || `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: body.category,
      template_key: body.template_key || '',
      title: body.title,
      client_name: body.client_name || '',
      vehicle: body.vehicle || '',
      plate: body.plate || '',
      creator: body.creator || 'Admin',
      content: body.content,
      status: body.status || 'Pendiente',
      created_at: body.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const saved = await dbUpsertRecord(record);
    return NextResponse.json({ success: true, record: saved });
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
    const success = await dbDeleteRecord(id);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
