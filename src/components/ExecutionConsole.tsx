'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, ChevronDown, ChevronUp, FileDown, AlertTriangle, Activity } from 'lucide-react';

/**
 * Component: ExecutionConsole (實時日誌觀測窗)
 * 
 * 1. 顯示底層引擎 (FFmpeg, Whisper, Claude) 的實時日誌。
 * 2. 具備「偵測停滯」功能：若正在處理中且超過 30 秒無新日誌，顯示警告。
 * 3. Y2K / JoJo 視覺風格。
 */

interface ExecutionConsoleProps {
  logs: string[];
  isProcessing: boolean;
  onDownloadLogs: () => void;
}

export default function ExecutionConsole({ logs, isProcessing, onDownloadLogs }: ExecutionConsoleProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isStalled, setIsStalled] = useState(false);
  const lastLogTimeRef = useRef<number>(Date.now());
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // 偵測進度停滯 (30秒無日誌)
  useEffect(() => {
    lastLogTimeRef.current = Date.now();
    setIsStalled(false);
  }, [logs.length]);

  useEffect(() => {
    if (!isProcessing) {
      setIsStalled(false);
      return;
    }

    const checkInterval = setInterval(() => {
      const idleTime = Date.now() - lastLogTimeRef.current;
      if (idleTime > 30000) {
        setIsStalled(true);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [isProcessing]);

  // 自動轉到底部
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs.length, isOpen]);

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[100] transition-all duration-500 ${isOpen ? 'h-64' : 'h-12'} bg-black/90 backdrop-blur-3xl border-t-2 ${isStalled ? 'border-rose-500 shadow-[0_-10px_50px_rgba(244,63,94,0.3)]' : 'border-fuchsia-500/30'} flex flex-col shadow-[0_-20px_100px_rgba(217,70,239,0.2)]`}>
      {/* Header Container */}
      <div 
        className={`flex items-center justify-between px-6 py-2 cursor-pointer transition-colors ${isStalled ? 'bg-rose-900/40' : 'bg-fuchsia-900/20'} border-b border-white/5`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3 font-black text-xs uppercase tracking-[0.4em]">
          {isStalled ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
          ) : (
            <Terminal className="w-4 h-4 text-fuchsia-400" />
          )}
          
          <span className={isStalled ? 'text-rose-400' : 'text-fuchsia-400'}>
            {isStalled ? 'Execution Stalled Warning' : 'Neural Diagnostics Console'}
          </span>

          {logs.length > 0 && (
            <span className="text-white ml-2 bg-fuchsia-600 px-2 rounded-full text-[10px] animate-in zoom-in">
              {logs.length}
            </span>
          )}

          {isProcessing && !isStalled && (
            <Activity className="w-3 h-3 text-lime-400 animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-6">
          {isStalled && (
            <span className="text-rose-200 text-[10px] font-bold animate-bounce hidden md:inline">
              [ 偵測到進度停滯，請檢查瀏覽器記憶體 ]
            </span>
          )}
          
          <div className="flex items-center gap-4">
            {logs.length > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDownloadLogs(); }}
                className="text-white hover:text-fuchsia-400 transition-colors p-1"
                title="Download Session Logs"
              >
                <FileDown className="w-4 h-4" />
              </button>
            )}
            {isOpen ? <ChevronDown className="w-5 h-5 text-white" /> : <ChevronUp className="w-5 h-5 text-white" />}
          </div>
        </div>
      </div>

      {/* Log Body */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] md:text-sm text-lime-400 space-y-1 selection:bg-lime-400 selection:text-black scroll-smooth custom-scrollbar">
        {logs.length === 0 ? (
          <div className="text-slate-600 italic py-4">No neural telemetry detected. Waiting for ignition...</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-4 border-l-2 border-lime-400/20 pl-4 hover:bg-white/5 transition-colors group">
              <span className="opacity-40 shrink-0 group-hover:opacity-100 transition-opacity">
                {log.split(' ')[0]}
              </span>
              <span className="whitespace-pre-wrap break-all">
                {log.split(' ').slice(1).join(' ')}
              </span>
            </div>
          ))
        )}
        <div ref={consoleEndRef} />
      </div>

      {/* Retro Style Scanline */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%]" />
    </div>
  );
}
