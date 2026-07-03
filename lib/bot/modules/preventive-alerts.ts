/**
 * MasterTech OS — Módulo de Alertas Preventivas
 * Detecta keywords de alto riesgo en los mensajes de los técnicos
 * y dispara alertas automáticas a gerencia.
 */

import type { Context } from 'telegraf';
import { supabase } from '../supabase';
import { fmt } from '../formatter';

// Diccionario de palabras clave y su severidad
const KEYWORD_RULES: Array<{
  keywords: string[];
  severity: 'ALTA' | 'CRITICA';
  category: string;
}> = [
  {
    keywords: ['fuga', 'fuge', 'goteo', 'bota aceite', 'bota agua', 'bota refrigerante'],
    severity: 'CRITICA',
    category: 'FUGA DETECTADA'
  },
  {
    keywords: ['retraso', 'retrasado', 'demora', 'demorado', 'atrasado', 'atraso'],
    severity: 'ALTA',
    category: 'RETRASO OPERATIVO'
  },
  {
    keywords: ['falta pieza', 'falta repuesto', 'no hay', 'no tenemos', 'sin stock', 'agotado', 'falta aceite', 'falta filtro'],
    severity: 'ALTA',
    category: 'FALTA DE REPUESTO'
  },
  {
    keywords: ['daño', 'dañó', 'rayón', 'rayon', 'golpe', 'abolladura', 'roto', 'quebrado'],
    severity: 'CRITICA',
    category: 'DAÑO DETECTADO'
  },
  {
    keywords: ['cliente molesto', 'cliente enojado', 'queja', 'reclamo', 'inconformidad'],
    severity: 'ALTA',
    category: 'QUEJA DE CLIENTE'
  },
  {
    keywords: ['accidente', 'lesión', 'lesion', 'herida', 'emergencia'],
    severity: 'CRITICA',
    category: 'INCIDENTE DE SEGURIDAD'
  },
  {
    keywords: ['no enciende', 'no arranca', 'no prende', 'se apagó', 'se apago', 'se quedó', 'varado'],
    severity: 'ALTA',
    category: 'FALLA CRÍTICA'
  }
];

/**
 * Analiza un mensaje de texto y detecta keywords de alerta
 */
export function detectAlertKeywords(text: string): {
  detected: boolean;
  matches: Array<{ keyword: string; severity: string; category: string }>;
} {
  const lowerText = text.toLowerCase();
  const matches: Array<{ keyword: string; severity: string; category: string }> = [];

  for (const rule of KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerText.includes(keyword)) {
        matches.push({
          keyword,
          severity: rule.severity,
          category: rule.category
        });
        break; // solo una coincidencia por regla
      }
    }
  }

  return { detected: matches.length > 0, matches };
}

/**
 * Procesa un mensaje y dispara alertas si se detectan keywords
 */
export async function processPreventiveAlerts(
  ctx: Context,
  text: string,
  managementThreadId: number
): Promise<void> {
  const { detected, matches } = detectAlertKeywords(text);

  if (!detected) return;

  // Determinar la severidad más alta
  const maxSeverity = matches.some(m => m.severity === 'CRITICA') ? 'CRITICA' : 'ALTA';
  const categories = [...new Set(matches.map(m => m.category))];
  const keywords = matches.map(m => m.keyword);

  const username = ctx.from?.first_name || 'Técnico';
  const threadId = 'message_thread_id' in (ctx.message || {})
    ? (ctx.message as any).message_thread_id
    : undefined;

  // Guardar alerta en BD
  const { error } = await supabase.from('alerts').insert([{
    type: 'PREVENTIVA',
    severity: maxSeverity,
    title: `${categories.join(' + ')}`,
    message: `Reportado por ${username} en hilo ${threadId || 'N/A'}:\n\n"${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`,
    keywords_detected: keywords,
    notified_at: new Date().toISOString(),
    target_thread_id: managementThreadId
  }]);

  if (error) {
    console.error('Error guardando alerta preventiva:', error);
  }

  // Enviar alerta al hilo de gerencia
  const alertMessage = fmt.alertCard({
    type: categories.join(' | '),
    severity: maxSeverity,
    title: `Detectado en reporte de ${username}`,
    message: `"${text.substring(0, 300)}${text.length > 300 ? '...' : ''}"`,
  });

  try {
    const chatId = ctx.chat?.id;
    if (chatId) {
      await ctx.telegram.sendMessage(chatId, alertMessage, {
        parse_mode: 'HTML',
        message_thread_id: managementThreadId
      });
    }
  } catch (err) {
    console.error('Error enviando alerta a gerencia:', err);
  }
}
