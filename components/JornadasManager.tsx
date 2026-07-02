import React, { useState } from 'react';
import { Jornada } from '@/lib/dashboard-db';
import { 
  Clock, 
  Trash2, 
  Edit3, 
  Search, 
  Check, 
  X, 
  Play, 
  StopCircle, 
  Plus,
  RefreshCw
} from 'lucide-react';

interface JornadasManagerProps {
  jornadas: Jornada[];
  onSaveJornada: (jornada: Partial<Jornada>) => Promise<void>;
  onDeleteJornada: (id: string | number) => Promise<void>;
  onRefresh: () => void;
}

export default function JornadasManager({ 
  jornadas, 
  onSaveJornada, 
  onDeleteJornada,
  onRefresh
}: JornadasManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVO' | 'FINALIZADO'>('ALL');
  
  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJornada, setEditingJornada] = useState<Jornada | null>(null);
  
  // Form fields
  const [username, setUsername] = useState('');
  const [telegramId, setTelegramId] = useState('');
  const [status, setStatus] = useState<'ACTIVO' | 'FINALIZADO'>('ACTIVO');
  const [startedAt, setStartedAt] = useState('');
  const [endedAt, setEndedAt] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter shifts
  const filteredJornadas = jornadas.filter(j => {
    const matchesSearch = j.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          String(j.telegram_id).includes(searchTerm);
    const matchesStatus = statusFilter === 'ALL' || j.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate work duration
  const getDuration = (startStr: string, endStr: string | null) => {
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : new Date();
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return '0 hrs';
    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hrs}h ${mins}m`;
  };

  const handleOpenCreate = () => {
    setEditingJornada(null);
    setUsername('');
    setTelegramId('');
    setStatus('ACTIVO');
    // Local date-time string matching form input format
    const localNow = new Date();
    // Offset local timezone offset
    localNow.setMinutes(localNow.getMinutes() - localNow.getTimezoneOffset());
    setStartedAt(localNow.toISOString().slice(0, 16));
    setEndedAt('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (j: Jornada) => {
    setEditingJornada(j);
    setUsername(j.username);
    setTelegramId(String(j.telegram_id));
    setStatus(j.status);
    
    const startStr = new Date(j.started_at);
    startStr.setMinutes(startStr.getMinutes() - startStr.getTimezoneOffset());
    setStartedAt(startStr.toISOString().slice(0, 16));
    
    if (j.ended_at) {
      const endStr = new Date(j.ended_at);
      endStr.setMinutes(endStr.getMinutes() - endStr.getTimezoneOffset());
      setEndedAt(endStr.toISOString().slice(0, 16));
    } else {
      setEndedAt('');
    }
    
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    try {
      const payload: Partial<Jornada> = {
        username: username.trim(),
        telegram_id: telegramId ? Number(telegramId) : 0,
        status,
        started_at: new Date(startedAt).toISOString(),
        ended_at: status === 'FINALIZADO' ? (endedAt ? new Date(endedAt).toISOString() : new Date().toISOString()) : null,
      };

      if (editingJornada) {
        payload.id = editingJornada.id;
      }

      await onSaveJornada(payload);
      setIsFormOpen(false);
    } catch (err) {
      alert('Error guardando jornada');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async (j: Jornada) => {
    if (confirm(`¿Finalizar jornada para ${j.username}?`)) {
      setLoading(true);
      try {
        await onSaveJornada({
          ...j,
          status: 'FINALIZADO',
          ended_at: new Date().toISOString()
        });
      } catch (err) {
        alert('Error al relojear salida');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (id: string | number) => {
    if (confirm('¿Eliminar este registro de jornada? Esta acción no se puede deshacer.')) {
      setLoading(true);
      try {
        await onDeleteJornada(id);
      } catch (err) {
        alert('Error eliminando jornada');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-zinc-900 p-4 border border-zinc-800/80 rounded-2xl shadow">
        
        {/* Left Search input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500 pointer-events-none">
            <Search size={16} />
          </span>
          <input 
            type="text" 
            placeholder="Buscar técnico por nombre o Telegram ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#18181b] border border-zinc-850 py-2 pl-9 pr-4 rounded-xl text-sm text-zinc-100 placeholder-zinc-505 focus:outline-none focus:border-zinc-700 transition"
          />
        </div>

        {/* Buttons / Filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Filter Status Selector */}
          <div className="flex bg-[#18181b] p-0.5 rounded-xl border border-zinc-850 text-xs font-semibold text-zinc-400">
            <button 
              onClick={() => setStatusFilter('ALL')}
              className={`${statusFilter === 'ALL' ? 'bg-zinc-800 text-white' : 'hover:text-zinc-200'} px-3 py-1.5 rounded-lg transition`}
            >
              Todos
            </button>
            <button 
              onClick={() => setStatusFilter('ACTIVO')}
              className={`${statusFilter === 'ACTIVO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'hover:text-zinc-200'} px-3 py-1.5 rounded-lg transition`}
            >
              Activos
            </button>
            <button 
              onClick={() => setStatusFilter('FINALIZADO')}
              className={`${statusFilter === 'FINALIZADO' ? 'bg-zinc-800 text-white' : 'hover:text-zinc-200'} px-3 py-1.5 rounded-lg transition`}
            >
              Finalizados
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={onRefresh}
            className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 text-zinc-300 rounded-xl transition"
            title="Refrescar lista"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 bg-[#18181b] hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-100 font-medium text-xs px-3.5 py-2 rounded-xl transition"
          >
            <Plus size={14} />
            Iniciar Manual
          </button>
        </div>

      </div>

      {/* Shifts Table */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-4.5 px-6">Técnico</th>
              <th className="py-4.5 px-6">Telegram ID</th>
              <th className="py-4.5 px-6">Inicio Turno</th>
              <th className="py-4.5 px-6">Fin Turno</th>
              <th className="py-4.5 px-6 text-center">Estado</th>
              <th className="py-4.5 px-6">Duración</th>
              <th className="py-4.5 px-6 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-sm">
            {filteredJornadas.length > 0 ? (
              filteredJornadas.map((jornada) => {
                const isActive = jornada.status === 'ACTIVO';
                return (
                  <tr key={jornada.id} className="hover:bg-zinc-850/20 transition-colors">
                    
                    {/* Username detail */}
                    <td className="py-4 px-6 font-semibold text-zinc-200">
                      {jornada.username}
                    </td>

                    {/* Telegram ID */}
                    <td className="py-4 px-6 text-zinc-400 font-mono text-xs">
                      {jornada.telegram_id || 'manual/admin'}
                    </td>

                    {/* Start Time */}
                    <td className="py-4 px-6 text-zinc-300">
                      <div className="flex flex-col">
                        <span>{new Date(jornada.started_at).toLocaleDateString()}</span>
                        <span className="text-zinc-500 text-xs mt-0.5">
                          {new Date(jornada.started_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* End Time */}
                    <td className="py-4 px-6 text-zinc-300">
                      {jornada.ended_at ? (
                        <div className="flex flex-col">
                          <span>{new Date(jornada.ended_at).toLocaleDateString()}</span>
                          <span className="text-zinc-500 text-xs mt-0.5">
                            {new Date(jornada.ended_at).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-500 italic text-xs">Aún en turno</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                      }`}>
                        {isActive && <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />}
                        {jornada.status}
                      </span>
                    </td>

                    {/* Duration worked */}
                    <td className="py-4 px-6 text-zinc-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-zinc-400" />
                        {getDuration(jornada.started_at, jornada.ended_at)}
                      </div>
                    </td>

                    {/* Actions buttons */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        {isActive && (
                          <button 
                            onClick={() => handleClockOut(jornada)}
                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition border border-rose-500/20"
                            title="Registrar Salida (Relojear)"
                          >
                            <StopCircle size={15} />
                          </button>
                        )}
                        <button 
                          onClick={() => handleOpenEdit(jornada)}
                          className="p-1.5 bg-zinc-800 hover:bg-zinc-755 text-zinc-300 rounded-lg transition border border-zinc-700/50"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(jornada.id)}
                          className="p-1.5 bg-zinc-800 hover:bg-rose-950/20 text-zinc-400 hover:text-rose-400 rounded-lg transition border border-zinc-700/50 hover:border-rose-900/30"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500 text-sm">
                  🔍 No se encontraron registros de jornada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Manual clock form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-zinc-900 px-6 py-4 flex items-center justify-between border-b border-zinc-800">
              <h3 className="font-semibold text-white text-md">
                {editingJornada ? 'Editar Ficha de Jornada' : 'Iniciar Nueva Jornada'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 transition"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              
              {/* Technician name field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 block">Nombre del Técnico</label>
                <input 
                  type="text" 
                  value={username} 
                  required
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: Carlos Pérez"
                  className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                />
              </div>

              {/* Telegram ID block */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 block">Telegram ID (Opcional)</label>
                <input 
                  type="number" 
                  value={telegramId} 
                  onChange={(e) => setTelegramId(e.target.value)}
                  placeholder="Ej: 11223344"
                  className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none transition font-mono"
                />
              </div>

              {/* Status and Clock times */}
              <div className="grid grid-cols-2 gap-3 pb-1">
                
                {/* Status selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Estatus</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value as 'ACTIVO' | 'FINALIZADO')}
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none transition"
                  >
                    <option value="ACTIVO">Activo</option>
                    <option value="FINALIZADO">Finalizado</option>
                  </select>
                </div>

                {/* Clock-In time */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Inicio Turno</label>
                  <input 
                    type="datetime-local" 
                    value={startedAt} 
                    required
                    onChange={(e) => setStartedAt(e.target.value)}
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none transition font-sans"
                  />
                </div>

              </div>

              {/* Clock-Out time (visible only if finalized) */}
              {status === 'FINALIZADO' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400 block">Fin Turno (Salida)</label>
                  <input 
                    type="datetime-local" 
                    value={endedAt} 
                    onChange={(e) => setEndedAt(e.target.value)}
                    placeholder="Dejar vacío para registrar hora actual"
                    className="w-full bg-[#09090b] border border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none transition font-sans"
                  />
                </div>
              )}

              {/* Submission block */}
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
                      Guardar Jornada
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
