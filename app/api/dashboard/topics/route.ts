import { NextResponse } from 'next/server';
import { getAllVehicleTopics, saveVehicleTopic, deleteVehicleTopic, updateVehicleTopic } from '@/lib/bot/topic-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const topics = await getAllVehicleTopics();
    return NextResponse.json({ topics });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { topicTitle, orden, vehiculo } = await req.json();
    if (!topicTitle) {
      return NextResponse.json({ error: 'Falta el título del tema/hilo' }, { status: 400 });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN || '8970513614:AAGCdMrJTbIH1QmKCFXcIzv5QxPX86e_23U';
    const nubeChatId = process.env.TALLER_FORO_DESTINO_ID || '-1003975478850';

    const formattedTitle = topicTitle.startsWith('🚗') ? topicTitle : `🚗 ${topicTitle}`;

    // 1. Crear el tema en el supergrupo de Telegram
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/createForumTopic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: nubeChatId,
        name: formattedTitle
      })
    });

    const tgData = await tgRes.json();
    if (!tgData.ok) {
      return NextResponse.json({ error: `Telegram Error: ${tgData.description || 'No se pudo crear el tema en Telegram.'}` }, { status: 400 });
    }

    const threadId = tgData.result.message_thread_id;

    // 2. Guardar en el almacén híbrido
    await saveVehicleTopic(threadId, formattedTitle, orden, vehiculo);

    // 3. Notificar en # General si aplica
    const operacionesChatId = process.env.TALLER_ORIGEN_ID || '-1003940815012';
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: operacionesChatId,
          message_thread_id: 1,
          text: `☁️ *NUBE - Hilo Creado desde el Panel Web*\n\n✅ *Tema:* "${formattedTitle}"\n🆔 *ID de Hilo:* \`${threadId}\``,
          parse_mode: 'Markdown'
        })
      });
    } catch (e) {}

    return NextResponse.json({ success: true, thread_id: threadId, identifier: formattedTitle });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { thread_id, mainTitle, aliases } = await req.json();
    if (!thread_id || !mainTitle) {
      return NextResponse.json({ error: 'Falta thread_id o mainTitle' }, { status: 400 });
    }

    const numericId = typeof thread_id === 'string' ? parseInt(thread_id, 10) : thread_id;
    const token = process.env.TELEGRAM_BOT_TOKEN || '8970513614:AAGCdMrJTbIH1QmKCFXcIzv5QxPX86e_23U';
    const nubeChatId = process.env.TALLER_FORO_DESTINO_ID || '-1003975478850';

    const cleanTitle = mainTitle.startsWith('🚗') ? mainTitle : `🚗 ${mainTitle}`;

    // 1. Renombrar el tema en Telegram si es posible
    try {
      await fetch(`https://api.telegram.org/bot${token}/editForumTopic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: nubeChatId,
          message_thread_id: numericId,
          name: cleanTitle
        })
      });
    } catch (e) {}

    // 2. Actualizar palabras clave en la base de datos híbrida
    await updateVehicleTopic(numericId, cleanTitle, aliases || []);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('thread_id');
    if (!threadId) {
      return NextResponse.json({ error: 'Falta el parámetro thread_id' }, { status: 400 });
    }

    const numericId = parseInt(threadId, 10);
    const token = process.env.TELEGRAM_BOT_TOKEN || '8970513614:AAGCdMrJTbIH1QmKCFXcIzv5QxPX86e_23U';
    const nubeChatId = process.env.TALLER_FORO_DESTINO_ID || '-1003975478850';

    // 1. Intentar eliminar el hilo en Telegram
    try {
      await fetch(`https://api.telegram.org/bot${token}/deleteForumTopic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: nubeChatId,
          message_thread_id: numericId
        })
      });
    } catch (e) {}

    // 2. Eliminar del almacén híbrido
    await deleteVehicleTopic(numericId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
