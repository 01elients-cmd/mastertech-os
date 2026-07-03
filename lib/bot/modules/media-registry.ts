/**
 * MasterTech OS — Registro Obligatorio de Media
 * Cada foto/video DEBE incluir modelo de vehículo y número de orden.
 */

import type { Context } from 'telegraf';
import { supabase } from '../supabase';
import { fmt } from '../formatter';

function parseMediaCaption(caption: string) {
  const otMatch = caption.match(/#OT\s*(\d+)/i);
  const orderNumber = otMatch ? otMatch[1] : null;
  let model: string | null = null;
  if (orderNumber) {
    const rest = caption.replace(/#OT\s*\d+/i, '').trim();
    if (rest.length > 0) model = rest.split('\n')[0].trim();
  }
  return { orderNumber, model };
}

export async function handleMediaMessage(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message) return;

  let fileId = '';
  let fileType: 'photo' | 'video' | 'document' = 'photo';
  if ('photo' in message && message.photo) {
    fileId = message.photo[message.photo.length - 1].file_id;
  } else if ('video' in message && message.video) {
    fileId = message.video.file_id; fileType = 'video';
  } else if ('document' in message && message.document) {
    fileId = message.document.file_id; fileType = 'document';
  }
  if (!fileId) return;

  const caption = ('caption' in message ? message.caption : '') || '';
  const threadId = 'message_thread_id' in message ? (message as any).message_thread_id : undefined;
  const userId = ctx.from?.id;
  const username = ctx.from?.first_name || 'Técnico';
  const { orderNumber, model } = parseMediaCaption(caption);

  if (!orderNumber || !model) {
    if (userId) {
      await supabase.from('bot_sessions').upsert({
        telegram_user_id: String(userId),
        current_state: 'WAITING_MEDIA_DATA',
        thread_id: String(threadId || ''),
        temporary_payload: { pending_media: { fileId, fileType, caption, threadId } },
        last_interaction: new Date().toISOString()
      }, { onConflict: 'telegram_user_id' });
    }
    await ctx.reply(fmt.mediaPrompt(username), {
      parse_mode: 'HTML',
      reply_parameters: { message_id: message.message_id }
    });
    return;
  }

  await saveMedia(fileId, fileType, caption, threadId, userId, username, orderNumber, model);
  await ctx.reply(fmt.mediaConfirm({
    orderNumber, model,
    fileType: fileType === 'photo' ? '📷 Foto' : fileType === 'video' ? '🎥 Video' : '📄 Doc',
    count: 1
  }), { parse_mode: 'HTML', reply_parameters: { message_id: message.message_id } });
}

export async function handleMediaDataResponse(ctx: Context): Promise<boolean> {
  const message = ctx.message;
  if (!message || !('text' in message)) return false;
  const userId = ctx.from?.id;
  if (!userId) return false;

  const { data: session } = await supabase.from('bot_sessions')
    .select('*').eq('telegram_user_id', String(userId)).eq('current_state', 'WAITING_MEDIA_DATA').single();
  if (!session?.temporary_payload?.pending_media) return false;

  const { orderNumber, model } = parseMediaCaption(message.text);
  if (!orderNumber || !model) {
    await ctx.reply(fmt.errorMessage('Formato: #OT1234 Toyota Tacoma'), {
      parse_mode: 'HTML', reply_parameters: { message_id: message.message_id }
    });
    return true;
  }

  const pm = session.temporary_payload.pending_media;
  await saveMedia(pm.fileId, pm.fileType, pm.caption, pm.threadId, userId, ctx.from?.first_name || 'Técnico', orderNumber, model);
  await supabase.from('bot_sessions').update({ current_state: 'IDLE', temporary_payload: null }).eq('telegram_user_id', String(userId));
  await ctx.reply(fmt.mediaConfirm({ orderNumber, model, fileType: pm.fileType === 'photo' ? '📷 Foto' : '🎥 Video', count: 1 }), {
    parse_mode: 'HTML', reply_parameters: { message_id: message.message_id }
  });
  return true;
}

async function saveMedia(fileId: string, fileType: string, caption: string | undefined, threadId: number | undefined, userId: number | undefined, username: string, orderNumber: string, model: string) {
  const { data: wo } = await supabase.from('work_orders').select('id, plate, brand').eq('order_number', parseInt(orderNumber)).single();
  await supabase.from('media_registry').insert([{
    work_order_id: wo?.id || null, order_number: parseInt(orderNumber),
    plate: wo?.plate || null, brand: wo?.brand || null, model,
    file_id: fileId, file_type: fileType, caption: caption || null,
    uploaded_by: username, uploaded_by_telegram_id: userId ? String(userId) : null, thread_id: threadId
  }]);
}
