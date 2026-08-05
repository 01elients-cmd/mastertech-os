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
  MessageSquare,
  Save,
  ChevronDown,
  ChevronUp,
  Tag,
  Edit3,
  X,
  Check
} from 'lucide-react';

interface VehicleTopic {
  identifier: string;
  thread_id: number;
  created_at?: string;
}

interface GroupedTopic {
  thread_id: number;
  mainTitle: string;
  aliases: string[];
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
  const [expandedThreadId, setExpandedThreadId] = useState<number | null>(null);

  // Estado de edición
  const [editingThreadId, setEditingThreadId] = useState<number | null>(null);
  const [editMainTitle, setEditMainTitle] = useState('');
  const [editAliases, setEditAliases] = useState<string[]>([]);
  const [newAliasInput, setNewAliasInput] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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

  const startEditing = (group: GroupedTopic) => {
    setEditingThreadId(group.thread_id);
    setEditMainTitle(group.mainTitle);
    setEditAliases([...group.aliases]);
    setNewAliasInput('');
    setExpandedThreadId(group.thread_id);
  };

  const handleAddAlias = () => {
    if (!newAliasInput.trim()) return;
    const trimmed = newAliasInput.trim();
    if (!editAliases.includes(trimmed)) {
      setEditAliases([...editAliases, trimmed]);
    }
    setNewAliasInput('');
  };

  const handleRemoveAlias = (aliasToRemove: string) => {
    setEditAliases(editAliases.filter(a => a !== aliasToRemove));
  };

