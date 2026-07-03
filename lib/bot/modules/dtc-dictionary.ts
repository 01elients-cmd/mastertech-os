/**
 * MasterTech OS — Diccionario DTC (OBD2)
 * Comando: /dtc P0420 Toyota
 */

import type { Context } from 'telegraf';
import { supabase } from '../supabase';
import { fmt } from '../formatter';

// Códigos DTC comunes precargados (fallback si no hay BD)
const COMMON_DTC: Record<string, { desc: string; system: string; causes: string[] }> = {
  'P0420': { desc: 'Eficiencia del catalizador por debajo del umbral (Banco 1)', system: 'Powertrain', causes: ['Catalizador dañado', 'Sensor O2 defectuoso', 'Fuga en escape'] },
  'P0300': { desc: 'Fallo de encendido aleatorio/múltiples cilindros', system: 'Powertrain', causes: ['Bujías desgastadas', 'Bobinas de encendido', 'Inyectores sucios', 'Baja compresión'] },
  'P0171': { desc: 'Sistema demasiado pobre (Banco 1)', system: 'Powertrain', causes: ['Fuga de vacío', 'Sensor MAF sucio', 'Bomba de combustible débil', 'Inyectores obstruidos'] },
  'P0172': { desc: 'Sistema demasiado rico (Banco 1)', system: 'Powertrain', causes: ['Inyectores con fuga', 'Sensor MAF defectuoso', 'Regulador de presión', 'Filtro de aire tapado'] },
  'P0128': { desc: 'Temperatura del refrigerante por debajo del umbral del termostato', system: 'Powertrain', causes: ['Termostato abierto permanentemente', 'Sensor ECT defectuoso', 'Nivel bajo de refrigerante'] },
  'P0442': { desc: 'Fuga pequeña detectada en sistema EVAP', system: 'Powertrain', causes: ['Tapa de gasolina floja', 'Manguera EVAP agrietada', 'Válvula de purga', 'Canister dañado'] },
  'P0455': { desc: 'Fuga grande detectada en sistema EVAP', system: 'Powertrain', causes: ['Tapa de gasolina faltante', 'Manguera EVAP desconectada', 'Canister roto'] },
  'P0446': { desc: 'Mal funcionamiento del control de ventilación EVAP', system: 'Powertrain', causes: ['Válvula de ventilación', 'Cableado dañado', 'Filtro de canister tapado'] },
  'P0301': { desc: 'Fallo de encendido cilindro 1', system: 'Powertrain', causes: ['Bujía cilindro 1', 'Bobina cilindro 1', 'Inyector 1', 'Cable de bujía'] },
  'P0302': { desc: 'Fallo de encendido cilindro 2', system: 'Powertrain', causes: ['Bujía cilindro 2', 'Bobina cilindro 2', 'Inyector 2'] },
  'P0303': { desc: 'Fallo de encendido cilindro 3', system: 'Powertrain', causes: ['Bujía cilindro 3', 'Bobina cilindro 3', 'Inyector 3'] },
  'P0304': { desc: 'Fallo de encendido cilindro 4', system: 'Powertrain', causes: ['Bujía cilindro 4', 'Bobina cilindro 4', 'Inyector 4'] },
  'P0011': { desc: 'Posición del árbol de levas A - Avance excesivo (Banco 1)', system: 'Powertrain', causes: ['Solenoide VVT', 'Aceite de motor bajo/sucio', 'Cadena de distribución estirada'] },
  'P0016': { desc: 'Correlación posición cigüeñal/árbol de levas (Banco 1)', system: 'Powertrain', causes: ['Cadena de distribución estirada', 'Engranaje de distribución', 'Sensor CKP/CMP'] },
  'P0507': { desc: 'RPM de ralentí superior a lo esperado', system: 'Powertrain', causes: ['Fuga de vacío', 'Válvula IAC sucia', 'Cuerpo de aceleración sucio'] },
  'P0340': { desc: 'Mal funcionamiento del sensor de posición del árbol de levas', system: 'Powertrain', causes: ['Sensor CMP defectuoso', 'Cableado dañado', 'Problema de distribución'] },
  'P0401': { desc: 'Flujo insuficiente de EGR detectado', system: 'Powertrain', causes: ['Válvula EGR tapada', 'Conductos de EGR obstruidos', 'Sensor de presión diferencial'] },
  'P0500': { desc: 'Mal funcionamiento del sensor de velocidad del vehículo', system: 'Powertrain', causes: ['Sensor VSS defectuoso', 'Cableado/conector', 'Engranaje del sensor'] },
  'C0035': { desc: 'Circuito del sensor de velocidad de rueda delantera izquierda', system: 'Chassis', causes: ['Sensor ABS dañado', 'Cableado cortado', 'Tono ring dañado'] },
  'B0100': { desc: 'Circuito del sensor de impacto frontal', system: 'Body', causes: ['Sensor de impacto', 'Módulo SRS', 'Cableado del airbag'] },
  'U0100': { desc: 'Pérdida de comunicación con ECM/PCM', system: 'Network', causes: ['Bus CAN dañado', 'ECM defectuoso', 'Fusible de comunicación'] },
};

export async function handleDtcCommand(ctx: Context): Promise<void> {
  const message = ctx.message;
  if (!message || !('text' in message)) return;

  const args = message.text.split(/\s+/).slice(1);
  if (args.length === 0) {
    await ctx.reply(fmt.errorMessage('Uso: /dtc <código> [marca]\n\nEjemplos:\n  /dtc P0420\n  /dtc P0420 Toyota\n  /dtc P0171 Honda'), { parse_mode: 'HTML' });
    return;
  }

  const code = args[0].toUpperCase();
  const brand = args[1] || undefined;

  // Buscar primero en Supabase
  let result: { desc: string; system: string; causes: string[]; brand?: string } | null = null;

  const { data: dbResult } = await supabase
    .from('dtc_codes')
    .select('*')
    .eq('code', code)
    .order('brand_specific', { ascending: true, nullsFirst: true })
    .limit(1);

  if (dbResult && dbResult.length > 0) {
    const r = dbResult[0];
    result = { desc: r.description_es, system: r.system || 'Powertrain', causes: r.common_causes || [], brand: r.brand_specific };
  } else if (COMMON_DTC[code]) {
    result = { ...COMMON_DTC[code], brand };
  }

  if (!result) {
    await ctx.reply(fmt.errorMessage(`Código "${code}" no encontrado.\n\nVerifica que sea un código válido (P0xxx, B0xxx, C0xxx, U0xxx).`), { parse_mode: 'HTML' });
    return;
  }

  await ctx.reply(fmt.dtcCard({
    code,
    description: result.desc,
    system: result.system,
    causes: result.causes,
    brand: brand || result.brand,
  }), { parse_mode: 'HTML' });
}
