import { NextResponse } from 'next/server';
import { decodeVin } from '@/lib/vin-decoder';

export const runtime = 'nodejs';

const SYSTEM_INSTRUCTION = `Eres el Asesor Técnico Avanzado IA de "Taller MasterTech".
Tu personalidad es profesional, cercana, altamente fluida y con un profundo dominio técnico automotriz.

CAPACIDADES:
- Puedes mantener conversaciones abiertas y naturales sobre fallas mecánicas, ruidos, fugas, códigos de falla DTC (OBD-II), reprogramaciones de ECU/PCM, cajas automáticas/CVT, sistemas de inyección y mantenimiento preventivo OEM.
- Si el usuario proporciona un código VIN (Número de Chasis de 17 dígitos) o si detectas uno en la conversación, debes decodificarlo usando la herramienta 'decode_vin' o integrar las especificaciones técnicas del vehículo en tu asesoría (marca, modelo, año, cilindraje, motor, tipo de tracción y transmisión).
- Respuestas claras, estructuradas en Markdown técnico y siempre enfocadas en ofrecer soluciones prácticas y citar al taller para diagnósticos de precisión.`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Formato de mensajes inválido.' }, { status: 400 });
    }

    const lastUserMsg = messages[messages.length - 1]?.content || '';
    
    // 1. Detectar si hay un código VIN de 17 caracteres
    const vinRegex = /\b[A-HJ-NPR-Z0-9]{17}\b/i;
    const vinMatch = lastUserMsg.match(vinRegex);

    let decodedVinData: any = null;
    if (vinMatch) {
      decodedVinData = await decodeVin(vinMatch[0]);
    }

    // 2. Intentar llamar a la API de Gemini si hay API Key configurada
    if (apiKey) {
      try {
        const contents = messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));

        let systemPromptWithVin = SYSTEM_INSTRUCTION;
        if (decodedVinData) {
          systemPromptWithVin += `\n\n[ESPECIFICACIONES TÉCNICAS DECODIFICADAS DEL VEHÍCULO (VIN: ${decodedVinData.vin})]:
Marca: ${decodedVinData.make}
Modelo: ${decodedVinData.model}
Año: ${decodedVinData.year}
Motor: ${decodedVinData.displacementL || 'N/A'}L (${decodedVinData.engineCylinders || 'N/A'} Cilindros)
Tracción: ${decodedVinData.driveType || 'N/A'}
Combustible: ${decodedVinData.fuelType || 'N/A'}
Transmisión: ${decodedVinData.transmissionStyle || 'N/A'}
País Ensamblaje: ${decodedVinData.plantCountry || 'N/A'}`;
        }

        const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-pro'];

        for (const model of modelsToTry) {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const res = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPromptWithVin }] },
              contents: contents
            })
          });

          if (res.ok) {
            const data = await res.json();
            const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textPart) {
              return NextResponse.json({
                role: 'assistant',
                content: textPart,
                decodedVin: decodedVinData
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn('Advertencia en llamado Gemini API, usando respuesta técnica avanzada:', geminiErr);
      }
    }

    // 3. Generación de Respuesta Técnica Asistida Automotriz MasterTech
    let smartReply = '';

    if (decodedVinData) {
      smartReply = `🚘 **Decodificación Oficial de VIN (${decodedVinData.vin})**\n\n` +
        `• **Vehículo:** ${decodedVinData.make} ${decodedVinData.model} (${decodedVinData.year})\n` +
        `• **Motorización:** ${decodedVinData.displacementL || 'N/A'}L ${decodedVinData.engineCylinders ? decodedVinData.engineCylinders + ' Cilindros' : ''}\n` +
        `• **Tracción:** ${decodedVinData.driveType || 'N/A'} | **Combustible:** ${decodedVinData.fuelType || 'N/A'}\n` +
        `• **Transmisión:** ${decodedVinData.transmissionStyle || 'N/A'}\n` +
        `• **Origen Fabricación:** ${decodedVinData.plantCountry || 'N/A'}\n\n` +
        `👨‍🔧 **Asesoría Técnica MasterTech:**\n` +
        `Con las especificaciones de tu **${decodedVinData.make} ${decodedVinData.model} ${decodedVinData.year}**, podemos realizar diagnósticos de nivel concesionario OEM (escaneo de módulos PCM/TCM/ABS, calibración de cuerpos de aceleración y prueba de estanqueidad de inyectores).\n\n` +
        `¿Qué sintoma o falla presenta actualmente el vehículo?`;
    } else if (lastUserMsg.toLowerCase().includes('dtc') || lastUserMsg.toLowerCase().includes('p0')) {
      smartReply = `👨‍🔧 **Diagnóstico de Código de Falla DTC (OBD-II)**\n\n` +
        `Los códigos de falla almacenados en la computadora (PCM/ECU) requieren una verificación sistemática:\n` +
        `1. **Lectura de Congelado de Pantalla (Freeze Frame):** Para ver parámetros de mezcla, temperatura y RPM al momento de la falla.\n` +
        `2. **Prueba de Sensores:** Verificación de voltajes de señal (0-5V) con osciloscopio.\n` +
        `3. **Prueba de Actuadores:** Pruebas bi-direccionales de solenoides y relés.\n\n` +
        `Si tienes el número de código exacto (Ej: P0300, P0420) o el código VIN del auto, envíalo para consultar la carta de diagnóstico OEM.`;
    } else if (lastUserMsg.toLowerCase().includes('ruido') || lastUserMsg.toLowerCase().includes('falla') || lastUserMsg.toLowerCase().includes('vibracion')) {
      smartReply = `🔧 **Análisis de Falla y Diagnóstico de Ruidos / Vibraciones**\n\n` +
        `Para aislar con precisión la causa del síntoma en Taller MasterTech evaluamos:\n` +
        `• **En Aceleración / Tracción:** Posible desgaste en trisetats, punta de eje, bases de motor agrietadas o desbalanceo de cauchos.\n` +
        `• **En Frenado / Curvas:** Desgaste en pastillas/discos alabeados, baleros de maza o bujes de meseta agrietados.\n` +
        `• **Motor / Ralentí:** Fugas de vacío, descompresión de cilindro o falla de ignición (bobinas/bujías).\n\n` +
        `Te recomendamos traer el vehículo para una inspección visual en elevador con nuestro equipo técnico. Si tienes el VIN del carro, escríbelo aquí para verificar sus componentes exactos.`;
    } else {
      smartReply = `👋 **¡Bienvenido a Taller MasterTech!**\n\n` +
        `Como tu Asesor Técnico automotriz, puedo ayudarte en:\n` +
        `• **Decodificación de VIN:** Pega un código de 17 dígitos y te daré las especificaciones técnicas oficiales de fábrica.\n` +
        `• **Diagnóstico de Fallas:** Consulta sobre ruidos, botes de aceite/refrigerante, códigos Check Engine y fallas mecánicas.\n` +
        `• **Reprogramación & Mantenimiento:** Ajustes de ECU/PCM y mantenimientos según kilometraje OEM.\n\n` +
        `¿En qué vehículo o falla podemos ayudarte hoy?`;
    }

    return NextResponse.json({
      role: 'assistant',
      content: smartReply,
      decodedVin: decodedVinData
    });

  } catch (err: any) {
    console.error('Error en /api/chat:', err);
    return NextResponse.json({ error: err.message || 'Error procesando solicitud de chat.' }, { status: 500 });
  }
}
