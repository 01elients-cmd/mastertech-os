'use client';

import React, { useState, useEffect } from 'react';
import { SopRecord, SopTemplate, Jornada } from '@/lib/dashboard-db';
import DashboardOverview from '@/components/DashboardOverview';
import JornadasManager from '@/components/JornadasManager';
import RecordsManager from '@/components/RecordsManager';
import TemplateEditor from '@/components/TemplateEditor';
import ConfigSettings from '@/components/ConfigSettings';
import { 
  LayoutDashboard, 
  Clock, 
  FileText, 
  Settings, 
  MessageSquareCode,
  Moon,
  Sun,
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data State
  const [records, setRecords] = useState<SopRecord[]>([]);
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [templates, setTemplates] = useState<SopTemplate[]>([]);
  const [config, setConfig] = useState({
    NEXT_PUBLIC_SUPABASE_URL: '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
    TELEGRAM_BOT_TOKEN: '',
  });
  const [status, setStatus] = useState({
    supabase: 'DISCONNECTED',
    errorMessage: '',
    telegramActive: false,
  });

  const [loading, setLoading] = useState(true);

  // Fetch all initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Parallel fetches for speed
      const [configRes, templatesRes, recordsRes, jornadasRes] = await Promise.all([
        fetch('/api/dashboard/config').then(r => r.json()),
        fetch('/api/dashboard/templates').then(r => r.json()),
        fetch('/api/dashboard/records').then(r => r.json()),
        fetch('/api/dashboard/jornadas').then(r => r.json()),
      ]);

      if (configRes.config) setConfig(configRes.config);
      if (configRes.status) setStatus(configRes.status);
      if (templatesRes.templates) setTemplates(templatesRes.templates);
      if (recordsRes.records) setRecords(recordsRes.records);
      if (jornadasRes.jornadas) setJornadas(jornadasRes.jornadas);
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers for dynamic actions
  const handleSaveTemplate = async (templateObj: SopTemplate) => {
    const res = await fetch('/api/dashboard/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(templateObj),
    });
    if (!res.ok) throw new Error('Failed to save template');
    
    // Refresh local list
    const data = await res.json();
    setTemplates(prev => prev.map(t => t.key === data.template.key ? data.template : t));
  };

  const handleSaveRecord = async (recordObj: SopRecord) => {
    const res = await fetch('/api/dashboard/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recordObj),
    });
    if (!res.ok) throw new Error('Failed to save record');
    
    const data = await res.json();
    setRecords(prev => {
      const index = prev.findIndex(r => r.id === data.record.id);
      if (index >= 0) {
        return prev.map(r => r.id === data.record.id ? data.record : r);
      } else {
        return [data.record, ...prev];
      }
    });
  };

  const handleDeleteRecord = async (id: string) => {
    const res = await fetch(`/api/dashboard/records?id=${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete record');
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const handleSaveJornada = async (jornadaObj: Partial<Jornada>) => {
    const res = await fetch('/api/dashboard/jornadas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jornadaObj),
    });
    if (!res.ok) throw new Error('Failed to save shift');
    
    const data = await res.json();
    setJornadas(prev => {
      const index = prev.findIndex(j => String(j.id) === String(data.jornada.id));
      if (index >= 0) {
        return prev.map(j => String(j.id) === String(data.jornada.id) ? data.jornada : j);
      } else {
        return [data.jornada, ...prev];
      }
    });
  };

  const handleDeleteJornada = async (id: string | number) => {
    const res = await fetch(`/api/dashboard/jornadas?id=${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete shift');
    setJornadas(prev => prev.filter(j => String(j.id) !== String(id)));
  };

  const handleSaveConfig = async (newConfig: typeof config) => {
    const res = await fetch('/api/dashboard/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    });
    if (!res.ok) throw new Error('Failed to save configuration');
    setConfig(newConfig);
    
    // Trigger config reload test in API after brief delay
    setTimeout(() => {
      fetchData();
    }, 1000);
  };

  // Navigations shorthand
  const handleNavigateTab = (tabName: string) => {
    setActiveTab(tabName);
    setSidebarOpen(false);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Panel General', icon: LayoutDashboard },
    { id: 'jornadas', label: 'Jornadas de Trabajo', icon: Clock },
    { id: 'registros', label: 'Respuestas & SOPs', icon: FileText },
    { id: 'plantillas', label: 'Editor de Plantillas', icon: MessageSquareCode },
    { id: 'config', label: 'Conexión y Base Datos', icon: Settings },
  ];

  return (
    <div className={`${darkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'} min-h-screen flex flex-col font-sans transition-colors duration-200`}>
      
      {/* Top Main Navigation Bar */}
      <h1 className="sr-only">MasterTech OS Dashboard</h1>
      <header className="bg-zinc-900 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-40 transition px-6 py-4 flex items-center justify-between">
        
        {/* Brand logo */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
            aria-label="Abrir menú"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="bg-gradient-to-tr from-sky-500 to-blue-600 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-sky-500/20">
            MT
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              MASTERTECH OS
              <span className="text-[9px] bg-sky-500/10 text-sky-400 px-1.5 py-0.2 rounded-full border border-sky-400/20 font-bold uppercase tracking-wider">v1.2</span>
            </span>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold">Sistema de Operaciones de Taller</p>
          </div>
        </div>

        {/* Action Controls right */}
        <div className="flex items-center gap-4">
          
          {/* Supabase link bubble status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 border border-zinc-850 px-3 py-1 rounded-full bg-zinc-900 shadow-sm font-semibold select-none">
            <ShieldCheck size={14} className={status.supabase === 'CONNECTED' ? 'text-emerald-400' : 'text-zinc-500'} />
            DB: <span className={status.supabase === 'CONNECTED' ? 'text-emerald-400' : 'text-zinc-400'}>
              {status.supabase === 'CONNECTED' ? 'En línea' : 'Local Sandbox'}
            </span>
          </div>

          {/* Theme Shift Button */}
          <button 
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 border border-zinc-800 dark:border-zinc-850 hover:bg-zinc-800 rounded-xl transition text-zinc-400 hover:text-zinc-200 bg-zinc-900 cursor-pointer shadow-sm"
            aria-label="Alternar modo visual"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          
        </div>

      </header>

      {/* Main Layout Area */}
      <div className="flex-1 flex relative">
        
        {/* Sidebar Container */}
        <nav 
          className={`
            fixed md:relative top-0 bottom-0 left-0 z-35 md:z-10
            w-64 bg-zinc-900 border-r border-zinc-800 p-5 space-y-6 
            transform md:transform-none transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            pt-20 md:pt-6
          `}
          aria-label="Menú principal"
        >
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-zinc-450 uppercase tracking-widest pl-2 mb-1.5 block">Navegación</span>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigateTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-xs font-semibold tracking-wide transition ${
                    isActive
                      ? 'bg-sky-505/20 text-sky-400 border-sky-500/30'
                      : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-2xl space-y-2 select-none">
            <span className="font-bold text-[10px] text-zinc-550 block uppercase tracking-wide">Acceso Rápido Bot</span>
            <p className="text-[11px] text-zinc-400 leading-normal">Los técnicos utilizan la plataforma mediante comandos del canal de foro de Telegram vinculados al bot.</p>
          </div>
        </nav>

        {/* Sidebar Backdrop Overlay on Mobile */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
          />
        )}

        {/* Central Content Panel */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full transition-all duration-200">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
              <span className="text-sm font-semibold text-zinc-400">Estableciendo conexión y cargando datos...</span>
            </div>
          ) : (
            <div className="animate-in fade-in duration-300">
              
              {activeTab === 'dashboard' && (
                <DashboardOverview 
                  records={records}
                  jornadas={jornadas}
                  onNavigateToTab={setActiveTab}
                  onCreateNewRecord={() => handleNavigateTab('registros')}
                />
              )}

              {activeTab === 'jornadas' && (
                <JornadasManager 
                  jornadas={jornadas}
                  onSaveJornada={handleSaveJornada}
                  onDeleteJornada={handleDeleteJornada}
                  onRefresh={fetchData}
                />
              )}

              {activeTab === 'registros' && (
                <RecordsManager 
                  records={records}
                  templates={templates}
                  onSaveRecord={handleSaveRecord}
                  onDeleteRecord={handleDeleteRecord}
                />
              )}

              {activeTab === 'plantillas' && (
                <TemplateEditor 
                  templates={templates}
                  onSaveTemplate={handleSaveTemplate}
                />
              )}

              {activeTab === 'config' && (
                <ConfigSettings 
                  config={config}
                  status={status}
                  onSaveConfig={handleSaveConfig}
                  onRefreshStatus={fetchData}
                />
              )}

            </div>
          )}

        </main>
      </div>

    </div>
  );
}
