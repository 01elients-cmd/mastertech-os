import React, { useState, useEffect } from 'react';
import { SopTemplate } from '@/lib/dashboard-db';
import TelegramPreview from './TelegramPreview';
import { SOPS } from '@/lib/templates/sops';
import { 
  Save, 
  RefreshCw, 
  Edit3, 
  HelpCircle,
  FileText,
  MessageSquare
} from 'lucide-react';

interface TemplateEditorProps {
  templates: SopTemplate[];
  onSaveTemplate: (template: SopTemplate) => Promise<void>;
}

export default function TemplateEditor({ 
  templates, 
  onSaveTemplate 
}: TemplateEditorProps) {
  const [selectedKey, setSelectedKey] = useState<string>('NUEVO_INGRESO');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);

  // Find currently selected template
  const currentTemplate = templates.find((t) => t.key === selectedKey);

  // Sync internal state when selected template changes
  useEffect(() => {
    if (currentTemplate) {
      setTitle(currentTemplate.title);
      setContent(currentTemplate.content);
      setCategory(currentTemplate.category);
      setSavedStatus(null);
    }
  }, [selectedKey, currentTemplate]);

  // Group templates by category
  const categoriesMap: Record<string, SopTemplate[]> = {
    recepcion: [],
    repuestos: [],
    operaciones: [],
    garantias: [],
    pendientes: [],
    incidencias: [],
    calidad: [],
    inspeccion: [],
    mejora: []
  };

  templates.forEach(t => {
    const cat = t.category || 'Otros';
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = [];
    }
    categoriesMap[cat].push(t);
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'recepcion': return 'Recepción';
      case 'repuestos': return 'Repuestos';
      case 'operaciones': return 'Operaciones';
      case 'garantias': return 'Garantías/Retrabajos';
      case 'pendientes': return 'Post-Venta/Seguimiento';
      case 'incidencias': return 'Incidencias';
      case 'calidad': return 'Calidad (QC)';
      case 'inspeccion': return 'Inspección Taller';
      case 'mejora': return 'Mejora Continua';
      default: return 'Otros';
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    setSavedStatus(null);
    try {
      const payload: SopTemplate = {
        key: selectedKey,
        title: title.trim(),
        content: content,
        category: category,
        updated_at: new Date().toISOString()
      };

      await onSaveTemplate(payload);
      setSavedStatus('success');
      setTimeout(() => setSavedStatus(null), 3000);
    } catch (err) {
      setSavedStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Reset to original file code
  const handleResetToDefault = () => {
    const originalText = SOPS[selectedKey as keyof typeof SOPS];
    if (originalText) {
      if (confirm('¿Resetear esta plantilla al diseño de fábrica original? Las modificaciones locales no guardadas se perderán.')) {
        setContent(originalText);
      }
    } else {
      alert('No hay plantilla por defecto para esta clave.');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      
      {/* Sidebar Selector Col-1 */}
      <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800/80 rounded-2xl p-4 shadow space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <h3 className="font-bold text-white text-sm border-b border-zinc-800 pb-2 flex items-center gap-1.5">
          <FileText size={15} />
          Catálogo del Taller
        </h3>

        <div className="space-y-4">
          {Object.entries(categoriesMap).map(([catName, list]) => {
            if (list.length === 0) return null;
            return (
              <div key={catName} className="space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest block pl-2 font-mono">
                  {getCategoryLabel(catName)}
                </span>
                
                <div className="space-y-1">
                  {list.map((tmpl) => (
                    <button
                      key={tmpl.key}
                      onClick={() => setSelectedKey(tmpl.key)}
                      className={`w-full text-left text-xs px-3 py-2 rounded-xl border flex items-center gap-2 font-medium transition ${
                        selectedKey === tmpl.key
                          ? 'bg-sky-505/20 text-sky-400 border-sky-500/30'
                          : 'bg-[#18181b] border-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span>📝</span>
                      <span className="truncate">{tmpl.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Editor Center Pane Col-2 (spans 2 inline cols) */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Editor Form Card */}
        <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl shadow space-y-5">
          
          {/* Editor Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-md">Editor de Mensajes SOP</h3>
              <p className="text-zinc-500 text-xs">Modificación instantánea del contenido enviado por el bot en Telegram</p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-[#18181b] border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded uppercase">
              Llave: {selectedKey}
            </span>
          </div>

          <div className="space-y-4">
            
            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 block">Título de Plantilla</label>
              <input 
                type="text" 
                value={title} 
                required
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nombre descriptivo..."
                className="w-full bg-[#18181b] border border-zinc-850 hover:border-zinc-800 focus:border-zinc-700 text-white rounded-xl px-3 py-2 text-sm focus:outline-none transition font-semibold"
              />
            </div>

            {/* Editor Textarea */}
            <div className="space-y-1">
              <div className="flex justify-between items-center pb-1">
                <label className="text-xs font-semibold text-zinc-400 flex items-center gap-1">
                  Cuerpo Formulado
                  <span className="group relative text-zinc-500 hover:text-zinc-350 cursor-pointer" title="Variables">
                    <HelpCircle size={13} />
                    <span className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 bg-zinc-950 text-white border border-zinc-800 text-[10px] p-2.5 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition duration-150 z-20 font-sans shadow-xl normal-case">
                      Usa corchetes <code className="text-amber-300 font-bold">[Texto]</code> para marcar campos variables que los técnicos rellenarán.
                    </span>
                  </span>
                </label>
                
                {/* Reset button */}
                <button 
                  onClick={handleResetToDefault}
                  className="flex items-center gap-1 text-[10px] text-sky-400 hover:text-sky-300 font-semibold transition"
                  title="Restablecer al formato original"
                >
                  <RefreshCw size={11} />
                  Restaurar Original
                </button>
              </div>
              
              <textarea 
                value={content} 
                required
                onChange={(e) => setContent(e.target.value)}
                placeholder="Introducir el texto..."
                className="w-full h-80 bg-[#18181b] border border-zinc-850 hover:border-zinc-805 focus:border-zinc-705 text-[#e7ebf0] rounded-xl px-4 py-3.5 text-xs focus:outline-none transition font-mono leading-relaxed resize-y scrollbar-thin"
              />
            </div>

            {/* Info Hint */}
            <div className="text-zinc-500 text-[11px] bg-zinc-950 p-3 rounded-xl border border-zinc-900 flex items-start gap-2 select-none">
              <span className="text-sky-400 mt-0.5">ℹ️</span>
              <p>
                Al guardar, los cambios se almacenarán de inmediato en tu base de datos.
                Si el bot está en funcionamiento, cargará este nuevo cuerpo de forma automática en la próxima solicitud.
              </p>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
              
              {/* Saved alerts toasts */}
              <div>
                {savedStatus === 'success' && (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 animate-fade-in border border-emerald-500/10 bg-emerald-500/5 px-2.5 py-1 rounded-lg">
                    ✓ Plantilla guardada con éxito
                  </span>
                )}
                {savedStatus === 'error' && (
                  <span className="text-xs font-semibold text-rose-400 flex items-center gap-1 animate-fade-in border border-rose-500/10 bg-rose-500/5 px-2.5 py-1 rounded-lg">
                    ❌ Fallo al guardar en la base de datos
                  </span>
                )}
              </div>

              <button 
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 disabled:bg-zinc-850 disabled:text-zinc-500 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-sky-950/20 active:scale-[0.98] transition"
              >
                <Save size={14} />
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>

            </div>

          </div>

        </div>

      </div>

      {/* Preview Section Col-3 */}
      <div className="lg:col-span-1 space-y-4">
        <h4 className="font-bold text-white text-xs uppercase tracking-wider pl-1 flex items-center gap-1">
          <MessageSquare size={14} className="text-sky-400" />
          Vista Previa Telegram
        </h4>
        <TelegramPreview 
          title={title} 
          content={content} 
          category={category} 
        />
      </div>

    </div>
  );
}
