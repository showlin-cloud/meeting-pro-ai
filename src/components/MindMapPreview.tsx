'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Download, Maximize2, AlertCircle } from 'lucide-react';

interface MindMapPreviewProps {
  code: string;
}

export default function MindMapPreview({ code }: MindMapPreviewProps) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [hasError, setHasError] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark', // changed to dark for Y2K theme
      securityLevel: 'loose',
    });

    const renderMermaid = async () => {
      try {
        setHasError(false);
        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvgContent(svg);
      } catch (error) {
        console.error('Mermaid rendering error:', error);
        setHasError(true);
      }
    };

    if (code) {
      renderMermaid();
    }
  }, [code]);

  const handleDownload = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mindmap.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      } else {
        containerRef.current.requestFullscreen().catch(err => console.log(err));
      }
    }
  };

  if (hasError) {
    return (
      <div className="flex flex-col gap-4 rounded-3xl border-2 border-rose-500/50 bg-rose-950/40 p-6 shadow-[inset_0_4px_30px_rgba(244,63,94,0.1)]">
        <div className="flex items-center gap-3 text-rose-400">
          <AlertCircle className="h-6 w-6" />
          <h3 className="font-black text-lg lowercase tracking-widest">心智圖術法陣建構失敗</h3>
        </div>
        <p className="text-sm text-rose-300 font-mono leading-relaxed">我們可能尚未支援此特定的 Mermaid 語法格式，或該語法包含些許錯誤。以下是原始語法內容：</p>
        <pre className="mt-2 overflow-auto rounded-xl bg-black/60 p-4 text-sm text-rose-200 shadow-inner max-h-48 border-2 border-rose-900/50 custom-scrollbar">
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`group relative flex flex-col rounded-[2.5rem] border-2 border-white/10 bg-black/40 p-2 shadow-inner transition-all ${document.fullscreenElement ? 'h-screen w-screen rounded-none border-none bg-[#0b101a]' : 'hover:border-fuchsia-500/30'}`}
    >
      <div className="absolute right-6 top-6 z-10 flex gap-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <button
          onClick={handleDownload}
          className="flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-xs font-black text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)] border-2 border-cyan-500/30 hover:bg-cyan-950 hover:text-white hover:border-cyan-400 hover:scale-105 transition-all uppercase tracking-wider"
          title="下載 SVG 圖片"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">下載陣法</span>
        </button>
        <button
          onClick={handleFullscreen}
          className="flex items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-xs font-black text-fuchsia-300 shadow-[0_0_15px_rgba(217,70,239,0.2)] border-2 border-fuchsia-500/30 hover:bg-fuchsia-950 hover:text-white hover:border-fuchsia-400 hover:scale-105 transition-all uppercase tracking-wider"
          title="全螢幕查看"
        >
          <Maximize2 className="h-4 w-4" />
          <span className="hidden sm:inline">完全展現</span>
        </button>
      </div>
      
      <div className={`flex w-full items-center justify-center overflow-auto rounded-[2rem] bg-[#0b101a]/80 p-6 backdrop-blur-sm ${document.fullscreenElement ? 'h-full' : 'min-h-[400px]'}`}>
        {svgContent ? (
          <div 
            className="w-full h-full flex justify-center items-center [&>svg]:max-w-full [&>svg]:h-auto drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
            dangerouslySetInnerHTML={{ __html: svgContent }} 
          />
        ) : (
          <div className="flex animate-pulse items-center gap-3 text-fuchsia-400/50">
            <span className="h-5 w-5 rounded-full bg-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.8)] animate-ping"></span>
            <span className="text-lg font-black tracking-widest uppercase">繪製心智圖中...</span>
          </div>
        )}
      </div>
    </div>
  );
}
