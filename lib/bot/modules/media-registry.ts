/**
 * MasterTech OS — Registro Obligatorio de Media
 * Cada foto/video DEBE incluir modelo de vehículo y número de orden.
 * Si no se incluye, el bot rechaza y borra el mensaje para evitar desorden.
 */

import type { Context } from 'telegraf';
import { supabase } from '../supabase';
import { fmt } from '../formatter';

function parseMediaCaption(caption: string) {
  // Soporta tanto #OT1643 como #1643
  const otMatch = caption.match(/(?:#OT|#)\s*(\d+)/i);
  const orderNumber = otMatch ? otMatch[1] : null;
  let model: string | null = null;
  
  if (orderNumber) {
    // Quita el tag #OT o # seguido del número
    const rest = caption.replace(/(?:#OT|#)\s*\d+/i, '').trim();
    if (rest.length > 0) {
      model = rest.split('\n')[0].trim();
    }
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

  // Politica Estricta: Si no tiene orden o modelo, se borra el mensaje y se rechaza
  if (!orderNumber || !model) {
    try {
      await ctx.deleteMessage();
    } catch (e) {
      console.warn('No se pudo borrar el mensaje (posiblemente el bot no es administrador):', e);
    }
    
    await ctx.reply(fmt.errorMessage(
      `⚠️ <b>REGISTRO DE EVIDENCIA RECHAZADO</b>\n\n${username}, para enviar fotos, videos o documentos debes escribir el <b>modelo del carro</b> y el <b>número de orden</b> en la descripción de la foto al momento de enviarla.\n\n<b>Ejemplos de descripción válidos:</b>\n• <code>Kia Picanto #1643</code>\n• <code>Toyota Tacoma #OT5201</code>`
    ), { 
      parse_mode: 'HTML',
      message_thread_id: threadId
    });
    return;
  }

  await saveMedia(fileId, fileType, caption, threadId, userId, username, orderNumber, model);
  await ctx.reply(fmt.mediaConfirm({
    orderNumber, model,
    fileType: fileType === 'photo' ? '📷 Foto' : fileType === 'video' ? '🎥 Video' : '📄 Doc',
    count: 1
  }), { 
    parse_mode: 'HTML', 
    reply_parameters: { message_id: message.message_id } 
  });
}

export async function handleMediaDataResponse(ctx: Context): Promise<boolean> {
  // Este flujo ya no es necesario dado que borramos el mensaje inmediatamente,
  // pero lo mantenemos como stub retornando false para no romper firmas.
  return false;
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
