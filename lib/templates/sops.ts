export const SOPS = {
  // === RECEPCIÓN ===
  NUEVO_INGRESO: `🚗 NUEVO INGRESO

• Vehículo: [Marca, Modelo, Año, Placa]
• Cliente: [Nombre del Cliente]
• Contacto: (si se requiere)
• Falla Reportada: [Breve descripción de lo que el cliente dice sentir/escuchar]
• Observaciones general: (fallos, golpes, sonidos no reportados por el cliente)
• Evidencia: enviar fotos Exterior (fotos 4 laterales, 4 esquinas, 5 neumaticos, maletero techo, motor) interior (parte trasera, parte delantera, tablero completo, guanteras, Odometro con km)
1 video corto de funcionamiento eléctrico ( cluster, a/c, radio/táctil, cámara, cepillos limpia parabrisas, luces internas externas, ventanas, retrovisores, otros accesorios)`,

  // === REPUESTOS ===
  SOLICITUD_REPUESTO: `📦 SOLICITUD DE REPUESTOS

• Orden: MT00-[Número]
• Vehículo: [Marca, Modelo, Año]
• VIN / Serie: [Número de Serie]
• Pieza Solicitada:
[Describir pieza con número de parte si aplica]

• Mecánico que solicita: [Nombre]

📸 (Debajo de este texto, adjuntar foto de la pieza dañada o del número de parte grabado si es visible).`,

  COTIZACION_REPUESTO: `📄 COTIZACIÓN

• Proveedor: [Nombre]
• Disponibilidad: [Stock / Días de entrega]
• Costo: [Monto]`,

  // === OPERACIONES ===
  NUEVOS_HALLAZGOS: `🔧 Nuevos Hallazgos durante el diagnostico

[NÚMERO DE ORDEN] - [MODELO DEL AUTO]
Ejemplo: 🔧 ORDEN #4120 - Nissan Versa 2020: en proceso de diagnostico, pero se le detecto un bote de refrigerante por la manguera
(Debajo de este texto, enviar el video corto o de fotos)`,

  LISTO_PARCIAL: `🔧 DIAGNÓSTICO LISTO/PARCIAL

• Orden: [Número]
• Mecánico Asignado: [Nombre del técnico]
• Falla Confirmada: [Detalle técnico de la pieza dañada]
• Fecha/Hora Promesa de Entrega: [Día y Hora aproximada teniendo los repuestos solicitados]
• Estatus: [qdo en espera de aprobación, espera de repuesto]
• Evidencia: (Debajo de este texto, enviar el video corto o ráfaga de fotos)`,

  ESTATUS_OP: `💰 Estatus de cotización

• Orden : [Número de Orden]
• Vehículo: [Marca, Modelo]
• Estatus: 🟢 AUTORIZADO TOTAL / 🟡 AUTORIZADO PARCIAL / 🔴 DECLINADO
⚙️ Trabajos a Realizar:
• [Escribir solo lo que se va a reparar. Ej: entonacion completa y cambio de pastillas delanteras]

⏰ Horas aprobadas por reparación: (Indicado por ARI)

❌ Trabajos Rechazados por el Cliente:
• [Escribir lo que no se autorizó. Ej: Rectificación de discos traseros (Cliente firma responsiva)]

Fecha/Hora Promesa de Entrega: [Día y Hora aproximada]`,

  // === GARANTÍAS ===
  GARANTIA_REINGRESO: `🧧 REINGRESO POR GARANTÍA

• Orden Original: [Número de la orden donde pagó el servicio original]
• Vehículo: [Marca, Modelo, Año, Placa]
• Cliente: [Nombre del Cliente]
• Trabajo Anterior Realizado: [Ej: cambio de estopera delantera cigueñal...]
• Queja Actual del Cliente: [Describir exactamente lo que dice el cliente]
• Estatus Visual Inicial: [Se apreció bote...]
• Técnico que reparó originalmente: [Nombre del mecánico]

📸 (Adjuntar foto del kilometraje actual en el tablero para comprobar que esté dentro del periodo de garantía y video/audio del síntoma si es posible).`,

  GARANTIA_RETRABAJO: `⚠️ REINGRESO POR RETRABAJO

• Orden Previa: [Número de orden del servicio anterior]
• Vehículo: [Marca, Modelo, Año]
• Cliente: [Nombre del Cliente]
• Diagnóstico / Trabajo Anterior: [Ej: Se cambió estopera delantera por fuga...]
• Falla Actual Detectada: [Ej: Sigue goteando aceite, pero ahora es por la estopera trasera]
• ¿Por qué es Retrabajo y no Garantía?: [Explicación técnica corta]
• Nivel de Molestia del Cliente: 🟥 ALTO (Exige solución hoy) / 🟨 MEDIO (Entiende la situación pero pide consideración)

📸 (Adjuntar video o foto detallada donde se vea claramente la pieza anterior impecable y la pieza nueva fallando...).`,

  // === PENDIENTES ===
  PENDIENTES_POSTVENTA: `⚙️ CONTROL DE POST-VENTA Y LOGÍSTICA
Nº Orden / Historial: #_________
Cliente: [Nombre y Teléfono]
Vehículo: [Marca, Modelo, Año y Placa]
🔧 1. DIAGNÓSTICO Y SERVICIO PENDIENTE: [Ej: Cambio de embrague...]

📦 2. CONTROL DE REPUESTOS (LOGÍSTICA)
Lista de piezas requeridas:
[Pieza ] - Cantidad: [ ]

Estado actual de los repuestos: (aplicar el semaforo)`,

  PENDIENTES_SEGUIMIENTO: `📞 3. SEGUIMIENTO DE LLAMADAS Y CITA
Historial de llamadas de post-venta:
Llamada 1 (Fecha: / / ): [Ej: No contestó, se envió WhatsApp]
Llamada 2 (Fecha: / / ): [Ej: Cliente aprueba, pero pide agendar para la quincena]
Estado final del servicio:
[ ] Pendiente de re-contactar.
[ ] Cita confirmada para el día: / / ___ a las : hrs.
[ ] Rechazado por el cliente (Motivo: ______________________)`,

  // === INCIDENCIAS ===
  INCIDENCIA_APERTURA: `🔴 1. Reporte de Incidencia (Apertura)

#Incidencia_Apertura
👤 Detecta: [Nombre]
🏢 Área_Afectada: [Servicio / Repuestos / Taller / Lavado]
🎯 Origen_Problema: [Asesor / Repuestos / Técnico / Proveedor / Cliente]
🛠 Orden (OT): [Número de Orden]
🚀 Tipo: [Elegir de la lista estandarizada abajo]
🔥 Gravedad: [Baja / Media / Crítica]
📝 Detalle: [Ej: Repuestos entregó pastillas de freno del año incorrecto...]`,

  INCIDENCIA_CIERRE: `🟢 2. Resolución de Incidencia (Cierre)

#Incidencia_Cierre
👤 Resuelve: [Nombre]
✅ Solución: [Ej: Se cambiaron las pastillas por el código correcto]
⏱ Tiempo_Resolucion: [Ej: 45 min / 3 horas - Tiempo que el proceso estuvo frenado]
💰 Costo_Extra: [Monto si hubo daños/fletes urgentes, o 0]`,

  // === CALIDAD ===
  CONTROL_CALIDAD: `marcar con ✅ o ❌ cada punto

#️⃣ Orden de servicio
🚗 Vehículo: [Marca, Modelo]

🔷 1. CUMPLIMIENTO DE SERVICIO
[ ] Se resolvió la falla descrita por el cliente al momento de ingresar el vehículo?
[ ] Quedó algo pendiente para post venta o próximos servicios y fue anotado en su respectivo chat?
[ ] Reseteo de luz de servicio realizada (si aplica)
[ ] Realizo el escaneo pre entrega?

🔷 2. ASPECTO EXTERIOR
[ ] Lavado de carrocería y aspirado completo con ambientador? (consultar antes) si no se lava se debe realizar limpieza 🧼
[ ] Cristales limpios (sin marcas de dedos o grasa) 🧽
[ ] Luces operativas (altas, bajas, cruce, freno y reversa) 💡
[ ] Inspección visual (sin Rayones o golpes nuevos post-taller) 🔍

🔷 3. ASPECTO INTERIOR
[ ] Retiro de plásticos protectores (asiento, volante, pomo) 🗑️
[ ] Tablero limpio y sin restos de herramientas/materiales 🧹
[ ] Radio y aire acondicionado en los valores iniciales 📻
[ ] Reloj del vehículo en hora correcta ⏰

🔷 4. MECÁNICA Y SEGURIDAD
[ ] Revisión y apriete de batería y Borners
[ ] Niveles de fluidos verificados (aceite, agua, frenos) 🛢️
[ ] Presión de neumáticos correcta (¡no olvidar el de repuesto!) ⚙️
[ ] Torque de tuercas de cauchos verificado (si se desmontaron) 🔧
[ ] Ningún testigo (luz de falla) encendido en el tablero ⚠️
[ ] Grapas de carrocería completas
[ ] Flanchones instalados? (si aplica)
[ ] Embellecedor de motor instalado? (si aplica)
[ ] Frenos 100% funcionales?
[ ] Prueba de ruta finalizada (sin ruidos extraños ni anomalías) 🛣️

🔷 5. DETALLES FINALES
[ ] Repuestos viejos/reemplazados listos en el maletero 📦
[ ] Llaves del vehículo limpias y desinfectadas

📢 DICTAMEN FINAL:
[ ] Vehículo listo para entrega?
⏱️ Hora de finalización:`,

  // === INSPECCIÓN ===
  LINEA_INSPECCION: `( 🟢 Bueno / 🟡 Requiere Atención Pronto / 🔴 Urgente - Cambio Inmediato )

🚗 DATOS DEL VEHÍCULO
Cliente: [Nombre Completo]
Teléfono: [Número]
Vehículo: [Marca, Modelo y Año]
Placas: [Número]
Kilometraje: [Km o Millas]

1. Sistema de Motor y Fluidos
2. Informe de escaneo
3. Frenos y Suspensión
4. Sistema Eléctrico

⚠️ DIAGNÓSTICO FINAL Y RECOMENDACIONES:

📸Enviar testigos fotográficos y videos explicando en cada uno y detallado`,

  // === MEJORAS ===
  MEJORA_APERTURA: `💡 1. Propuesta de Mejora (Apertura)
La llena cualquier empleado que detecte una oportunidad para optimizar el taller, ahorrar dinero o capacitar al equipo.

#Idea_Propuesta
👤 Propone: [Nombre]
🏢 Área: [Servicio / Repuestos / Taller / Lavado / Administración]
🎯 Enfoque: [Elegir de la lista estandarizada abajo]
💡 La Idea: [Ej: Fabricar un soporte móvil para las pistolas de impacto y así no perder tiempo buscándolas entre bahías]
🚀 Beneficio_Esperado: [Ej: Ahorrar 10 min por cada cambio de neumáticos y cuidar la herramienta]
🛠️ Recursos_Necesarios: [Ej: Retazos de metal de desecho y 1 hora del soldador / Compra de un software]`,

  MEJORA_CIERRE: `🚀 2. Implementación y Resultado (Cierre)
Se envía respondiendo a la propuesta original tras evaluar o ejecutar la idea para medir su impacto real.

#Idea_Evaluacion
👤 Revisa: [Nombre del Gerente o Líder]
🚦 Estado: [Aprobada_Implementada / En_Pruebas / Rechazada]
📅 Fecha_Inicio: [DD/MM/AAAA]
📈 Impacto_Real: [Ej: Se redujo el tiempo muerto en bahía 3 / Cero pérdidas de dados este mes]
🏆 Puntos_Crecimiento: [Puntaje del 1 al 10 para el perfil del empleado]`
};
