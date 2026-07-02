import { NextResponse } from 'next/server';
import { dbGetTemplates, dbUpsertTemplate } from '@/lib/dashboard-db';

export async function GET() {
  try {
    const templates = await dbGetTemplates();
    return NextResponse.json({ templates });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { key, title, content, category } = await req.json();
    if (!key || !content) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos: key y content' }, { status: 400 });
    }
    const template = await dbUpsertTemplate(key, title || key, content, category || 'otros');
    return NextResponse.json({ success: true, template });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
