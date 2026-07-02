import React from 'react';
import { SopRecord, Jornada } from '@/lib/dashboard-db';
import { 
  Users, 
  FileText, 
  AlertOctagon, 
  TrendingUp, 
  Award,
  Clock, 
  Package, 
  Plus, 
  UserCheck 
} from 'lucide-react';

interface DashboardOverviewProps {
  records: SopRecord[];
  jornadas: Jornada[];
  onNavigateToTab: (tab: string) => void;
  onCreateNewRecord: () => void;
}

export default function DashboardOverview({ 
  records, 
  jornadas, 
  onNavigateToTab,
  onCreateNewRecord 
}: DashboardOverviewProps) {
  // 1. Calculate KPI Metrics
  const activeStaff = jornadas.filter(j => j.status === 'ACTIVO').length;
  
  const totalRecords = records.length;
  
  const incidents = records.filter(r => r.category === 'incidencias');
  const activeIncidents = incidents.filter(i => i.status !== 'Completado').length;
  
  // Quality rating calculation
  const qcChecklists = records.filter(r => r.template_key === 'CONTROL_CALIDAD' || r.category === 'calidad');
  let qcSuccessRate = 96; // Standard benchmark if no records exist
  if (qcChecklists.length > 0) {
    const passed = qcChecklists.filter(c => c.status === 'Completado' || c.status === 'Aprobado').length;
    qcSuccessRate = Math.round((passed / qcChecklists.length) * 100);
  }

  // 2. SVG Area Chart Calculation (Activity last 7 days)
  const getLast7Days = () => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push(d.toISOString().split('T')[0]);
    }
    return result;
  };

  const dates7Days = getLast7Days();
  
  const activityData = dates7Days.map(dateStr => {
    const count = records.filter(r => r.created_at.startsWith(dateStr)).length;
    const dateObj = new Date(dateStr);
    const label = dateObj.toLocaleDateString('es-ES', { weekday: 'narrow', day: 'numeric' });
    return { dateStr, count, label };
  });

  const maxCount = Math.max(...activityData.map(d => d.count), 4);
  const chartHeight = 120;
  const chartWidth = 500;
  const padding = 20;

  // Generate SVG points
  const points = activityData.map((d, index) => {
    const x = padding + (index * (chartWidth - padding * 2)) / 6;
    const y = chartHeight - padding - (d.count / maxCount) * (chartHeight - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  // Fill path for background gradient
  const fillPoints = activityData.length > 0 ? `
    ${padding},${chartHeight - padding} 
    ${points} 
    ${chartWidth - padding},${chartHeight - padding}
  ` : '';

  // 3. Category count for horizontal bar chart
  const categoriesList = [
    { key: 'recepcion', label: 'Recepción', color: 'bg-emerald-500', barColor: '#10b981' },
    { key: 'repuestos', label: 'Repuestos', color: 'bg-blue-500', barColor: '#3b82f6' },
    { key: 'operaciones', label: 'Operaciones', color: 'bg-violet-500', barColor: '#8b5cf6' },
    { key: 'garantias', label: 'Garantías/Retrabajos', color: 'bg-rose-500', barColor: '#f43f5e' },
    { key: 'incidencias', label: 'Incidencias', color: 'bg-red-500', barColor: '#ef4444' },
    { key: 'calidad', label: 'Control Calidad', color: 'bg-teal-500', barColor: '#14b8a6' },
    { key: 'inspeccion', label: 'Inspecciones', color: 'bg-indigo-500', barColor: '#6366f1' },
  ];

  const categoryStats = categoriesList.map(cat => {
    const count = records.filter(r => r.category === cat.key).length;
    return { ...cat, count };
  });

  const maxCatCount = Math.max(...categoryStats.map(c => c.count), 1);

  return (
    <div className="space-y-6">
      {/* Top Banner (Welcome) */}
      <div className="relative rounded-2xl bg-gradient-to-r from-zinc-900 via-[#162a3f] to-zinc-900 p-6 border border-zinc-800/80 shadow-lg overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-10 w-60 h-60 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Panel Administrativo MasterTech</h2>
            <p className="text-zinc-400 mt-1 text-sm max-w-xl">
              Monitoreo en tiempo real de operaciones del taller, control de jornadas técnicas, auditorías de calidad y plantillas configuradas para el bot de Telegram.
            </p>
          </div>
          <button 
            onClick={onCreateNewRecord}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-sky-950/40 transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            Crear Registro SOP
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Shifts */}
        <div 
          onClick={() => onNavigateToTab('jornadas')}
          className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 hover:border-zinc-700/80 transition-all cursor-pointer group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Técnicos Activos</span>
            <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{activeStaff}</span>
            <span className="text-sky-400 text-xs font-semibold flex items-center gap-0.5">
              <span>●</span> En turno
            </span>
          </div>
          <p className="text-zinc-500 text-xs mt-1.5">Control de jornada en tiempo real</p>
        </div>

        {/* KPI 2: Total SOP Records */}
        <div 
          onClick={() => onNavigateToTab('registros')}
          className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 hover:border-zinc-700/80 transition-all cursor-pointer group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Documentos SOP</span>
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <FileText size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{totalRecords}</span>
            <span className="text-emerald-400 text-xs font-semibold flex items-center gap-0.5">
              <TrendingUp size={12} />
              +12% sem
            </span>
          </div>
          <p className="text-zinc-500 text-xs mt-1.5">Expedientes técnicos de taller registrados</p>
        </div>

        {/* KPI 3: Incidents */}
        <div 
          onClick={() => onNavigateToTab('registros')}
          className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 hover:border-zinc-700/80 transition-all cursor-pointer group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Baches / Incidencias</span>
            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
              <AlertOctagon size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{activeIncidents}</span>
            {activeIncidents > 0 ? (
              <span className="text-rose-400 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 animate-pulse border border-rose-500/20">
                Pendientes
              </span>
            ) : (
              <span className="text-emerald-400 text-xs font-semibold">Resueltas</span>
            )}
          </div>
          <p className="text-zinc-500 text-xs mt-1.5">Aperturas vs Cierres en hilos</p>
        </div>

        {/* KPI 4: Quality Score */}
        <div 
          onClick={() => onNavigateToTab('registros')}
          className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 hover:border-zinc-700/80 transition-all cursor-pointer group shadow"
        >
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-sm font-medium">Eficiencia e Inspección</span>
            <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 group-hover:scale-110 transition-transform">
              <Award size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">{qcSuccessRate}%</span>
            <span className="text-teal-400 text-xs font-semibold flex items-center">
              Aprobación QC
            </span>
          </div>
          <p className="text-zinc-500 text-xs mt-1.5">Objetivo de calidad superior a 95%</p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Activity Area Chart */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 shadow lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="font-semibold text-white text-sm">Flujo de Actividad (Últimos 7 días)</h3>
              <p className="text-zinc-500 text-xs">Registros totales enviados por día</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full font-medium">
              Monitoreo Automático
            </span>
          </div>

          <div className="w-full flex items-center justify-center py-2">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full max-w-xl h-auto overflow-visible select-none"
            >
              {/* Gradients */}
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="#27272a" strokeWidth={0.5} strokeDasharray="3 3" />
              <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="#27272a" strokeWidth={0.5} strokeDasharray="3 3" />
              <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#3f3f46" strokeWidth={1} />

              {/* Area path */}
              {fillPoints && (
                <polygon points={fillPoints} fill="url(#chartGradient)" />
              )}

              {/* Path line */}
              {points && (
                <polyline 
                  points={points} 
                  fill="none" 
                  stroke="#0ea5e9" 
                  strokeWidth={2.5} 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />
              )}

              {/* Dots and Tooltips */}
              {activityData.map((d, index) => {
                const x = padding + (index * (chartWidth - padding * 2)) / 6;
                const y = chartHeight - padding - (d.count / maxCount) * (chartHeight - padding * 2);
                
                return (
                  <g key={index} className="group/dot cursor-pointer">
                    <circle cx={x} cy={y} r={4} fill="#0ea5e9" stroke="#18181b" strokeWidth={1.5} />
                    <circle cx={x} cy={y} r={8} fill="#0ea5e9" fillOpacity={0.2} className="opacity-0 group-hover/dot:opacity-100 transition-opacity" />
                    
                    {/* Tooltip */}
                    <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none duration-150">
                      <rect 
                        x={x - 22} 
                        y={y - 28} 
                        width={44} 
                        height={20} 
                        rx={4} 
                        fill="#09090b" 
                        stroke="#3f3f46" 
                        strokeWidth={1} 
                      />
                      <text 
                        x={x} 
                        y={y - 14} 
                        textAnchor="middle" 
                        fill="#ffffff" 
                        fontSize="10px" 
                        fontWeight="bold"
                      >
                        {d.count} docs
                      </text>
                    </g>

                    {/* X axis labels */}
                    <text 
                      x={x} 
                      y={chartHeight - 4} 
                      textAnchor="middle" 
                      fill="#71717a" 
                      fontSize="9px" 
                      fontWeight="medium"
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Chart 2: Category Breakdown */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 shadow space-y-4">
          <div className="border-b border-zinc-800 pb-3">
            <h3 className="font-semibold text-white text-sm">Distribución por Categorías</h3>
            <p className="text-zinc-500 text-xs">Comparativa de tipo de reporte</p>
          </div>

          <div className="space-y-3.5 pt-1">
            {categoryStats.map((cat, i) => {
              const percentage = Math.round((cat.count / maxCatCount) * 100) || 0;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-300 flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                      {cat.label}
                    </span>
                    <span className="text-zinc-400 font-mono">{cat.count}</span>
                  </div>
                  <div className="w-full h-2 rounded bg-zinc-800/50 overflow-hidden">
                    <div 
                      className={`h-full rounded transition-all duration-500`}
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: cat.barColor
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Last shifts + Last SOP updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Active Shift Tracking */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 shadow space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="font-semibold text-white text-sm">Jornada Activa de Personal</h3>
              <p className="text-zinc-500 text-xs">Técnicos logueados actualmente en el taller</p>
            </div>
            <button 
              onClick={() => onNavigateToTab('jornadas')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              Ver todos
            </button>
          </div>

          <div className="divide-y divide-zinc-800/50 max-h-[220px] overflow-y-auto pr-1">
            {jornadas.filter(j => j.status === 'ACTIVO').length > 0 ? (
              jornadas.filter(j => j.status === 'ACTIVO').map((jornada) => (
                <div key={jornada.id} className="py-3 flex items-center justify-between first:pt-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs border border-sky-500/20">
                      C
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-200">{jornada.username}</h4>
                      <p className="text-zinc-500 text-xs flex items-center gap-1">
                        <Clock size={11} className="text-zinc-500" />
                        Inició: {new Date(jornada.started_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-400 border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm shadow-emerald-950/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Turno Activo
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-zinc-500 text-sm">
                😴 Ningún técnico tiene turno iniciado hoy en este momento.
              </div>
            )}
          </div>
        </div>

        {/* Recent SOP Files updates */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-5 shadow space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="font-semibold text-white text-sm">Respuestas de Operación Recientes</h3>
              <p className="text-zinc-500 text-xs">Últimos expedientes creados o editados</p>
            </div>
            <button 
              onClick={() => onNavigateToTab('registros')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              Ver todos
            </button>
          </div>

          <div className="divide-y divide-zinc-800/50 max-h-[220px] overflow-y-auto pr-1">
            {records.length > 0 ? (
              records.slice(0, 4).map((record) => (
                <div 
                  key={record.id} 
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-800/20 rounded-lg px-2 -mx-2 first:pt-0"
                  onClick={() => onNavigateToTab('registros')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-md">
                      {record.category === 'recepcion' ? '🚗' : 
                       record.category === 'repuestos' ? '📦' : 
                       record.category === 'incidencias' ? '🔴' : '🔧'}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-200 truncate max-w-[200px]">{record.title}</h4>
                      <p className="text-zinc-500 text-xs">
                        Por: {record.creator} | {new Date(record.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    record.status === 'Completado' || record.status === 'Aprobado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-400/20' :
                    record.status === 'En proceso' ? 'bg-amber-500/10 text-amber-400 border border-amber-400/20' :
                    record.status === 'Rechazado' ? 'bg-rose-500/10 text-rose-400 border border-rose-400/20' :
                    'bg-slate-500/10 text-slate-400 border border-slate-400/20'
                  }`}>
                    {record.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-zinc-500 text-sm">
                No hay expedientes ni respuestas registradas.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
