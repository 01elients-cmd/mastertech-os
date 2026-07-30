'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, MessageSquare, X, Send, Sparkles, RefreshCw, Car, Wrench, ShieldCheck, ChevronRight } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  decodedVin?: {
    vin: string;
    make: string;
    model: string;
    year: string;
    displacementL?: string;
    engineCylinders?: string;
    driveType?: string;
    fuelType?: string;
  };
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: '👋 ¡Hola! Soy el **Asesor Técnico Avanzado de Taller MasterTech** impulsado por **Gemini Pro**.\n\nPuedes consultarme sobre diagnósticos mecánicos, fallas, reprogramaciones de ECU o ingresar un **código VIN de 17 dígitos** para decodificar las especificaciones oficiales de tu vehículo.'
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();

      if (res.ok && data.content) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: data.content,
          decodedVin: data.decodedVin
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${data.error || 'No se pudo obtener respuesta del servicio Gemini.'}`
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '❌ Error de conexión al comunicarse con el servidor.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome-1',
        role: 'assistant',
        content: '👋 Conversación reiniciada. ¿En qué puedo asesorarte hoy con tu vehículo?'
      }
    ]);
  };

  const suggestions = [
    '🔍 Decodificar VIN: 1HGCR2F83HA000000',
    '🔧 Ruido metálico al acelerar a 80km/h',
    '⚙️ Diagnóstico de código DTC P0300',
    '⏱️ Horarios y citas de mantenimiento'
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50 font-sans">
      {/* Botón Flotante para Abrir/Cerrar */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-3.5 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 border border-white/20 active:scale-95"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white animate-bounce-short" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <span className="font-semibold text-sm tracking-wide hidden sm:inline">
            Asesor IA Gemini Pro
          </span>
          <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-mono text-zinc-100 hidden md:inline">
            Taller MasterTech
          </span>
        </button>
      )}

      {/* Ventana Modal de Chat */}
      {isOpen && (
        <div className="w-[95vw] sm:w-[420px] h-[600px] max-h-[85vh] bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Header del Chat */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-zinc-100 tracking-tight">MasterTech IA Advisor</h3>
                  <span className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-400 text-[10px] px-1.5 py-0.2 rounded font-mono font-semibold">
                    Gemini Pro
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[11px] text-zinc-400">Decodificador VIN & Asesor Automotriz</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                title="Reiniciar conversación"
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mensajes del Chat */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-blue-400" />
                  </div>
                )}

                <div className={`max-w-[82%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-md rounded-br-none'
                    : 'bg-zinc-900/90 border border-zinc-800 text-zinc-200 shadow-sm rounded-bl-none'
                }`}>
                  
                  {/* Badge de VIN Decodificado si está disponible */}
                  {msg.decodedVin && (
                    <div className="mb-3 p-2.5 bg-zinc-950/80 border border-blue-500/30 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-blue-400 border-b border-zinc-800 pb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5" />
                          ESPECIFICACIONES DE VEHÍCULO
                        </span>
                        <span className="font-mono text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                          {msg.decodedVin.vin}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-zinc-300 font-mono">
                        <div><span className="text-zinc-500">Marca:</span> {msg.decodedVin.make}</div>
                        <div><span className="text-zinc-500">Modelo:</span> {msg.decodedVin.model}</div>
                        <div><span className="text-zinc-500">Año:</span> {msg.decodedVin.year}</div>
                        {msg.decodedVin.displacementL && <div><span className="text-zinc-500">Motor:</span> {msg.decodedVin.displacementL}L ({msg.decodedVin.engineCylinders || ''} Cyl)</div>}
                        {msg.decodedVin.driveType && <div><span className="text-zinc-500">Tracción:</span> {msg.decodedVin.driveType}</div>}
                        {msg.decodedVin.fuelType && <div><span className="text-zinc-500">Fuel:</span> {msg.decodedVin.fuelType}</div>}
                      </div>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap space-y-1">
                    {msg.content}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1 text-white font-bold text-xs">
                    TÚ
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-xs text-zinc-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                  <span>Gemini Pro consultando especificaciones automotrices...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chips Sugeridos */}
          {messages.length < 3 && (
            <div className="px-4 py-2 bg-zinc-900/40 border-t border-zinc-800/60 overflow-x-auto flex gap-2 no-scrollbar">
              {suggestions.map((sugg, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(sugg)}
                  className="text-[10px] bg-zinc-800/60 hover:bg-blue-600/20 hover:border-blue-500/40 text-zinc-300 border border-zinc-700/60 rounded-lg px-2.5 py-1 whitespace-nowrap transition-all flex items-center gap-1"
                >
                  <span>{sugg}</span>
                  <ChevronRight className="w-3 h-3 text-zinc-500" />
                </button>
              ))}
            </div>
          )}

          {/* Barra de Entrada */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-zinc-900/80 border-t border-zinc-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Pregunta sobre fallas o pega un VIN de 17 dígitos..."
              className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 outline-none transition-all"
            />

            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-all shadow-md flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
