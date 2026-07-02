import React from 'react';

interface TelegramPreviewProps {
  title: string;
  content: string;
  category?: string;
}

export default function TelegramPreview({ title, content, category }: TelegramPreviewProps) {
  // Simple custom parser for previewing the SOP content
  const formatSopContent = (txt: string) => {
    if (!txt) return '';
    
    // Escape HTML special characters
    let formatted = txt
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Highlight bracketed placeholders like [Marca, Modelo] or [Número]
    formatted = formatted.replace(
      /(\[[^\]\n]+\])/g,
      '<span class="bg-amber-500/20 text-amber-200 border border-amber-500/30 px-1 rounded font-semibold">$1</span>'
    );

    // Bold formatting (e.g., *text* or **text**)
    formatted = formatted.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );
    formatted = formatted.replace(
      /\*(.*?)\*/g,
      '<strong>$1</strong>'
    );

    // Highlight Hashtags
    formatted = formatted.replace(
      /(#[a-zA-Z0-9_]+)/g,
      '<span class="text-sky-400 font-medium font-mono">$1</span>'
    );

    // Emojis highlighters or bullet points formatting
    formatted = formatted.replace(
      /^[•-]\s*(.*)$/gm,
      '<li class="ml-4 list-disc text-zinc-300">$1</li>'
    );

    // Fix lists wrap
    if (formatted.includes('</li>')) {
      // Just a simple split double breaks newlines for normal text
    }

    return formatted;
  };

  const getThreadColor = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'recepcion': return 'border-emerald-500 bg-emerald-500/10 text-emerald-400';
      case 'repuestos': return 'border-blue-500 bg-blue-500/10 text-blue-400';
      case 'operaciones': return 'border-violet-500 bg-violet-500/10 text-violet-400';
      case 'garantias': return 'border-rose-500 bg-rose-500/10 text-rose-400';
      case 'pendientes': return 'border-amber-500 bg-amber-500/10 text-amber-400';
      case 'incidencias': return 'border-red-500 bg-red-500/10 text-red-500';
      case 'calidad': return 'border-teal-500 bg-teal-500/10 text-teal-400';
      case 'inspeccion': return 'border-indigo-500 bg-indigo-500/10 text-indigo-400';
      case 'mejora': return 'border-cyan-500 bg-cyan-500/10 text-cyan-400';
      default: return 'border-zinc-500 bg-zinc-500/10 text-zinc-400';
    }
  };

  const timeString = new Date().toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <div className="w-full max-w-md mx-auto bg-[#182533] text-[#e7ebf0] rounded-2xl overflow-hidden shadow-2xl border border-zinc-700/50 font-sans">
      {/* Telegram Chat Header */}
      <div className="bg-[#202b36] px-4 py-3 flex items-center gap-3 border-b border-zinc-900/40">
        <div className="w-9 h-9 rounded-full bg-sky-500 flex items-center justify-center font-bold text-white text-sm shadow">
          MT
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm">MasterTech OS Forum</span>
            {category && (
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${getThreadColor(category)} font-bold`}>
                Hilo: {category}
              </span>
            )}
          </div>
          <span className="text-zinc-400 text-xs">bot de taller activo</span>
        </div>
        <div className="flex gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
        </div>
      </div>

      {/* Telegram Chat Window */}
      <div 
        className="p-4 min-h-[250px] bg-cover bg-center flex flex-col justify-end"
        style={{
          backgroundColor: '#0e1621',
          backgroundImage: 'radial-gradient(circle, rgba(14,22,33,0.95) 0%, rgba(23,33,43,0.98) 100%)'
        }}
      >
        {/* Date bubble */}
        <div className="self-center bg-[#111923]/60 backdrop-blur-sm text-[#7da4cf] text-xs font-semibold px-3 py-1 rounded-full mb-4">
          Hoy
        </div>

        {/* Bot Message Bubble */}
        <div className="flex items-end gap-2 max-w-[85%] self-start">
          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-sky-400 border border-sky-500/30">
            🤖
          </div>
          <div className="bg-[#182533] rounded-2xl rounded-bl-none p-3 shadow-lg relative border border-zinc-700/20">
            <div className="text-sky-400 font-semibold text-xs mb-1 flex items-center gap-1">
              MasterTech Bot
              <span className="bg-sky-500/10 text-sky-400 text-[9px] px-1.5 py-0.2 rounded border border-sky-400/20 uppercase tracking-wider font-bold">BOT</span>
            </div>
            
            {title && (
              <div className="text-emerald-400 text-xs font-semibold font-mono border-l-2 border-emerald-500 pl-2 py-0.5 mb-2 bg-[#202b36]/60 rounded-r">
                Plantilla: {title}
              </div>
            )}

            <div 
              className="text-[#e7ebf0] text-sm whitespace-pre-wrap leading-relaxed font-sans"
              dangerouslySetInnerHTML={{ __html: formatSopContent(content) }}
            />
            
            {/* Timestamp and Sent status inside the bubble */}
            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-zinc-400 select-none">
              <span>{timeString}</span>
              <span className="text-sky-400 font-bold">✓✓</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Input panel block for Telegram realism */}
      <div className="bg-[#17212b] px-4 py-2.5 flex items-center gap-3 border-t border-zinc-900/40">
        <span className="text-zinc-500 text-lg">📎</span>
        <div className="flex-1 bg-[#24303f] rounded-xl px-3 py-1.5 text-zinc-400 text-xs">
          Completar formulario...
        </div>
        <span className="text-sky-400 text-lg">🎙️</span>
      </div>
    </div>
  );
}
