import React, { useState } from 'react';
import { SopRecord, SopTemplate } from '@/lib/dashboard-db';
import TelegramPreview from './TelegramPreview';
import { 
  Search, 
  Trash2, 
  Edit3, 
  Printer, 
  Plus, 
  X, 
  Eye, 
  Save, 
  Check, 
  Calendar,
  FileText,
  User,
  Car
} from 'lucide-react';

interface RecordsManagerProps {
  records: SopRecord[];
  templates: SopTemplate[];
  onSaveRecord: (record: SopRecord) => Promise<void>;
  onDeleteRecord: (id: string) => Promise<void>;
}

export default function RecordsManager({ 
  records, 
  templates,
  onSaveRecord, 
  onDeleteRecord 
}: RecordsManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedRecord, setSelectedRecord] = useState<SopRecord | null>(null);
  
  // Modals status
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  
  // Form state
  const [editingRecord, setEditingRecord] = useState<SopRecord | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('recepcion');
  const [templateKey, setTemplateKey] = useState('');
  const [clientName, setClientName] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [plate, setPlate] = useState('');
  const [creator, setCreator] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<SopRecord['status']>('Pendiente');
  const [loading, setLoading] = useState(false);

  // Filters logic
  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.creator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.content.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCategory = categoryFilter === 'ALL' || r.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryTheme = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'recepcion': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'repuestos': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'operaciones': return 'bg-violet-500/10 text-violet-400 border border-violet-500/20';
      case 'garantias': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      case 'pendientes': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'incidencias': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default: return 'bg-zinc-800 text-zinc-400 border border-zinc-700/50';
    }
  };

  const getStatusTheme = (stat: string) => {
    switch (stat) {
      case 'Completado':
      case 'Aprobado':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
      case 'En proceso':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
      case 'Rechazado':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-500/15 text-slate-400 border border-slate-500/20';
    }
  };

  // Open creation modal
  const handleOpenCreate = () => {
    setEditingRecord(null);
    setTitle('');
    setCategory('recepcion');
    setTemplateKey('');
    setClientName('');
    setVehicle('');
    setPlate('');
    setCreator('Admin');
    setContent('');
    setStatus('Pendiente');
    setIsFormOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (rec: SopRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingRecord(rec);
    setTitle(rec.title);
    setCategory(rec.category);
    setTemplateKey(rec.template_key);
    setClientName(rec.client_name);
    setVehicle(rec.vehicle);
    setPlate(rec.plate);
    setCreator(rec.creator);
    setContent(rec.content);
    setStatus(rec.status);
    setIsFormOpen(true);
  };

  // Prepopulate form using template selection
  const handleTemplateSelect = (key: string) => {
    setTemplateKey(key);
    const tmpl = templates.find(t => t.key === key);
    if (tmpl) {
      setCategory(tmpl.category);
      setContent(tmpl.content);
      if (!title) {
        setTitle(`${tmpl.title.split(' ')[1] || tmpl.title} - ${new Date().toLocaleDateString()}`);
      }
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      const recordObj: SopRecord = {
        id: editingRecord?.id || `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category,
        template_key: templateKey,
        title: title.trim(),
        client_name: clientName.trim(),
        vehicle: vehicle.trim(),
        plate: plate.trim().toUpperCase(),
        creator: creator.trim() || 'Admin',
        content: content,
        status: status,
        created_at: editingRecord?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await onSaveRecord(recordObj);
      
      // Update selected record view if currently viewing it
      if (selectedRecord && selectedRecord.id === recordObj.id) {
        setSelectedRecord(recordObj);
      }

      setIsFormOpen(false);
    } catch (err) {
      alert('Error al guardar el registro');
    } finally {
      setLoading(false);
    }
  };

  // Handle deletion
  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('¿Eliminar este registro permanentemente? Esta acción es irreversible.')) {
      setLoading(true);
      try {
        await onDeleteRecord(id);
        if (selectedRecord && selectedRecord.id === id) {
          setSelectedRecord(null);
        }
      } catch (err) {
        alert('Error al eliminar registro');
      } finally {
        setLoading(false);
      }
    }
  };

  const handlePrint = (rec: SopRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRecord(rec);
    setIsPrintOpen(true);
  };

  const printDocument = () => {
    window.print();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Left Columns - Records List & Filters (spanning 2 cols) */}
      <div className="xl:col-span-2 space-y-6">
        
        {/* Filters Panel */}
        <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl shadow space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2">
            <h3 className="font-bold text-white text-md">Expedientes de Taller (Logs)</h3>
            
            <button 
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition"
            >
              <Plus size={14} />
              Añadir Registro
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
                <Search size={14} />
              </span>
              <input 
                type="text" 
                placeholder="Buscar por OT, placa, cliente, vehículo, notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-850 py-2 pl-9 pr-4 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-zinc-700 transition"
              />
            </div>

            {/* Filter Status */}
            <div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#18181b] border border-zinc-800 focus:border-zinc-700 text-zinc-300 rounded-xl px-3 py-2 text-xs focus:outline-none transition"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En proceso">En proceso</option>
                <option value="Completado">Completado</option>
                <option value="Aprobado">Aprobado</option>
                <option value="Rechazado">Rechazado</option>
              </select>
            </div>

          </div>

          {/* Quick Filter Tags (Horizontal scrollable) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs text-zinc-400">
            <span className="font-semibold text-[10px] uppercase text-zinc-550 mr-1.5 shrink-0">Categoría:</span>
            {[
              { val: 'ALL', label: 'Todos' },
              { val: 'recepcion', label: 'Recepción' },
              { val: 'repuestos', label: 'Repuestos' },
              { val: 'operaciones', label: 'Operaciones' },
              { val: 'garantias', label: 'Garantías' },
              { val: 'incidencias', label: 'Incidencias' },
              { val: 'calidad', label: 'QC' },
              { val: 'inspeccion', label: 'Inspecciones' },
            ].map((tab) => (
              <button
                key={tab.val}
                onClick={() => setCategoryFilter(tab.val)}
                className={`px-3 py-1 rounded-lg border font-medium shrink-0 transition ${
                  categoryFilter === tab.val
                    ? 'bg-sky-505/20 text-sky-400 border-sky-500/30'
                    : 'bg-[#18181b] border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

        </div>

        {/* Records Listing Grid */}
        <div className="space-y-3">
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record) => (
              <div 
                key={record.id} 
                onClick={() => setSelectedRecord(record)}
                className={`bg-zinc-900 border rounded-2xl p-4 cursor-pointer transition select-none flex flex-col md:flex-row justify-between gap-4 ${
                  selectedRecord && selectedRecord.id === record.id 
                    ? 'border-sky-500 shadow-md shadow-sky-950/10' 
                    : 'border-zinc-800/80 hover:border-zinc-755'
                }`}
              >
                
                {/* File Details (Left) */}
                <div className="space-y-2 flex-grow">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-zinc-100 text-sm">{record.title}</h4>
                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${getCategoryTheme(record.category)}`}>
                      {record.category}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${getStatusTheme(record.status)}`}>
                      {record.status}
                    </span>
                  </div>

                  {/* Metadata Icons Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
                    {record.client_name && (
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-zinc-500" />
                        <span>Cliente: <strong className="text-zinc-300 font-medium">{record.client_name}</strong></span>
                      </div>
                    )}
                    {record.vehicle && (
                      <div className="flex items-center gap-1.5">
                        <Car size={12} className="text-zinc-500" />
                        <span>Autos: <strong className="text-zinc-300 font-medium">{record.vehicle}</strong> ({record.plate || 'SIN PLACA'})</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <FileText size={12} className="text-zinc-500" />
                      <span>Agente: <strong className="text-zinc-300 font-medium">{record.creator}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-zinc-500" />
                      <span>{new Date(record.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Operations Buttons (Right) */}
                <div className="flex items-center justify-end md:flex-col md:justify-center md:items-end gap-2.5 border-t border-zinc-800/40 md:border-none pt-2.5 md:pt-0">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handlePrint(record, e)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-755 text-zinc-300 rounded-xl transition border border-zinc-700/50"
                      title="Imprimir / Exportar Reporte"
                    >
                      <Printer size={14} />
                    </button>
                    <button 
                      onClick={(e) => handleOpenEdit(record, e)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-755 text-zinc-350 rounded-xl transition border border-zinc-700/50"
                      title="Editar Contenido"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(record.id, e)}
                      className="p-2 bg-zinc-800 hover:bg-rose-955 text-zinc-400 hover:text-rose-400 rounded-xl transition border border-zinc-700/50 hover:border-rose-900/20"
                      title="Borrar Registro"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

              </div>
            ))
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl py-16 text-center text-zinc-500 text-sm">
              🔍 No se encontraron registros de SOP con los filtros aplicados.
            </div>
          )}
        </div>
      </div>

      {/* Right Column - File Details & Telegram Live Rendering */}
      <div className="space-y-6">
        {selectedRecord ? (
          <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl shadow space-y-5 sticky top-6">
            
            {/* Header detail */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-white text-md">Detalle de Ficha SOP</h3>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="text-zinc-500 hover:text-zinc-300 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Summary list */}
            <div className="space-y-3 bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
              <div className="flex items-start text-xs border-b border-zinc-850 pb-2">
                <span className="w-20 text-zinc-500 font-semibold uppercase tracking-wider shrink-0">Título:</span>
                <span className="text-zinc-200 font-medium">{selectedRecord.title}</span>
              </div>
              <div className="flex items-start text-xs border-b border-zinc-850 pb-2">
                <span className="w-20 text-zinc-500 font-semibold uppercase tracking-wider shrink-0">Cliente:</span>
                <span className="text-zinc-200 font-semibold">{selectedRecord.client_name || 'Desconocido'}</span>
              </div>
              <div className="flex items-start text-xs border-b border-zinc-850 pb-2">
                <span className="w-20 text-zinc-500 font-semibold uppercase tracking-wider shrink-0">Auto/Placa:</span>
                <span className="text-zinc-200 font-medium">{selectedRecord.vehicle || 'Sin Vehículo'} | {selectedRecord.plate || 'S/P'}</span>
              </div>
              <div className="flex items-start text-xs">
                <span className="w-20 text-zinc-500 font-semibold uppercase tracking-wider shrink-0">Estatus:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusTheme(selectedRecord.status)}`}>
                  {selectedRecord.status}
                </span>
              </div>
            </div>

            {/* Telegram Live Render frame */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide block">Vista Previa Telegram:</label>
              <TelegramPreview 
                title={selectedRecord.title} 
                content={selectedRecord.content} 
                category={selectedRecord.category} 
              />
            </div>

            {/* Buttons inside details panel */}
            <div className="flex gap-3 pt-2">
              <button 
                onClick={(e) => handleOpenEdit(selectedRecord, e)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs py-2 rounded-xl border border-zinc-700/50 shadow transition"
              >
                <Edit3 size={14} />
                Editar Datos
              </button>
              <button 
                onClick={(e) => handlePrint(selectedRecord, e)}
                className="flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs px-4 py-2 rounded-xl border border-zinc-700/50 shadow transition"
                title="Imprimir"
              >
                <Printer size={14} />
              </button>
            </div>

          </div>
        ) : (
          <div className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-2xl py-24 text-center text-zinc-500 text-sm flex flex-col items-center justify-center p-6 sticky top-6">
            <span className="text-3xl mb-3">📄</span>
            <p className="font-semibold text-zinc-400">Ningún expediente seleccionado</p>
            <p className="text-zinc-650 text-xs mt-1 max-w-[200px]">Haz clic en cualquier fila de la lista para ver el reporte de Telegram en vivo.</p>
          </div>
        )}
      </div>

      {/* Manual Creation / Edit Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-zinc-900 px-6 py-4 flex items-center justify-between border-b border-zinc-800">
              <h3 className="font-semibold text-white text-md">
                {editingRecord ? 'Editar Ficha SOP' : 'Registrar Nuevo Expediente SOP'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {!editingRecord && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Pre-cargar desde Plantilla SOP</label>
                  <select 
                    value={templateKey} 
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  >
                    <option value="">-- Autocompletar plantilla vacía --</option>
                    {templates.map(t => (
                      <option key={t.key} value={t.key}>{t.title} ({t.category})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title & Estatus row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Título del Expediente / Orden (OT)</label>
                  <input 
                    type="text" 
                    value={title} 
                    required
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: OT #5201 - Toyota Corolla 2018"
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Estatus Actual</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value as SopRecord['status'])}
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="En proceso">En proceso</option>
                    <option value="Completado">Completado</option>
                    <option value="Aprobado">Aprobado</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>
              </div>

              {/* Client, Vehicle, Plate metadata row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Nombre del Cliente</label>
                  <input 
                    type="text" 
                    value={clientName} 
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Alejandro Mendoza"
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Vehículo (Marca/Modelo/Año)</label>
                  <input 
                    type="text" 
                    value={vehicle} 
                    onChange={(e) => setVehicle(e.target.value)}
                    placeholder="Ej: Toyota Corolla 2018"
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Placas</label>
                  <input 
                    type="text" 
                    value={plate} 
                    onChange={(e) => setPlate(e.target.value)}
                    placeholder="Ej: AA890BB"
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-sm uppercase focus:outline-none transition font-sans"
                  />
                </div>
              </div>

              {/* Category and Creator block */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Categoría de Canal</label>
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  >
                    <option value="recepcion">Recepción</option>
                    <option value="repuestos">Repuestos</option>
                    <option value="operaciones">Operaciones</option>
                    <option value="garantias">Garantías / Retrabajos</option>
                    <option value="pendientes">Pendientes / Seguimiento</option>
                    <option value="incidencias">Incidencias</option>
                    <option value="calidad">Control de Calidad</option>
                    <option value="inspeccion">Inspecciones</option>
                    <option value="mejora">Mejora y Capacitación</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Creador del reporte (Técnico / Asesor)</label>
                  <input 
                    type="text" 
                    value={creator} 
                    onChange={(e) => setCreator(e.target.value)}
                    placeholder="Ej: José Gómez (Mecánico)"
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Report Raw Content */}
              <div className="space-y-1 flex-1 flex flex-col">
                <label className="text-xs font-semibold text-zinc-400 block pb-1">Mensaje/Reporte SOP Completo</label>
                <textarea 
                  value={content} 
                  required
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Detallar el reporte..."
                  className="w-full h-44 bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none transition font-mono resize-y"
                />
              </div>

              {/* Action buttons inside form */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-xs rounded-xl font-medium transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex items-center gap-1 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs rounded-xl font-semibold transition"
                >
                  {loading ? 'Redactando...' : (
                    <>
                      <Check size={14} />
                      Guardar Carpeta
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {isPrintOpen && selectedRecord && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          
          {/* Printable Container */}
          <div className="bg-white text-black w-full max-w-3xl shadow-2xl rounded-2xl overflow-hidden my-8 print:m-0 print:shadow-none print:w-full print:rounded-none">
            
            {/* Form control bar (not printable) */}
            <div className="bg-zinc-900 text-zinc-150 px-6 py-3 flex items-center justify-between border-b border-zinc-800 print:hidden">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <Printer size={15} />
                Vista de Impresión Oficial SOP
              </span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={printDocument}
                  className="bg-sky-500 hover:bg-sky-400 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-lg shadow transition"
                >
                  Imprimir Ficha
                </button>
                <button 
                  onClick={() => setIsPrintOpen(false)}
                  className="p-1 border border-zinc-750 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-250 transition"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Print Area */}
            <div className="p-8 space-y-6 print:p-0">
              
              {/* Report Header Logo */}
              <div className="flex items-center justify-between border-b-2 border-zinc-900 pb-4">
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">MasterTech Service</h1>
                  <p className="text-[10px] text-zinc-550 uppercase tracking-widest font-bold">Tecnología automotriz avanzada y servicios</p>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-semibold text-zinc-500 uppercase">Expediente Oficial</span>
                  <span className="font-mono text-sm font-bold text-zinc-800">#{selectedRecord.id.replace('rec-', 'MT-')}</span>
                </div>
              </div>

              {/* Title Header */}
              <h2 className="text-lg font-bold border-b border-zinc-300 pb-1.5 text-zinc-800">{selectedRecord.title}</h2>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-zinc-450 font-bold block">Cliente</span>
                    <span className="font-bold text-zinc-800 text-sm">{selectedRecord.client_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-zinc-450 font-bold block">Vehículo / Placas</span>
                    <span className="font-medium text-zinc-800">{selectedRecord.vehicle || 'Sin Vehículo'} | {selectedRecord.plate || 'S/P'}</span>
                  </div>
                </div>
                <div className="space-y-1.5 border-l border-zinc-200 pl-4">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-zinc-450 font-bold block">Categoría de SOP</span>
                    <span className="font-semibold text-zinc-800 capitalize">{selectedRecord.category}</span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-zinc-450 font-bold block">Fecha / Hora de Emisión</span>
                    <span className="font-medium text-zinc-700">{new Date(selectedRecord.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Document Status */}
              <div className="bg-zinc-100 p-3 rounded-lg border border-zinc-200 flex justify-between items-center text-xs">
                <span>Estado de aprobación: <strong className="text-zinc-850 uppercase">{selectedRecord.status}</strong></span>
                <span>Firmado por: <strong className="text-zinc-800">{selectedRecord.creator || 'Admin'}</strong></span>
              </div>

              {/* Content text */}
              <div className="space-y-2">
                <h4 className="text-[10px] uppercase font-bold text-zinc-550 border-b border-zinc-200 pb-1 tracking-wider">Detalle del Registro</h4>
                <div className="font-mono text-xs text-zinc-900 whitespace-pre-wrap leading-relaxed py-2 bg-zinc-50/50 p-4 border border-zinc-200 rounded-lg">
                  {selectedRecord.content}
                </div>
              </div>

              {/* Footer Signature */}
              <div className="grid grid-cols-2 gap-8 pt-12 text-center text-xs">
                <div className="space-y-4">
                  <div className="border-t border-zinc-400 w-44 mx-auto pt-1 text-zinc-500 font-medium">Taller / Responsable</div>
                </div>
                <div className="space-y-4">
                  <div className="border-t border-zinc-400 w-44 mx-auto pt-1 text-zinc-500 font-medium">Aceptación de Cliente</div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
