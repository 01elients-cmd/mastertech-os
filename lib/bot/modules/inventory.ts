/**
 * MasterTech OS — Módulo de Inventario y Consumibles a Granel
 * Comandos: /fluido, /inventario, /agregar_inventario, /stock
 * Soporta cantidades fraccionadas para fluidos a granel
 */

import type { Context } from 'telegraf';
import { supabase } from '../supabase';
import { fmt } from '../formatter';

/**
 * /fluido <nombre> <cantidad><unidad>
 * Ejemplo: /fluido aceite_5w30 5.5L
 * Resta la cantidad del inventario
 */
export async function handleFluidCommand(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !('text' in message)) return;

  const args = message.text.split(/\s+/).slice(1);

  if (args.length < 2) {
    await ctx.reply(fmt.errorMessage(
      'Uso: /fluido <nombre> <cantidad><unidad>\n\n' +
      'Ejemplo:\n  /fluido aceite_5w30 5.5L\n  /fluido refrigerante 2.0L\n  /fluido liquido_frenos 0.5L'
    ), { parse_mode: 'HTML' });
    return;
  }

  const itemName = args[0].replace(/_/g, ' ').toLowerCase();
  const quantityMatch = args[1].match(/^(\d+\.?\d*)\s*(l|litro|litros|gal|galon|galones|kg|kilogramo|kilogramos)?$/i);

  if (!quantityMatch) {
    await ctx.reply(fmt.errorMessage('Cantidad inválida. Usa formato: 5.5L, 2.0gal, 1.5kg'), { parse_mode: 'HTML' });
    return;
  }

  const quantity = parseFloat(quantityMatch[1]);
  const username = ctx.from?.first_name || 'Técnico';

  // Buscar item en inventario (búsqueda flexible)
  const { data: item, error: findError } = await supabase
    .from('inventory')
    .select('*')
    .ilike('name', `%${itemName}%`)
    .eq('is_active', true)
    .single();

  if (findError || !item) {
    await ctx.reply(fmt.errorMessage(
      `No se encontró "${itemName}" en inventario.\n\n` +
      `Usa /stock para ver items disponibles.`
    ), { parse_mode: 'HTML' });
    return;
  }

  if (item.quantity < quantity) {
    await ctx.reply(fmt.errorMessage(
      `Stock insuficiente de "${item.name}".\n` +
      `Disponible: ${item.quantity} ${item.unit}\n` +
      `Solicitado: ${quantity} ${item.unit}`
    ), { parse_mode: 'HTML' });
    return;
  }

  const newStock = parseFloat((item.quantity - quantity).toFixed(3));

  // Actualizar stock
  const { error: updateError } = await supabase
    .from('inventory')
    .update({ quantity: newStock })
    .eq('id', item.id);

  if (updateError) {
    await ctx.reply(fmt.errorMessage('Error actualizando inventario.'), { parse_mode: 'HTML' });
    return;
  }

  // Registrar movimiento
  await supabase.from('inventory_movements').insert([{
    inventory_id: item.id,
    movement_type: 'SALIDA',
    quantity: quantity,
    previous_stock: item.quantity,
    new_stock: newStock,
    reason: `Uso reportado por ${username}`,
    registered_by: username,
    registered_by_telegram_id: String(ctx.from?.id || '')
  }]);

  // Responder con tarjeta de inventario
  await ctx.reply(fmt.inventoryCard({
    name: item.name,
    category: item.category,
    quantity: newStock,
    unit: item.unit,
    minStock: item.min_stock,
    action: 'SALIDA',
    delta: quantity
  }), { parse_mode: 'HTML' });

  // Si está bajo el mínimo, generar alerta
  if (newStock <= item.min_stock) {
    const alertMsg = fmt.alertCard({
      type: 'INVENTARIO BAJO',
      severity: newStock <= 0 ? 'CRITICA' : 'ALTA',
      title: `⚠️ Reponer: ${item.name}`,
      message: `Stock actual: ${newStock} ${item.unit}\nMínimo: ${item.min_stock} ${item.unit}\nProveedor: ${item.supplier || 'N/A'}`,
    });
    await ctx.reply(alertMsg, { parse_mode: 'HTML' });
  }
}

/**
 * /stock — Ver todo el inventario
 */
export async function handleStockCommand(ctx: Context): Promise<void> {
  const { data: items, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name');

  if (error || !items || items.length === 0) {
    await ctx.reply(fmt.errorMessage('No hay items en inventario.'), { parse_mode: 'HTML' });
    return;
  }

  let currentCategory = '';
  const lines: string[] = [
    `📦 INVENTARIO GENERAL`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``
  ];

  for (const item of items) {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      lines.push(`── ${currentCategory} ──`);
    }

    const status = item.quantity <= item.min_stock
      ? '🔴'
      : item.quantity <= item.min_stock * 1.5
        ? '🟡'
        : '🟢';

    lines.push(`${status} ${item.name}: ${item.quantity} ${item.unit}`);
  }

  lines.push(``, `Total: ${items.length} items`);

  await ctx.reply(`<pre>${lines.join('\n')}</pre>`, { parse_mode: 'HTML' });
}

