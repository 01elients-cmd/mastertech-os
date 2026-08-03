'use client';

import React, { useState, useEffect } from 'react';
import { 
  FolderGit2, 
  Plus, 
  Trash2, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  Cloud, 
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Save
} from 'lucide-react';

interface VehicleTopic {
  identifier: string;
  thread_id: number;
  created_at?: string;
}

interface TopicsManagerProps {
  config: {
    TALLER_ORIGEN_ID?: string;
    TALLER_FORO_DESTINO_ID?: string;
  };
  onSaveConfig: (newConfig: any) => Promise<void>;
}

export default function TopicsManager({ config, onSaveConfig }: TopicsManagerProps) {
  const [topics, setTopics] = useState<VehicleTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Formulario de creación
  const [newTitle, setNewTitle] = useState('');
  const [newOrden, setNewOrden] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Configuración de IDs de Grupos
  const [origenId, setOrigenId] = useState(config.TALLER_ORIGEN_ID || '-1003940815012');
  const [destinoId, setDestinoId] = useState(config.TALLER_FORO_DESTINO_ID || '-1003975478850');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSavedStatus, setConfigSavedStatus] = useState(false);

  const fetchTopics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/topics');
      const data = await res.json();
      if (data.topics) {
        setTopics(data.topics);
      }
    } catch (e) {
      console.error('Error cargando topics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/dashboard/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicTitle: newTitle.trim(),
          orden: newOrden.trim() || undefined,
          vehiculo: newTitle.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear el tema');

      setNewTitle('');
      setNewOrden('');
      setIsCreating(false);
      fetchTopics();
    } catch (err: any) {
      alert(err.message || 'Error al crear el hilo en Telegram');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTopic = async (threadId: number) => {
    if (!confirm(`¿Estás seguro de eliminar el Hilo ID ${threadId} de la Nube?`)) return;

    try {
      const res = await fetch(`/api/dashboard/topics?thread_id=${threadId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error eliminando tema');

      fetchTopics();
    } catch (err: any) {
      alert('Error eliminando el tema');
    }
  };

  const handleSaveGroupConfig = async () => {
    setSavingConfig(true);
    try {
      await onSaveConfig({
        ...config,
        TALLER_ORIGEN_ID: origenId.trim(),
        TALLER_FORO_DESTINO_ID: destinoId.trim()
      });
      setConfigSavedStatus(true);
      setTimeout(() => setConfigSavedStatus(false), 3000);
    } catch (e) {
      alert('Error guardando configuración de grupos');
    } finally {
      setSavingConfig(false);
    }
  };

  const filteredTopics = topics.filter(t => 
    t.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(t.thread_id).includes(searchTerm)
  );

  return (
    <div className="space-y-6 font-sans">
      
      {/* 1. SECCIÓN DE CONFIGURACIÓN DE GRUPOS TELEGRAM */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-400" />
              Configuración de Grupos Telegram
            </h3>
            <p className="text-xs text-zinc-400">Define los IDs de los canales de Operaciones (Notificaciones) y Nube (Foro de Hilos por Vehículo).</p>
          </div>

          <button
            onClick={handleSaveGroupConfig}
            disabled={savingConfig}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {savingConfig ? 'Guardando...' : 'Guardar IDs de Grupos'}
          </button>
        </div>

        {configSavedStatus && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-2.5 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> IDs de grupos guardados correctamente.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-zinc-300 block mb-1">Grupo Notificaciones # General (`TALLER_ORIGEN_ID`)</label>
            <input
              type="text"
              value={origenId}
              onChange={(e) => setOrigenId(e.target.value)}
              placeholder="-1003940815012"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 font-mono outline-none focus:border-blue-500"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">Aquí llegan las citas, nuevos ingresos y alertas generales (ID actual: -1003940815012).</span>
          </div>

          <div>
            <label className="font-bold text-zinc-300 block mb-1">Grupo Foro de la Nube (`TALLER_FORO_DESTINO_ID`)</label>
            <input
              type="text"
              value={destinoId}
              onChange={(e) => setDestinoId(e.target.value)}
              placeholder="-1003975478850"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 font-mono outline-none focus:border-blue-500"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">Aquí se crean automáticamente los Hilos por Vehículo u Orden (ID actual: -1003975478850).</span>
          </div>
        </div>
      </div>

      {/* 2. DIRECTORIO DE HILOS/TOPICS CREADOS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
          <div>
            <h3 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-blue-400" />
              Directorio de Hilos / Topics Creados en la Nube
            </h3>
            <p className="text-xs text-zinc-400">Listado completo de vehículos vinculados con sus Thread IDs de Telegram.</p>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-lg flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Crear Hilo Directo desde Web
          </button>
        </div>

        {/* Buscador */}
        <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por vehículo, orden o Thread ID..."
            className="bg-transparent border-none outline-none text-xs text-zinc-200 placeholder-zinc-500 flex-1"
          />
          <button onClick={fetchTopics} className="text-zinc-400 hover:text-zinc-200 p-1">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Crear Hilo */}
        {isCreating && (
          <form onSubmit={handleCreateTopic} className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-3">
            <h4 className="font-bold text-xs text-zinc-200">➕ Crear Nuevo Hilo en Telegram Nube</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Nombre del Vehículo / Título *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: OT-5250 Toyota Corolla"
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Número de Orden / OT (Opcional)</label>
                <input
                  type="text"
                  value={newOrden}
                  onChange={(e) => setNewOrden(e.target.value)}
                  placeholder="Ej: 5250"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow"
              >
                {submitting ? 'Creando...' : 'Crear Hilo en Telegram'}
              </button>
            </div>
          </form>
        )}

        {/* Tabla de Hilos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider bg-zinc-950/60">
                <th className="p-3">Vehículo / Identificador</th>
                <th className="p-3">Thread ID (Telegram)</th>
                <th className="p-3">Fecha Registro</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredTopics.map((item, idx) => (
                <tr key={`${item.thread_id}_${idx}`} className="hover:bg-zinc-950/40 transition">
                  <td className="p-3 font-semibold text-zinc-200">
                    {item.identifier}
                  </td>
                  <td className="p-3 font-mono text-blue-400">
                    <span className="bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                      #{item.thread_id}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400 font-mono text-[11px]">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : 'Registrado'}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDeleteTopic(item.thread_id)}
                      className="text-rose-400 hover:bg-rose-950/50 p-1.5 rounded-lg transition"
                      title="Eliminar Hilo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredTopics.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">
                    No hay hilos o temas registrados en el sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
