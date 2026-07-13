/**
 * MasterTech OS — Formato Estricto de Terminal
 * Todas las respuestas del bot usan bloques de código
 * para mantener coherencia visual tipo panel de control.
 */

export const fmt = {
  /** Tarjeta de estatus de vehículo */
  statusCard(data: {
    status: string;
    statusEmoji: string;
    plate: string;
    model: string;
    technician?: string;
    ramp?: number;
    time?: string;
    orderNumber?: number;
  }): string {
    const lines = [
      `[ ${data.statusEmoji}  ${data.status.toUpperCase()} ]`,
      `PLACA: ${data.plate}`,
      `MODELO: ${data.model}`,
    ];
    if (data.orderNumber) lines.push(`ORDEN: #${data.orderNumber}`);
    if (data.technician) lines.push(`TÉCNICO: ${data.technician}`);
    if (data.ramp) lines.push(`RAMPA: ${data.ramp}`);
    if (data.time) lines.push(`TIEMPO NETO: ${data.time}`);
    return `<pre>${lines.join('\n')}</pre>`;
  },

  /** Tarjeta de alerta */
  alertCard(data: {
    type: string;
    severity: string;
    title: string;
    message: string;
    plate?: string;
    orderNumber?: number;
  }): string {
    const severityMap: Record<string, string> = {
      BAJA: '🟢', MEDIA: '🟡', ALTA: '🟠', CRITICA: '🔴'
    };
    const emoji = severityMap[data.severity] || '⚠️';
    const lines = [
      `${emoji} ALERTA: ${data.type.toUpperCase()}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      data.title,
    ];
    if (data.plate) lines.push(`PLACA: ${data.plate}`);
    if (data.orderNumber) lines.push(`ORDEN: #${data.orderNumber}`);
    lines.push(``, data.message);
    return `<pre>${lines.join('\n')}</pre>`;
  },

  /** Tarjeta de inventario */
  inventoryCard(data: {
    name: string;
    category: string;
    quantity: number;
    unit: string;
    minStock: number;
    action?: string;
    delta?: number;
  }): string {
    const pct = data.minStock > 0 ? Math.round((data.quantity / data.minStock) * 100) : 100;
    const bar = fmt.progressBar(Math.min(pct, 100), 15);
    const status = data.quantity <= data.minStock ? '🔴 BAJO' : data.quantity <= data.minStock * 1.5 ? '🟡 MEDIO' : '🟢 OK';
    const lines = [
      `📦 INVENTARIO: ${data.name.toUpperCase()}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `CATEGORÍA: ${data.category}`,
      `STOCK: ${data.quantity} ${data.unit}`,
      `MÍNIMO: ${data.minStock} ${data.unit}`,
      `NIVEL: ${bar} ${status}`,
    ];
    if (data.action && data.delta) {
      lines.push(``, `${data.action === 'SALIDA' ? '➖' : '➕'} ${data.action}: ${data.delta} ${data.unit}`);
    }
    return `<pre>${lines.join('\n')}</pre>`;
  },

  /** Tarjeta de código DTC */
  dtcCard(data: {
    code: string;
    description: string;
    system: string;
    causes: string[];
    brand?: string;
    severity?: string;
  }): string {
    const lines = [
      `🔧 CÓDIGO DTC: ${data.code}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `SISTEMA: ${data.system}`,
    ];
    if (data.brand) lines.push(`MARCA: ${data.brand}`);
    lines.push(``, `📋 ${data.description}`, ``);
    if (data.causes.length > 0) {
      lines.push(`CAUSAS COMUNES:`);
      data.causes.forEach((c, i) => lines.push(`  ${i + 1}. ${c}`));
    }
    return `<pre>${lines.join('\n')}</pre>`;
  },

  /** Tarjeta de logística */
  logisticsCard(data: {
    plate: string;
    parts: Array<{ name: string; status: string; eta?: string }>;
  }): string {
    const statusEmojis: Record<string, string> = {
      SOLICITADO: '📝', EN_PRODUCCION: '🏭', DESPACHADO: '📤',
      EN_TRANSITO: '🚢', EN_ADUANA: '🛃', LIBERADO: '✅',
      EN_CAMINO_TALLER: '🚚', RECIBIDO: '📥'
    };
    const lines = [
      `🚚 LOGÍSTICA: ${data.plate}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
    ];
    data.parts.forEach(p => {
      const emoji = statusEmojis[p.status] || '📦';
      lines.push(`${emoji} ${p.name}`);
      lines.push(`   Estado: ${p.status.replace(/_/g, ' ')}`);
      if (p.eta) lines.push(`   ETA: ${p.eta}`);
      lines.push(``);
    });
    return `<pre>${lines.join('\n')}</pre>`;
  },

  /** Tarjeta de aprobación */
  approvalCard(data: {
    orderNumber: number;
    plate: string;
    model: string;
    description: string;
    estimatedCost?: number;
    requestedBy: string;
    ramp?: number;
  }): string {
    const lines = [
      `🔔 SOLICITUD DE APROBACIÓN`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `ORDEN: #${data.orderNumber}`,
      `PLACA: ${data.plate}`,
      `MODELO: ${data.model}`,
      `TÉCNICO: ${data.requestedBy}`,
    ];
    if (data.ramp) lines.push(`RAMPA: ${data.ramp}`);
    lines.push(``, `HALLAZGO:`, data.description);
    if (data.estimatedCost) lines.push(``, `COSTO EST.: $${data.estimatedCost.toFixed(2)}`);
    return `<pre>${lines.join('\n')}</pre>`;
  },

  /** Tarjeta de trabajo externo */
  externalJobCard(data: {
    plate: string;
    provider: string;
    service: string;
    sentAt: string;
    status: string;
    duration?: string;
  }): string {
    const lines = [
      `🏭 TRABAJO EXTERNO`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `PLACA: ${data.plate}`,
      `PROVEEDOR: ${data.provider}`,
      `SERVICIO: ${data.service}`,
      `ENVIADO: ${data.sentAt}`,
      `ESTATUS: ${data.status}`,
    ];
    if (data.duration) lines.push(`TIEMPO PROVEEDOR: ${data.duration}`);
    return `<pre>${lines.join('\n')}</pre>`;
  },

  /** Barra de progreso ASCII */
  progressBar(pct: number, width: number = 15): string {
    const filled = Math.round((pct / 100) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${pct}%`;
  },

  /** Resumen matutino (Daily Standup) */
  standupReport(data: {
    date: string;
    vehiclesIn: number;
    vehiclesBlocked: number;
    deliveriesToday: number;
    pendingApprovals: number;
    lowStockItems: number;
    activeAlerts: number;
    topBottleneck?: string;
  }): string {
    const lines = [
      `📊 REPORTE MATUTINO — ${data.date}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `🚗 Ingresos ayer:       ${String(data.vehiclesIn).padStart(4)}`,
      `🔴 Bloqueados:          ${String(data.vehiclesBlocked).padStart(4)}`,
      `📤 Entregas hoy:        ${String(data.deliveriesToday).padStart(4)}`,
      `⏳ Aprobaciones pend.:  ${String(data.pendingApprovals).padStart(4)}`,
      `📦 Items stock bajo:    ${String(data.lowStockItems).padStart(4)}`,
      `⚠️  Alertas activas:     ${String(data.activeAlerts).padStart(4)}`,
    ];
    if (data.topBottleneck) {
      lines.push(``, `🔍 CUELLO DE BOTELLA:`, `   ${data.topBottleneck}`);
    }
    return `<pre>${lines.join('\n')}</pre>`;
  },

  /** Formato para pedir datos faltantes de imagen */
  mediaPrompt(username: string): string {
    return `<pre>⚠️ REGISTRO DE EVIDENCIA
━━━━━━━━━━━━━━━━━━━━━━━━
${username}, para registrar esta
evidencia necesito:

1. Número de Orden (#OT_____)
2. Modelo del Vehículo

Responde con el formato:
#OT1234 Toyota Tacoma</pre>`;
  },

  /** Confirmación de registro de media */
  mediaConfirm(data: {
    orderNumber: string;
    model: string;
    fileType: string;
    count: number;
  }): string {
    return `<pre>✅ EVIDENCIA REGISTRADA
━━━━━━━━━━━━━━━━━━━━━━━━
ORDEN: #OT${data.orderNumber}
MODELO: ${data.model}
TIPO: ${data.fileType}
ARCHIVOS: ${data.count}</pre>`;
  },

  /** Formato para protocolos OEM por kilometraje */
  oemProtocol(data: {
    brand: string;
    model?: string;
    km: number;
    services: Array<{ name: string; priority?: string }>;
  }): string {
    const lines = [
      `📋 PROTOCOLO OEM — ${data.km.toLocaleString()} KM`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `MARCA: ${data.brand}`,
    ];
    if (data.model) lines.push(`MODELO: ${data.model}`);
    lines.push(``, `SERVICIOS REQUERIDOS:`);
    data.services.forEach((s, i) => {
      const priority = s.priority === 'ALTA' ? '🔴' : s.priority === 'MEDIA' ? '🟡' : '🟢';
      lines.push(`  ${priority} ${i + 1}. ${s.name}`);
    });
    lines.push(``, `⚠️ No omitir estos servicios.`);
    return `<pre>${lines.join('\n')}</pre>`;
  },

  /** Formato de briefing para dirección */
  briefingReport(content: string): string {
    return `<pre>📈 BRIEFING DE DIRECCIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${content}</pre>`;
  },

  /** Informe de incidencias */
  incidentsReport(data: {
    total: number;
    byPerson: Record<string, number>;
  }): string {
    const lines = [
      `📊 INFORME DE INCIDENCIAS`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `🔴 Total de incidencias: ${data.total}`,
      ``,
      `👤 Por persona:`,
    ];
    
    Object.entries(data.byPerson)
      .sort((a, b) => b[1] - a[1])
      .forEach(([person, count]) => {
        lines.push(`  • ${person}: ${count}`);
      });
      
    return `<pre>${lines.join('\n')}</pre>`;
  },

  /** Separador visual */
  separator(): string {
    return `<pre>━━━━━━━━━━━━━━━━━━━━━━━━━━━━</pre>`;
  },

  /** Formato de error del sistema */
  errorMessage(message: string): string {
    return `<pre>❌ ERROR DEL SISTEMA
━━━━━━━━━━━━━━━━━━━━━━━━
${message}</pre>`;
  },

  /** Formato de éxito */
  successMessage(message: string): string {
    return `<pre>✅ OPERACIÓN EXITOSA
━━━━━━━━━━━━━━━━━━━━━━━━
${message}</pre>`;
  },

  /** Formato de wiki/knowledge base resultado */
  wikiResult(data: {
    query: string;
    results: Array<{
      brand: string;
      model: string;
      issue: string;
      solution: string;
      technician?: string;
      date?: string;
    }>;
  }): string {
    if (data.results.length === 0) {
      return `<pre>📚 WIKI — Sin resultados
━━━━━━━━━━━━━━━━━━━━━━━━
Consulta: "${data.query}"
No se encontraron registros.</pre>`;
    }
    const lines = [
      `📚 WIKI — ${data.results.length} resultado(s)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Consulta: "${data.query}"`,
      ``,
    ];
    data.results.forEach((r, i) => {
      lines.push(`── Resultado ${i + 1} ──`);
      lines.push(`🚗 ${r.brand} ${r.model}`);
      lines.push(`❓ ${r.issue}`);
      lines.push(`✅ ${r.solution}`);
      if (r.technician) lines.push(`👤 ${r.technician}`);
      if (r.date) lines.push(`📅 ${r.date}`);
      lines.push(``);
    });
    return `<pre>${lines.join('\n')}</pre>`;
  }
};