/**
 * /agregar_inventario <nombre> <cantidad> <categoría> <unidad> <mínimo>
 * Ejemplo: /agregar_inventario aceite_5w30 200 FLUIDO litro 15
 */
export async function handleAddInventoryCommand(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !('text' in message)) return;

  const args = message.text.split(/\s+/).slice(1);

  if (args.length < 4) {
    await ctx.reply(fmt.errorMessage(
      'Uso: /agregar_inventario <nombre> <cantidad> <categoría> <unidad> [mínimo]\n\n' +
      'Categorías: REPUESTO, FLUIDO, CONSUMIBLE, HERRAMIENTA, ACCESORIO\n' +
      'Unidades: unidad, litro, galon, kilogramo, metro, par, juego\n\n' +
      'Ejemplo:\n  /agregar_inventario aceite_5w30 200 FLUIDO litro 15'
    ), { parse_mode: 'HTML' });
    return;
  }

  const name = args[0].replace(/_/g, ' ');
  const quantity = parseFloat(args[1]);
  const category = args[2].toUpperCase();
  const unit = args[3].toLowerCase();
  const minStock = args[4] ? parseFloat(args[4]) : 0;

  const validCategories = ['REPUESTO', 'FLUIDO', 'CONSUMIBLE', 'HERRAMIENTA', 'ACCESORIO'];
  const validUnits = ['unidad', 'litro', 'galon', 'kilogramo', 'metro', 'par', 'juego'];

  if (!validCategories.includes(category)) {
    await ctx.reply(fmt.errorMessage(`Categoría inválida. Usa: ${validCategories.join(', ')}`), { parse_mode: 'HTML' });
    return;
  }

  if (!validUnits.includes(unit)) {
    await ctx.reply(fmt.errorMessage(`Unidad inválida. Usa: ${validUnits.join(', ')}`), { parse_mode: 'HTML' });
    return;
  }

  const { data: existing } = await supabase
    .from('inventory')
    .select('id, quantity')
    .ilike('name', name)
    .single();

  if (existing) {
    // Actualizar cantidad existente
    const newQty = existing.quantity + quantity;
    await supabase.from('inventory').update({ quantity: newQty }).eq('id', existing.id);

    await supabase.from('inventory_movements').insert([{
      inventory_id: existing.id,
      movement_type: 'ENTRADA',
      quantity,
      previous_stock: existing.quantity,
      new_stock: newQty,
      reason: 'Reposición de stock',
      registered_by: ctx.from?.first_name || 'Admin',
      registered_by_telegram_id: String(ctx.from?.id || '')
    }]);

    await ctx.reply(fmt.inventoryCard({
      name, category, quantity: newQty, unit, minStock, action: 'ENTRADA', delta: quantity
    }), { parse_mode: 'HTML' });
  } else {
    // Crear nuevo item
    const { error } = await supabase.from('inventory').insert([{
      name, category, unit, quantity, min_stock: minStock
    }]);

    if (error) {
      await ctx.reply(fmt.errorMessage(`Error creando item: ${error.message}`), { parse_mode: 'HTML' });
      return;
    }

    await ctx.reply(fmt.successMessage(
      `Item "${name}" creado.\n\nStock: ${quantity} ${unit}\nCategoría: ${category}\nMínimo: ${minStock} ${unit}`
    ), { parse_mode: 'HTML' });
  }
}

/**
 * /reabastecer <nombre> <cantidad>
 * Para agregar stock a un item existente
 */
export async function handleRestockCommand(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !('text' in message)) return;

  const args = message.text.split(/\s+/).slice(1);

  if (args.length < 2) {
    await ctx.reply(fmt.errorMessage('Uso: /reabastecer <nombre> <cantidad>\nEjemplo: /reabastecer aceite_5w30 50'), { parse_mode: 'HTML' });
    return;
  }

  const itemName = args[0].replace(/_/g, ' ').toLowerCase();
  const quantity = parseFloat(args[1]);

  const { data: item, error: findError } = await supabase
    .from('inventory')
    .select('*')
    .ilike('name', `%${itemName}%`)
    .eq('is_active', true)
    .single();

  if (findError || !item) {
    await ctx.reply(fmt.errorMessage(`No se encontró "${itemName}" en inventario.`), { parse_mode: 'HTML' });
    return;
  }

  const newStock = parseFloat((item.quantity + quantity).toFixed(3));

  await supabase.from('inventory').update({ quantity: newStock }).eq('id', item.id);

  await supabase.from('inventory_movements').insert([{
    inventory_id: item.id,
    movement_type: 'ENTRADA',
    quantity,
    previous_stock: item.quantity,
    new_stock: newStock,
    reason: `Reabastecimiento por ${ctx.from?.first_name || 'Admin'}`,
    registered_by: ctx.from?.first_name || 'Admin',
    registered_by_telegram_id: String(ctx.from?.id || '')
  }]);

  await ctx.reply(fmt.inventoryCard({
    name: item.name,
    category: item.category,
    quantity: newStock,
    unit: item.unit,
    minStock: item.min_stock,
    action: 'ENTRADA',
    delta: quantity
  }), { parse_mode: 'HTML' });
}
