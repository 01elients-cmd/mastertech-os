'use client';

import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Plus, 
  Search, 
  Trash2, 
  RefreshCw, 
  MessageSquare, 
  Save, 
  CheckCircle2, 
  FolderGit2, 
  Bot, 
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Send
} from 'lucide-react';
import Link from 'next/link';

interface VehicleTopic {
  identifier: string;
  thread_id: number;
  created_at?: string;
}

export default function StandaloneTelegramPanel() {
  const [topics, setTopics] = useState<VehicleTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal creación de Hilo
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newOrden, setNewOrden] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Configuración de IDs de Grupos
  const [origenId, setOrigenId] = useState('-1003940815012');
  const [destinoId, setDestinoId] = useState('-1003975478850');
  const [botToken, setBotToken] = useState('8970513614:AAGCdMrJTbIH1QmKCFXcIzv5QxPX86e_23U');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSavedStatus, setConfigSavedStatus] = useState(false);

  // Cargar datos al iniciar
  const loadData = async () => {
    setLoading(true);
    try {
      const [topicsRes, configRes] = await Promise.all([
        fetch('/api/dashboard/topics').then(r => r.json()),
        fetch('/api/dashboard/config').then(r => r.json())
      ]);

      if (topicsRes.topics) setTopics(topicsRes.topics);
      if (configRes.config) {
        if (configRes.config.TALLER_ORIGEN_ID) setOrigenId(configRes.config.TALLER_ORIGEN_ID);
        if (configRes.config.TALLER_FORO_DESTINO_ID) setDestinoId(configRes.config.TALLER_FORO_DESTINO_ID);
        if (configRes.config.TELEGRAM_BOT_TOKEN) setBotToken(configRes.config.TELEGRAM_BOT_TOKEN);
      }
    } catch (e) {
      console.error('Error cargando datos del panel:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
      if (!res.ok) throw new Error(data.error || 'Error creando hilo');

      setNewTitle('');
      setNewOrden('');
      setIsCreating(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error creando el hilo en Telegram Nube');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTopic = async (threadId: number) => {
    if (!confirm(`¿Deseas borrar definitivamente el Hilo ID #${threadId} de Telegram Nube y del sistema?`)) return;

    try {
      const res = await fetch(`/api/dashboard/topics?thread_id=${threadId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Error al eliminar hilo');

      loadData();
    } catch (err: any) {
      alert('Error eliminando el tema');
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/dashboard/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          TALLER_ORIGEN_ID: origenId.trim(),
          TALLER_FORO_DESTINO_ID: destinoId.trim(),
          TELEGRAM_BOT_TOKEN: botToken.trim()
        })
      });

      if (!res.ok) throw new Error('Error guardando configuración');
      setConfigSavedStatus(true);
      setTimeout(() => setConfigSavedStatus(false), 3000);
    } catch (e) {
      alert('Error al guardar la configuración');
    } finally {
      setSavingConfig(false);
    }
  };

  const filteredTopics = topics.filter(t => 
    t.identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(t.thread_id).includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-12 selection:bg-blue-500 selection:text-white">
      
      {/* Header Fijo del Panel */}
      <header className="bg-zinc-900/90 backdrop-blur-xl border-b border-zinc-800 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-xl transition" title="Volver al Panel Principal">
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="bg-gradient-to-tr from-sky-500 to-blue-600 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-sky-500/20">
            <Bot className="w-5 h-5" />
          </div>

          <div>
            <h1 className="font-black text-base tracking-tight text-white flex items-center gap-2">
              PANEL TELEGRAM NUBE & HILOS
              <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full font-mono">STANDALONE</span>
            </h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">MasterTech OS • Centro de Control de Foro & Bot</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full text-zinc-300 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Estado Bot: <span className="text-emerald-400 font-bold">Activo</span>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Crear Nuevo Hilo
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Banner de Estado e Información */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Total Hilos Registrados</span>
              <span className="text-2xl font-black text-white font-mono">{topics.length}</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Grupo Notificaciones</span>
              <span className="text-xs font-mono text-zinc-300 truncate block font-semibold">{origenId}</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Grupo Foro Nube</span>
              <span className="text-xs font-mono text-zinc-300 truncate block font-semibold">{destinoId}</span>
            </div>
          </div>
        </div>

        {/* 1. SECCIÓN DE CONFIGURACIÓN DE RUTEO Y GRUPOS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h2 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                Configuración de Canales y Grupos de Telegram
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Asigna los IDs oficiales de Telegram donde opera el bot.</p>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={savingConfig}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {savingConfig ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>

          {configSavedStatus && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-3 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Configuración actualizada correctamente.
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
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">Canal principal de notificaciones del taller (`MT Operatio. Mmm Group`).</span>
            </div>

            <div>
              <label className="font-bold text-zinc-300 block mb-1">Grupo Nube Foro (`TALLER_FORO_DESTINO_ID`)</label>
              <input
                type="text"
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
                placeholder="-1003975478850"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">Supergrupo donde se abren los Hilos por Vehículo (`NUBE - MT OPERACIONES`).</span>
            </div>
          </div>
        </div>

        {/* 2. TABLA DE DIRECTORIO DE HILOS NUBE */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-3">
            <div>
              <h2 className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-blue-400" />
                Directorio de Hilos y Temas Registrados
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">Controla y administra los Hilos IDs de cada automóvil en Telegram.</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Buscador */}
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar vehículo u orden..."
                  className="bg-transparent border-none outline-none text-xs text-zinc-200 placeholder-zinc-500 w-full"
                />
              </div>

              <button onClick={loadData} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition" title="Refrescar lista">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Modal Crear Hilo */}
          {isCreating && (
            <form onSubmit={handleCreateTopic} className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl space-y-4 animate-in fade-in duration-200">
              <h3 className="font-bold text-xs text-zinc-200 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                Crear Nuevo Hilo en la Nube de Telegram
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">Nombre del Vehículo / Título *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ej: OT-5250 Toyota Corolla"
                    required
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">Número de Orden (Opcional)</label>
                  <input
                    type="text"
                    value={newOrden}
                    onChange={(e) => setNewOrden(e.target.value)}
                    placeholder="Ej: 5250"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="bg-zinc-800 text-zinc-300 text-xs px-4 py-2 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-5 py-2 rounded-xl shadow-lg transition flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? 'Creando Tema...' : 'Crear en Telegram'}
                </button>
              </div>
            </form>
          )}

          {/* Tabla */}
          <div className="overflow-x-auto rounded-2xl border border-zinc-800/80">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider bg-zinc-950">
                  <th className="p-3.5">Vehículo / Identificador</th>
                  <th className="p-3.5">Thread ID (Telegram)</th>
                  <th className="p-3.5">Fecha de Registro</th>
                  <th className="p-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/40">
                {filteredTopics.map((item, idx) => (
                  <tr key={`${item.thread_id}_${idx}`} className="hover:bg-zinc-950/60 transition">
                    <td className="p-3.5 font-bold text-zinc-100">
                      {item.identifier}
                    </td>
                    <td className="p-3.5 font-mono text-blue-400">
                      <span className="bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg font-bold">
                        #{item.thread_id}
                      </span>
                    </td>
                    <td className="p-3.5 text-zinc-400 font-mono text-[11px]">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : 'Registrado'}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleDeleteTopic(item.thread_id)}
                        className="text-rose-400 hover:bg-rose-950/60 p-2 rounded-xl transition"
                        title="Borrar Hilo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredTopics.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-zinc-500">
                      No se encontraron hilos o temas registrados en Telegram.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </main>

    </div>
  );
}