  const handleSaveEdit = async (threadId: number) => {
    if (!editMainTitle.trim()) return;
    setSavingEdit(true);

    try {
      const res = await fetch('/api/dashboard/topics', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          mainTitle: editMainTitle.trim(),
          aliases: editAliases
        })
      });

      if (!res.ok) throw new Error('Error guardando cambios del tema');

      setEditingThreadId(null);
      fetchTopics();
    } catch (err: any) {
      alert(err.message || 'Error al actualizar el tema');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteTopic = async (threadId: number) => {
    if (!confirm(`¿Estás seguro de eliminar el Hilo ID #${threadId} de la Nube y todas sus palabras clave vinculadas?`)) return;

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

  // Agrupar registros por Thread ID
  const groupedMap = new Map<number, GroupedTopic>();

  topics.forEach(item => {
    if (!groupedMap.has(item.thread_id)) {
      groupedMap.set(item.thread_id, {
        thread_id: item.thread_id,
        mainTitle: item.identifier,
        aliases: [item.identifier],
        created_at: item.created_at
      });
    } else {
      const existing = groupedMap.get(item.thread_id)!;
      if (!existing.aliases.includes(item.identifier)) {
        existing.aliases.push(item.identifier);
      }
      if (item.identifier.startsWith('🚗') && !existing.mainTitle.startsWith('🚗')) {
        existing.mainTitle = item.identifier;
      } else if (item.identifier.length > existing.mainTitle.length && !existing.mainTitle.startsWith('🚗')) {
        existing.mainTitle = item.identifier;
      }
    }
  });

  const groupedTopicsList = Array.from(groupedMap.values());

  const filteredGroupedTopics = groupedTopicsList.filter(g => 
    g.mainTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(g.thread_id).includes(searchTerm) ||
    g.aliases.some(a => a.toLowerCase().includes(searchTerm.toLowerCase()))
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
              Directorio de Hilos de la Nube (Agrupados por Vehículo)
            </h3>
            <p className="text-xs text-zinc-400">Listado simplificado por Hilo ID. Puedes editar el nombre principal y gestionar palabras secundarias.</p>
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
            placeholder="Buscar por vehículo, orden, alias o Thread ID..."
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

        {/* Tabla Agrupada de Hilos con Edición Integrada */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider bg-zinc-950/80">
                <th className="p-3">Vehículo Principal</th>
                <th className="p-3">Hilo ID (Telegram)</th>
                <th className="p-3">Claves de Vinculación</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredGroupedTopics.map((group) => {
                const isExpanded = expandedThreadId === group.thread_id;
                const isEditing = editingThreadId === group.thread_id;
                const secondaryAliases = group.aliases.filter(a => a !== group.mainTitle);

                return (
                  <React.Fragment key={group.thread_id}>
                    <tr className="hover:bg-zinc-950/60 transition cursor-pointer" onClick={() => setExpandedThreadId(isExpanded ? null : group.thread_id)}>
                      <td className="p-3 font-bold text-zinc-100 flex items-center gap-2">
                        <span>{group.mainTitle}</span>
                      </td>

                      <td className="p-3 font-mono text-blue-400">
                        <span className="bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg font-bold">
                          #{group.thread_id}
                        </span>
                      </td>

                      <td className="p-3">
                        {secondaryAliases.length > 0 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedThreadId(isExpanded ? null : group.thread_id);
                            }}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-medium transition"
                          >
                            <Tag className="w-3 h-3 text-blue-400" />
                            {secondaryAliases.length} palabras secundarias
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">Única clave principal</span>
                        )}
                      </td>

                      <td className="p-3 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(group);
                          }}
                          className="text-blue-400 hover:bg-blue-950/50 p-1.5 rounded-lg transition"
                          title="Editar Nombre y Palabras Secundarias"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTopic(group.thread_id);
                          }}
                          className="text-rose-400 hover:bg-rose-950/50 p-1.5 rounded-lg transition"
                          title="Eliminar Hilo Completo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Fila Modo Edición / Desplegable de Palabras Secundarias */}
                    {isExpanded && (
                      <tr className="bg-zinc-950/80 border-b border-zinc-800">
                        <td colSpan={4} className="p-3 pl-8">
                          {isEditing ? (
                            /* PANEL EDICIÓN DE TÍTULO Y ALIAS */
                            <div className="bg-zinc-900 border border-blue-500/40 rounded-xl p-4 space-y-4 shadow-xl">
                              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                                <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                                  <Edit3 className="w-4 h-4" />
                                  Editando Hilo ID #{group.thread_id}
                                </span>
                                <button onClick={() => setEditingThreadId(null)} className="text-zinc-400 hover:text-zinc-200">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              {/* 1. Editar Nombre Principal */}
                              <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 block mb-1">
                                  Nombre Principal del Vehículo / Tema en Telegram:
                                </label>
                                <input
                                  type="text"
                                  value={editMainTitle}
                                  onChange={(e) => setEditMainTitle(e.target.value)}
                                  placeholder="Ej: 🚗 OT-1692 Grand Cherokee"
                                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 outline-none focus:border-blue-500"
                                />
                              </div>

                              {/* 2. Gestionar Palabras Secundarias (Alias) */}
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-300 block">
                                  Palabras Secundarias de Búsqueda (Alias):
                                </label>

                                <div className="flex flex-wrap gap-2">
                                  {editAliases.map((alias, aIdx) => (
                                    <span 
                                      key={aIdx} 
                                      className="bg-zinc-800 text-zinc-200 border border-zinc-700 text-[11px] px-2.5 py-1 rounded-md font-mono flex items-center gap-1.5"
                                    >
                                      {alias}
                                      <button 
                                        onClick={() => handleRemoveAlias(alias)}
                                        className="text-zinc-400 hover:text-rose-400 p-0.5"
                                        title="Eliminar palabra clave"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </span>
                                  ))}
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                  <input
                                    type="text"
                                    value={newAliasInput}
                                    onChange={(e) => setNewAliasInput(e.target.value)}
                                    placeholder="Agregar palabra o número (ej: 1692, AA890BB)..."
                                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs text-zinc-200 flex-1 outline-none focus:border-blue-500"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleAddAlias();
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={handleAddAlias}
                                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> Agregar
                                  </button>
                                </div>
                              </div>

                              {/* Botones de guardar edición */}
                              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                                <button
                                  onClick={() => setEditingThreadId(null)}
                                  className="bg-zinc-800 text-zinc-300 text-xs px-3 py-1.5 rounded-lg"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(group.thread_id)}
                                  disabled={savingEdit}
                                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow flex items-center gap-1.5"
                                >
                                  <Check className="w-4 h-4" />
                                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* MODO LECTURA DESPLEGABLE */
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block flex items-center gap-1.5">
                                <Tag className="w-3 h-3 text-blue-400" />
                                Términos de búsqueda que redirigen a este Hilo #{group.thread_id}:
                              </span>

                              <div className="flex flex-wrap gap-2">
                                {group.aliases.map((alias, aIdx) => (
                                  <span 
                                    key={aIdx} 
                                    className={`text-[11px] px-2.5 py-1 rounded-md font-mono ${
                                      alias === group.mainTitle
                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold'
                                        : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                                    }`}
                                  >
                                    {alias}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredGroupedTopics.length === 0 && !loading && (
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
