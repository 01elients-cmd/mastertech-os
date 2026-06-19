export const SOPS = {
  NUEVO_INGRESO: `🚗 *REPORTE DE NUEVO INGRESO*

*OT:* #[Número de OT]
*Asesor:* [Nombre]

*1. DATOS DEL CLIENTE*
👤 *Nombre:* [Nombre del Cliente]
📞 *Teléfono:* [Número]

*2. DATOS DEL VEHÍCULO*
🚙 *Marca/Modelo/Año:* [Marca, Modelo, Año]
🪪 *Placa:* [Placa]
🔢 *Kilometraje:* [Km]

*3. MOTIVO DE INGRESO*
⚠️ *Falla Reportada / Solicitud:* 
[Describir falla]

*4. INVENTARIO RÁPIDO*
[ ] Caucho Repuesto
[ ] Gato Hidráulico
[ ] Triángulos`,

  SOLICITUD_REPUESTOS: `📦 *SOLICITUD DE REPUESTOS*

*OT:* #[Número de OT]
*Técnico:* [Nombre]

*Requerimientos:*
1. [Cantidad] x [Descripción] (OEM/Alternativo)
2. [Cantidad] x [Descripción]

*Prioridad:* [Alta/Media/Baja]`,

  CONTROL_CALIDAD: `🔍 *CONTROL DE CALIDAD*

*OT:* #[Número de OT]
*Inspector:* [Nombre]

*EXTERIOR:*
[ ] Luces funcionales
[ ] Sin rayones nuevos

*INTERIOR:*
[ ] Testigos apagados (Tablero)
[ ] Limpieza interior

*MECÁNICA:*
[ ] Niveles de fluidos OK
[ ] Prueba de ruta OK

*Observaciones:* [Detalles adicionales]`,
  
  GARANTIA: `⚠️ *REPORTE DE RETRABAJO / GARANTÍA*

*OT Original:* #[Número de OT]
*Vehículo:* [Placa]

*Motivo de Garantía:*
[Describir exactamente qué falló]

*Acción Requerida:*
[Describir solución esperada]`
};
