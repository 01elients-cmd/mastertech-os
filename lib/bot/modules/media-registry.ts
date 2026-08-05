import type { Context } from 'telegraf';
import { supabase } from '../supabase';
import { fmt } from '../formatter';

// Mapas temporales para deduplicar alertas en álbumes de varias fotos en serverless
const albumSharedData = new Map<string, { orderNumber: string; model: string }>();
const repliedAlbums = new Set<string>();

export function parseMediaCaption(caption: string) {
  let orderNumber = '';
  let model = '';
  if (!caption) return { orderNumber, model };

  const matchOrder = caption.match(/#(?:ot)?(\d+)/i) || caption.match(/ot[-:\s]?(\d+)/i);
  if (matchOrder) {
    orderNumber = matchOrder[1];
  }

  const cleanCaption = caption.replace(/#(?:ot)?\d+/gi, '').replace(/ot[-:\s]?\d+/gi, '').trim();

  const knownModels = ['aveo', 'spark', 'cruze', 'optra', 'corsa', 'corolla', 'yaris', 'hilux', 'fortuner', 'kavak', 'runner', 'tacoma', 'tucson', 'sportage', 'accent', 'rio', 'picanto', 'civic', 'fit', 'crv', 'sentra', 'tiida', 'march', 'versa', 'silverado', 'tahoe', 'triton', 'explorer', 'fiesta', 'focus', 'ka', 'f-150', 'd-max', 'l200', 'montero'];
  
  const words = cleanCaption.toLowerCase().split(/\s+/);
  const foundModel = words.find(w => knownModels.includes(w));

  if (foundModel) {
    model = foundModel.charAt(0).toUpperCase() + foundModel.slice(1);
  } else if (cleanCaption.length > 2 && cleanCaption.length < 30) {
    model = cleanCaption;
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
  let { orderNumber, model } = parseMediaCaption(caption);

  const isStrict = process.env.REQUIRE_MEDIA_CAPTION === 'true';
  const mediaGroupId = (message as any).media_group_id as string | undefined;

  let shouldReply = true;

  // ==========================================
  // MANEJO DE ÁLBUMES EN ENTORNO SERVERLESS
  // ==========================================
  if (mediaGroupId) {
    if (orderNumber && model) {
      albumSharedData.set(mediaGroupId, { orderNumber, model });
      setTimeout(() => albumSharedData.delete(mediaGroupId), 15000);
    } else {
      if (albumSharedData.has(mediaGroupId)) {
        const cached = albumSharedData.get(mediaGroupId)!;
        orderNumber = cached.orderNumber;
        model = cached.model;
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
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

    if (repliedAlbums.has(mediaGroupId)) {
      shouldReply = false;
    } else {
      repliedAlbums.add(mediaGroupId);
      shouldReply = true;
      setTimeout(() => repliedAlbums.delete(mediaGroupId), 15000);
    }
  }

  // ==========================================
  // FLUJO DE RECHAZO (Políticas estrictas con Aviso de Eliminación)
  // ==========================================
  if (isStrict && (!orderNumber || !model)) {
    if (shouldReply) {
      try {
        await ctx.deleteMessage();
      } catch (e) {
        console.warn('No se pudo borrar el mensaje (posiblemente el bot no es administrador):', e);
      }
      
      const warningNotice = `🗑️ <b>EVIDENCIA ELIMINADA POR FORMATO INCOMPLETO</b>\n\n` +
        `👤 <b>Técnico:</b> ${username}\n` +
        `⚠️ <b>Motivo de eliminación:</b> La opción de <i>Formato Estricto en Fotos/Videos</i> está activada y el archivo no incluía la Orden o el Modelo en la descripción.\n\n` +
        `💡 <b>¿Cómo enviarlo correctamente?</b>\n` +
        `Al adjuntar la foto/video, escribe en la descripción:\n` +
        `• <code>#5250 Toyota Corolla</code>\n` +
        `• <code>#1520 Yaris 2024</code>`;

      await ctx.reply(fmt.errorMessage(warningNotice), { 
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
        count: 1
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

async function saveMedia(
  fileId: string, 
  fileType: string, 
  caption: string, 
  threadId: number | undefined, 
  userId: number | undefined, 
  username: string, 
  orderNumber: string, 
  model: string
) {
  try {
    const payload = {
      file_id: fileId,
      file_type: fileType,
      caption: caption || null,
      message_thread_id: threadId || null,
      uploaded_by_telegram_id: userId ? String(userId) : null,
      uploaded_by_username: username,
      order_number: orderNumber || null,
      model: model || null,
    };

    const { error } = await supabase.from('media_registry').insert([payload]);
    if (error) {
      console.warn('Error al guardar en Supabase (media_registry):', error.message);
    }
  } catch (err) {
    console.error('Excepción guardando media:', err);
  }
}

export async function handleMediaDataResponse(ctx: Context): Promise<boolean> {
  const text = 'text' in ctx.message! ? ctx.message.text : '';
  if (!text) return false;

  const match = text.match(/(?:orden|ot)?\s*#?(\d+)\s+([a-zA-Z0-9\s]+)/i);
  if (match) {
    const orderNumber = match[1];
    const model = match[2].trim();
    const userId = ctx.from?.id;

    if (userId) {
      try {
        const { data: lastMedia } = await supabase
          .from('media_registry')
          .select('id')
          .eq('uploaded_by_telegram_id', String(userId))
          .is('order_number', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastMedia) {
          await supabase
            .from('media_registry')
            .update({ order_number: orderNumber, model: model })
            .eq('id', lastMedia.id);

          await ctx.reply(`✅ <b>Evidencia vinculada con éxito</b> a la Orden <b>#${orderNumber}</b> (${model}).`, { parse_mode: 'HTML' });
          return true;
        }
      } catch (e) {}
    }
  }

  return false;
}
