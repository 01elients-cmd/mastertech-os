import React from 'react';
import { dbGetDviReports } from '@/lib/dvi-store';
import { Car, ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Wrench, PhoneCall, Share2, FileText } from 'lucide-react';
import Link from 'next/link';

export const revalidate = 0; // render on demand

export default async function PublicDviPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const reports = await dbGetDviReports();
  const report = reports.find(r => r.id === resolvedParams.id);

  if (!report) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto animate-bounce" />
          <h1 className="text-xl font-bold">Reporte DVI no encontrado</h1>
          <p className="text-xs text-zinc-400">El código de inspección solicitado no existe o fue eliminado.</p>
          <Link href="/" className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  // Contar semáforos
  const buenoCount = report.items.filter(i => i.status === 'BUENO').length;
  const atencionCount = report.items.filter(i => i.status === 'ATENCION').length;
  const urgenteCount = report.items.filter(i => i.status === 'URGENTE').length;

  // Agrupar items por categoría
  const categories: Record<string, typeof report.items> = {};
  report.items.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-12">
      {/* Header Fijo */}
      <header className="bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800 sticky top-0 z-50 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            MT
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-zinc-100 tracking-tight flex items-center gap-1.5">
              TALLER MASTERTECH
              <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold">DVI</span>
            </h1>
            <p className="text-[10px] text-zinc-400">Inspección Digital de Vehículo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-300 px-2 py-1 rounded-full font-mono">
            {report.ot_number || report.id}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 mt-2">
        
        {/* Card del Vehículo y Propietario */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 mb-1 block">Vehículo Inspeccionado</span>
              <h2 className="text-xl font-black text-white tracking-tight">{report.vehicle_name}</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Cliente: <span className="text-zinc-200 font-medium">{report.client_name}</span></p>
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-black font-mono text-emerald-400">{report.health_score}%</div>
              <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-semibold">Salud Automotriz</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-zinc-800/80 text-center text-xs font-mono">
            <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block font-sans">Placa</span>
              <span className="font-bold text-zinc-200">{report.plate || 'N/A'}</span>
            </div>
            <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block font-sans">Kilometraje</span>
              <span className="font-bold text-zinc-200">{report.mileage || 'N/A'}</span>
            </div>
            <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-800">
              <span className="text-zinc-500 text-[10px] block font-sans">Técnico</span>
              <span className="font-bold text-zinc-200 truncate block">{report.technician_name || 'MasterTech'}</span>
            </div>
          </div>
        </div>

        {/* Barra Resumen del Semáforo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
              {buenoCount}
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-400 block">Buen Estado</span>
              <span className="text-[10px] text-zinc-400">Puntos óptimos</span>
            </div>
          </div>

          <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
              {atencionCount}
            </div>
            <div>
              <span className="text-xs font-bold text-amber-400 block">Atención</span>
              <span className="text-[10px] text-zinc-400">Revisar pronto</span>
            </div>
          </div>

          <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-sm">
              {urgenteCount}
            </div>
            <div>
              <span className="text-xs font-bold text-rose-400 block">Urgente</span>
              <span className="text-[10px] text-zinc-400">Cambio crítico</span>
            </div>
          </div>
        </div>

        {/* Resumen del Dictamen Técnico */}
        {report.technician_summary && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
            <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-2 uppercase tracking-wide">
              <FileText className="w-4 h-4 text-blue-400" />
              Dictamen y Recomendaciones del Técnico
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
              {report.technician_summary}
            </p>
          </div>
        )}

        {/* Desglose por Categorías de 30 Puntos DVI */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-400" />
            Puntos Evaluados en Inspección DVI
          </h3>

          {Object.entries(categories).map(([catName, items]) => (
            <div key={catName} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="bg-zinc-800/60 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-200">{catName}</span>
                <span className="text-[10px] font-mono text-zinc-400">{items.length} ítems</span>
              </div>

              <div className="divide-y divide-zinc-800/50">
                {items.map(item => (
                  <div key={item.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                    <div className="flex-1 space-y-1">
                      <span className="font-medium text-zinc-200 block">{item.name}</span>
                      {item.notes && (
                        <p className="text-[11px] text-zinc-400 bg-zinc-950/40 p-1.5 rounded-lg border border-zinc-800/60 font-mono">
                          📝 {item.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      {item.status === 'BUENO' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono">
                          <CheckCircle2 className="w-3 h-3" /> Óptimo
                        </span>
                      )}
                      {item.status === 'ATENCION' && (
                        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono">
                          <AlertTriangle className="w-3 h-3" /> Atención
                        </span>
                      )}
                      {item.status === 'URGENTE' && (
                        <span className="inline-flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full font-mono animate-pulse">
                          <XCircle className="w-3 h-3" /> Urgente
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Botón de Contacto para Aprobar Repareaciones */}
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-purple-900/40 border border-blue-500/30 rounded-3xl p-5 text-center space-y-3">
          <h3 className="font-bold text-sm text-zinc-100">¿Deseas autorizar la reparación de los puntos urgentes?</h3>
          <p className="text-xs text-zinc-400">Comunícate directamente con tu asesor en Taller MasterTech para solicitar tu presupuesto formal.</p>
          <a
            href={`https://wa.me/584120936923?text=${encodeURIComponent(`Hola Taller MasterTech, estuve revisando el reporte DVI de mi vehículo ${report.vehicle_name} (Placa: ${report.plate}). Deseo solicitar presupuesto.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-lg transition-all"
          >
            <PhoneCall className="w-4 h-4" />
            Contactar por WhatsApp al Taller
          </a>
        </div>

      </main>
    </div>
  );
}
