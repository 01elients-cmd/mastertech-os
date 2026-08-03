'use client';

import React, { useState } from 'react';
import { DviReport, DviItem, DEFAULT_DVI_ITEMS } from '@/lib/dvi-store';
import { 
  Plus, 
  Search, 
  FileText, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wrench, 
  Send, 
  Sparkles,
  RefreshCw,
  Car,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface DVIManagerProps {
  reports: DviReport[];
  onSaveDvi: (report: Partial<DviReport> & { notifyTelegram?: boolean }) => Promise<void>;
  onDeleteDvi: (id: string) => Promise<void>;
  onRefresh: () => void;
}

export default function DVIManager({ reports, onSaveDvi, onDeleteDvi, onRefresh }: DVIManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifyTelegram, setNotifyTelegram] = useState(true);

  // Estado del Formulario
  const [id, setId] = useState('');
  const [otNumber, setOtNumber] = useState('');
  const [vin, setVin] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [plate, setPlate] = useState('');
  const [mileage, setMileage] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [technicianSummary, setTechnicianSummary] = useState('');
  const [overallStatus, setOverallStatus] = useState<'BUENO' | 'ATENCION' | 'URGENTE'>('BUENO');
  
  // Items de Inspección 30 Puntos
  const [items, setItems] = useState<DviItem[]>(
    DEFAULT_DVI_ITEMS.map(i => ({ ...i, status: 'BUENO' }))
  );

  const handleOpenNew = () => {
    setId(`dvi-${Date.now()}`);
    setOtNumber('OT-');
    setVin('');
    setVehicleName('');
    setPlate('');
    setMileage('');
    setClientName('');
    setClientPhone('');
    setTechnicianName('');
    setTechnicianSummary('');
    setOverallStatus('BUENO');
    setItems(DEFAULT_DVI_ITEMS.map(i => ({ ...i, status: 'BUENO', notes: '' })));
    setIsEditing(true);
  };

  const handleOpenEdit = (report: DviReport) => {
    setId(report.id);
    setOtNumber(report.ot_number || '');
    setVin(report.vin || '');
    setVehicleName(report.vehicle_name);
    setPlate(report.plate);
    setMileage(report.mileage);
    setClientName(report.client_name);
    setClientPhone(report.client_phone);
    setTechnicianName(report.technician_name);
    setTechnicianSummary(report.technician_summary || '');
    setOverallStatus(report.overall_status);
    
    // Combinar con ítems por defecto para asegurar los 30 puntos
    const merged = DEFAULT_DVI_ITEMS.map(def => {
      const found = report.items?.find(i => i.id === def.id || i.name === def.name);
      return found ? found : { ...def, status: 'BUENO' as const };
    });
    setItems(merged);
    setIsEditing(true);
  };

  const handleItemStatusChange = (itemId: string, status: 'BUENO' | 'ATENCION' | 'URGENTE') => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status } : i));
  };

  const handleItemNotesChange = (itemId: string, notes: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, notes } : i));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleName.trim()) {
      alert('El nombre del vehículo es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      // Determinar estatus general basado en el semáforo de ítems
      const hasUrgente = items.some(i => i.status === 'URGENTE');
      const hasAtencion = items.some(i => i.status === 'ATENCION');
      const calcOverall = hasUrgente ? 'URGENTE' : (hasAtencion ? 'ATENCION' : 'BUENO');

      await onSaveDvi({
        id: id || `dvi-${Date.now()}`,
        ot_number: otNumber.trim(),
        vin: vin.trim(),
        vehicle_name: vehicleName.trim(),
        plate: plate.trim(),
        mileage: mileage.trim(),
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        technician_name: technicianName.trim(),
        overall_status: calcOverall,
        technician_summary: technicianSummary.trim(),
        items,
        notifyTelegram
      });

      setIsEditing(false);
      onRefresh();
    } catch (err) {
      alert('Error guardando la inspección DVI');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(r => 
    r.vehicle_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.ot_number && r.ot_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Agrupar ítems por categoría en el formulario
  const categories: Record<string, DviItem[]> = {};
  items.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Top */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-400" />
            Inspección Digital de Vehículos DVI (Semáforo 30 Puntos)
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Crea reportes de salud automotriz con semáforo técnico y genera enlaces públicos en tiempo real para tus clientes.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Inspección DVI
        </button>
      </div>

      {/* Barra de Búsqueda */}
      <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5">
        <Search className="w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por cliente, vehículo, placa u orden..."
          className="bg-transparent border-none outline-none text-xs text-zinc-200 placeholder-zinc-500 flex-1"
        />
        <button onClick={onRefresh} className="text-zinc-400 hover:text-zinc-200 p-1">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Lista de Reportes DVI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map(report => (
          <div key={report.id} className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 space-y-3 shadow-lg transition duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                    {report.ot_number || report.id}
                  </span>
                  <h3 className="font-bold text-sm text-zinc-100 mt-1">{report.vehicle_name}</h3>
                  <p className="text-xs text-zinc-400">Cliente: <span className="text-zinc-300 font-medium">{report.client_name}</span></p>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black font-mono text-emerald-400">{report.health_score}%</div>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">Salud</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-zinc-400 font-mono bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-850">
                <div>Placa: <span className="text-zinc-200">{report.plate || 'N/A'}</span></div>
                <div>Km: <span className="text-zinc-200">{report.mileage || 'N/A'}</span></div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
              <a
                href={`/dvi/${report.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Ver Reporte Cliente
              </a>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(report)}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1.5 rounded-lg transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => onDeleteDvi(report.id)}
                  className="text-xs text-rose-400 hover:bg-rose-950/50 p-1.5 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredReports.length === 0 && (
          <div className="col-span-full bg-zinc-900 border border-zinc-800 rounded-2xl p-12 text-center text-zinc-500">
            No hay inspecciones DVI registradas. Haz clic en "Nueva Inspección DVI" para crear la primera.
          </div>
        )}
      </div>

      {/* Modal Formulario de Inspección DVI */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-400" />
                  Formulario Inspección Digital DVI (30 Puntos)
                </h3>
                <p className="text-xs text-zinc-400">Completa los datos del vehículo y marca el estado en semáforo.</p>
              </div>

              <button
                onClick={() => setIsEditing(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm bg-zinc-800 px-3 py-1.5 rounded-xl"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-zinc-800">
              
              {/* Datos Generales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-zinc-900/60 border border-zinc-800 p-4 rounded-2xl">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Nº Orden / OT</label>
                  <input
                    type="text"
                    value={otNumber}
                    onChange={(e) => setOtNumber(e.target.value)}
                    placeholder="Ej: OT-5250"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Vehículo (Marca/Modelo/Año) *</label>
                  <input
                    type="text"
                    value={vehicleName}
                    onChange={(e) => setVehicleName(e.target.value)}
                    placeholder="Ej: Toyota Corolla 2018"
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Placas</label>
                  <input
                    type="text"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    placeholder="Ej: AA890BB"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Kilometraje</label>
                  <input
                    type="text"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    placeholder="Ej: 115,420 km"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Cliente</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nombre del cliente"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Técnico Asignado</label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    placeholder="Nombre del mecánico"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Dictamen Técnico */}
              <div>
                <label className="text-xs font-bold text-zinc-300 block mb-1.5">Dictamen Técnico & Recomendaciones Generales</label>
                <textarea
                  value={technicianSummary}
                  onChange={(e) => setTechnicianSummary(e.target.value)}
                  rows={3}
                  placeholder="Escribe el resumen del estado mecánico y recomendaciones de reemplazo..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 outline-none focus:border-blue-500"
                />
              </div>

              {/* Evaluador de 30 Puntos DVI con Semáforo */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs text-zinc-200 uppercase tracking-wider">Evaluación de 30 Puntos (Semáforo DVI)</h4>

                {Object.entries(categories).map(([catName, catItems]) => (
                  <div key={catName} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="bg-zinc-850 px-4 py-2 text-xs font-bold text-zinc-200 border-b border-zinc-800">
                      {catName}
                    </div>

                    <div className="divide-y divide-zinc-800/60">
                      {catItems.map(item => (
                        <div key={item.id} className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                          <div className="flex-1">
                            <span className="font-medium text-zinc-200 block">{item.name}</span>
                            <input
                              type="text"
                              value={item.notes || ''}
                              onChange={(e) => handleItemNotesChange(item.id, e.target.value)}
                              placeholder="Agregar nota o observación (opcional)..."
                              className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-[11px] text-zinc-300 outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Botones de Semáforo */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleItemStatusChange(item.id, 'BUENO')}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1 ${
                                item.status === 'BUENO'
                                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                              }`}
                            >
                              🟢 Óptimo
                            </button>

                            <button
                              type="button"
                              onClick={() => handleItemStatusChange(item.id, 'ATENCION')}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1 ${
                                item.status === 'ATENCION'
                                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                              }`}
                            >
                              🟡 Atención
                            </button>

                            <button
                              type="button"
                              onClick={() => handleItemStatusChange(item.id, 'URGENTE')}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition flex items-center gap-1 ${
                                item.status === 'URGENTE'
                                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20'
                                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                              }`}
                            >
                              🔴 Urgente
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Botón de Enviar a Telegram */}
              <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
                <input
                  type="checkbox"
                  id="notifyTelegram"
                  checked={notifyTelegram}
                  onChange={(e) => setNotifyTelegram(e.target.checked)}
                  className="rounded bg-zinc-950 border-zinc-800 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="notifyTelegram" className="text-xs text-zinc-300 cursor-pointer">
                  Notificar resultado de esta inspección DVI al canal <span className="font-bold text-blue-400"># General en Telegram</span>.
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-lg transition flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {loading ? 'Guardando...' : 'Guardar y Generar Reporte DVI'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
