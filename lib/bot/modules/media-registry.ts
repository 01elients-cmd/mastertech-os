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

// Caché en memoria para evitar spam de respuestas en álbumes (funciona si comparten isolate en Serverless)
const repliedAlbums = new Set<string>();
const albumSharedData = new Map<string, { orderNumber: string; model: string }>();

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
  let { orderNumber, model } = parseMediaCaption(caption);

  const isStrict = process.env.REQUIRE_MEDIA_CAPTION === 'true';
  const mediaGroupId = (message as any).media_group_id as string | undefined;

  let shouldReply = true;

  // ==========================================
  // MANEJO DE ÁLBUMES EN ENTORNO SERVERLESS
  // ==========================================
  if (mediaGroupId) {
    // 1. Heredar la orden (si este archivo no tiene caption, buscarlo)
    if (orderNumber && model) {
      // Guardar en caché del isolate para las demás fotos
      albumSharedData.set(mediaGroupId, { orderNumber, model });
      setTimeout(() => albumSharedData.delete(mediaGroupId), 15000);
    } else {
      if (albumSharedData.has(mediaGroupId)) {
        const cached = albumSharedData.get(mediaGroupId)!;
        orderNumber = cached.orderNumber;
        model = cached.model;
      } else {
        // Retardo para dar oportunidad a que la foto con texto se guarde en la BD primero
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Buscar en la BD la subida más reciente de este usuario (últimos 15 segundos)
        const fifteenSecondsAgo = new Date(Date.now() - 15000).toISOString();
        const { data: recent } = await supabase
          .from('media_registry')
          .select('order_number, model')
          .eq('uploaded_by_telegram_id', String(userId))
          .not('order_number', 'is', null)
          .gte('created_at', fifteenSecondsAgo)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (recent && recent.order_number) {
          orderNumber = String(recent.order_number);
          model = recent.model;
          albumSharedData.set(mediaGroupId, { orderNumber, model: model || '' });
        }
      }
    }

    // 2. Control de Spam: Solo respondemos a UN mensaje por álbum
    if (repliedAlbums.has(mediaGroupId)) {
      shouldReply = false;
    } else {
      repliedAlbums.add(mediaGroupId);
      shouldReply = true;
      setTimeout(() => repliedAlbums.delete(mediaGroupId), 15000);
    }
  }

  // ==========================================
  // FLUJO DE RECHAZO (Políticas estrictas)
  // ==========================================
  if (isStrict && (!orderNumber || !model)) {
    if (shouldReply) {
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
    }
    return;
  }

  // ==========================================
  // GUARDADO Y CONFIRMACIÓN
  // ==========================================
  await saveMedia(fileId, fileType, caption, threadId, userId, username, orderNumber, model);
  
  if (shouldReply) {
    if (orderNumber && model) {
      const displayType = mediaGroupId 
        ? '📁 Álbum (Varias fotos/videos)' 
        : (fileType === 'photo' ? '📷 Foto' : fileType === 'video' ? '🎥 Video' : '📄 Doc');
        
      await ctx.reply(fmt.mediaConfirm({
        orderNumber, 
        model,
        fileType: displayType,
        count: 1 // Como es serverless, el count es simbólico para el álbum
      }), { 
        parse_mode: 'HTML', 
        reply_parameters: { message_id: message.message_id } 
      });
    } else {
      const msg = mediaGroupId 
        ? `✅ <b>Álbum recibido</b> sin orden asignada.` 
        : `✅ <b>Evidencia recibida</b> sin orden asignada.`;
        
      await ctx.reply(msg, { 
        parse_mode: 'HTML', 
        reply_parameters: { message_id: message.message_id } 
      });
    }
  }
}

export async function handleMediaDataResponse(ctx: Context): Promise<boolean> {
  // Este flujo ya no es necesario dado que borramos el mensaje inmediatamente,
  // pero lo mantenemos como stub retornando false para no romper firmas.
  return false;
}

async function saveMedia(fileId: string, fileType: string, caption: string | undefined, threadId: number | undefined, userId: number | undefined, username: string, orderNumber: string | null, model: string | null) {
  let wo = null;
  if (orderNumber) {
    const { data } = await supabase.from('work_orders').select('id, plate, brand').eq('order_number', parseInt(orderNumber)).single();
    wo = data;
  }
  
  await supabase.from('media_registry').insert([{
    work_order_id: wo?.id || null, order_number: orderNumber ? parseInt(orderNumber) : null,
    plate: wo?.plate || null, brand: wo?.brand || null, model: model || null,
    file_id: fileId, file_type: fileType, caption: caption || null,
    uploaded_by: username, uploaded_by_telegram_id: userId ? String(userId) : null, thread_id: threadId
  }]);
}

