'use client';

import React, { useState, useRef, DragEvent, useEffect } from 'react';
import FigmaContextAwareConsultant, { FigmaIntentParameters } from '@/components/FigmaContextAwareConsultant';
import MindMapPreview from '@/components/MindMapPreview';
import ExecutionConsole from '@/components/ExecutionConsole';
import { 
  FileDown, RefreshCw, CheckCircle2, Zap, Flame, Stars, FileAudio, Subtitles, HelpCircle, Network, StopCircle, Loader2, Clock, BarChart3, Activity, Trash2, LayoutList, AlertTriangle, Download
} from 'lucide-react';

// Import Real Skills
import { LocalStreamProcessor } from '@/lib/skills/LocalStreamProcessor';
import { WebWorkerTranscriber } from '@/lib/skills/WebWorkerTranscriber';
import { DiagnosticsSkill, SystemStatus } from '@/lib/skills/DiagnosticsSkill';

interface TranscriptionChunk {
  index: number;
  text: string;
  timeRange: string;
}

export default function MeetingProDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'extracting' | 'transcribing' | 'done'>('idle');
  const [chunks, setChunks] = useState<TranscriptionChunk[]>([]);
  const [transcript, setTranscript] = useState<string>('');

  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // ETA & Progress States
  const [startTime, setStartTime] = useState<number | null>(null);
  const [transcriptionStartTime, setTranscriptionStartTime] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [completedChunksCount, setCompletedChunksCount] = useState(0);
  
  // Diagnostics & Debug Logging States
  const [workerLogs, setWorkerLogs] = useState<string[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  
  // Y2K/JoJo UI States
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mascotPos, setMascotPos] = useState({ x: 0, y: 0 });
  const [targetTilt, setTargetTilt] = useState(0);
  const [showJojo, setShowJojo] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("");
  const [hoverQuote, setHoverQuote] = useState("");
  
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Skill Instances
  const streamProcessor = useRef(new LocalStreamProcessor());
  const transcriber = useRef<WebWorkerTranscriber | null>(null);
  const diagnosticsSkill = useRef(new DiagnosticsSkill());

  const jojoUploadQuotes = [
     "又是開會？這種無馱無馱無馱的會議，交給我的替身！",
     "老總... 你的敗因只有一個，叫我聽這長達 3 小時的廢話。",
     "我不聽錄音檔啦！",
     "我一秒就看透。",
     "我只想要平靜的下班生活...",
     "「世界」啊！終結這段錄音！"
  ];

  const STEPS = [
    { id: 'extracting', label: '1. 提取音軌', icon: FileAudio },
    { id: 'transcribing', label: '2. 本地轉錄', icon: Subtitles },
    { id: 'done', label: '3. 完成下載', icon: CheckCircle2 },
  ];

  const addLog = (msg: string) => {
    setWorkerLogs(prev => [...prev, `${new Date().toLocaleTimeString()} ${msg}`].slice(-200));
  };

  const runDiagnostics = async () => {
    const res = await diagnosticsSkill.current.checkAISystem();
    setSystemStatus(res);
    addLog(`[Diagnostics] System Check: Local Model: ${res.localModel}`);
    addLog(`[Diagnostics] System Check: Cloud Model: ${res.cloudModel}`);
    // Diagnostics for API skipped in simplify mode
    addLog(`[Diagnostics] System Check: Memory: ${res.memoryUsage}`);
  };

  useEffect(() => {
    setMascotPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    
    // Initial System Check
    runDiagnostics();

    // Initialize transcriber
    transcriber.current = new WebWorkerTranscriber();
    transcriber.current.onLog((msg) => addLog(`[Worker] ${msg}`));
    transcriber.current.onError((err) => {
      addLog(`[Critical] Transcriber Error: ${err}`);
      setStatusText('神經網路超時或毀損！請嘗試「清理緩存」重新開始。');
    });

    transcriber.current.onResult((result) => {
      const { index, data } = result;
      setChunks(prev => {
        const updated = [...prev];
        updated[index] = {
          index,
          text: data.text,
          timeRange: `${index * 5}:00 - ${(index + 1) * 5}:00`
        };
        return updated;
      });

      // Update Transcription ETA
      setCompletedChunksCount(prev => {
        const newCount = prev + 1;
        if (transcriptionStartTime) {
          const totalDiscoveredChunks = chunks.length;
          const remaining = totalDiscoveredChunks - newCount;
          if (remaining > 0) {
            const elapsed = (Date.now() - transcriptionStartTime) / 1000;
            const avgTimePerChunk = elapsed / newCount;
            setEta(Math.round(avgTimePerChunk * remaining));
          } else {
            setEta(0);
          }
        }
        return newCount;
      });
    });

    // FFmpeg Logs Connection
    streamProcessor.current.onLog((msg) => addLog(`[FFmpeg] ${msg}`));

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 800;
      const y = (e.clientY / window.innerHeight - 0.5) * 800;
      setMousePos({ x, y });
      
      const dx = e.clientX - lastMousePosRef.current.x;
      setTargetTilt(Math.max(-50, Math.min(50, dx * 2)));

      setMascotPos({ x: e.clientX, y: e.clientY });
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      transcriber.current?.terminate();
    };
  }, [chunks.length, transcriptionStartTime]);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const targetFile = e.dataTransfer.files[0];
      setFile(targetFile);
      startRealProcessing(targetFile);
    }
  };

  const startRealProcessing = async (targetFile: File) => {
    setCurrentQuote(jojoUploadQuotes[Math.floor(Math.random() * jojoUploadQuotes.length)]);
    setShowJojo(true);
    setTimeout(() => setShowJojo(false), 3000);

    setStatus('extracting');
    setChunks([]);
    setTranscript('');
    setProgress(0);
    setEta(null);
    setCompletedChunksCount(0);
    setTranscriptionStartTime(null);
    addLog(`[System] Ignition! Processing ${targetFile.name}`);
    
    const startT = Date.now();
    setStartTime(startT);
    setStatusText('啟動 LocalStreamProcessor... FFmpeg 正在壓制 PCM...');

    try {
      await streamProcessor.current.processStream(
        targetFile,
        (pcmData, index) => {
          if (index === 0) setTranscriptionStartTime(Date.now());
          
          setStatus('transcribing');
          setStatusText(`本地 AI 發動！轉錄中：第 ${index + 1} 片段 (${(index*5)}-${(index+1)*5}min)`);
          
          setChunks(prev => {
            const updated = [...prev];
            updated[index] = { index, text: '', timeRange: `${index * 5}:00 - ${(index + 1) * 5}:00` };
            return updated;
          });
          
          transcriber.current?.processChunk(pcmData, index);
        },
        (p) => {
          setProgress(p);
          if (p < 100) {
             setStatusText(`FFmpeg 切片進度: ${p}%`);
             const elapsed = (Date.now() - startT) / 1000;
             if (p > 5) setEta(Math.round((elapsed / (p / 100)) - elapsed));
          } else {
             setStatusText('音訊提取完畢。本地 AI 正在進行逐字稿超速推理...');
             setEta(null);
          }
        }
      );

    } catch (err) {
      console.error(err);
      setStatusText('系統發生錯誤！請查看下方執觀察窗。');
      addLog(`[Critical] Process Failure: ${err}`);
      setStatus('idle');
    }
  };

  const finalizeTranscription = () => {
    const rawTable = chunks
      .filter(c => c.text)
      .map(c => `| ${c.timeRange} | [講者 A] | ${c.text.trim()} |`)
      .join('\n');
    
    const markdownOutput = `# 會議逐字稿 - ${file?.name}\n\n| 時間戳 | 講者 | 對話內容 |\n| --- | --- | --- |\n${rawTable}`;
    
    setTranscript(markdownOutput);
    setStatus('done');
    setStatusText('轉錄完結。您可以下載逐字稿了！');
    addLog('[System] Transcription complete. Output generated locally.');
  };

  const downloadTranscript = () => {
    const blob = new Blob([transcript], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Transcript_${file?.name || 'meeting'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addLog('[User] Transcript downloaded.');
  };

  const clearNeuralCache = async () => {
    if (confirm('確定要清理神經網路緩存嗎？這將會重新下載模型組件。')) {
      await transcriber.current?.clearCache();
      addLog('[Service] Neural Cache Purged.');
      alert('緩存已清除，請重新整理頁面以啟動全新引擎！');
    }
  };

  const formatETA = (seconds: number | null) => {
    if (seconds === null || seconds < 0) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const resetState = () => {
    setStatus('idle');
    setFile(null);
    setChunks([]);
    setProgress(0);
    setEta(null);
    setCompletedChunksCount(0);
    addLog('[System] Workspace reset.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      startRealProcessing(selectedFile);
    }
  };

  const downloadLogs = () => {
    const blob = new Blob([workerLogs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-ai-diag-${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMascotSpeech = () => {
    if (hoverQuote) return hoverQuote;
    if (status === 'idle') return "「預備... 本地波紋轉錄即將發動！」";
    if (status === 'extracting') return "「FFmpeg 正在切片！音質淨化中！」";
    if (status === 'transcribing') return "「歐拉歐拉！逐字稿碎片正在本地掉落！」";
    if (status === 'done') return "「轉錄全達成！趕快下載回去交差吧！💤」";
    return "「會議遠征進行中...」";
  };

  const TACTILE_BOX = "bg-[#0b101a]/85 backdrop-blur-3xl border border-cyan-500/20 shadow-[0_0_80px_rgba(34,211,238,0.1)] rounded-[3rem]";
  const CLAY_BUTTON = "rounded-full font-black tracking-widest uppercase transition-all duration-300 hover:scale-[1.1] active:scale-95 shadow-[0_0_30px_rgba(34,211,238,0.4)] border-2 border-slate-700 hover:border-cyan-400";

  return (
    <div className={`w-full min-h-screen bg-[#04060b] bg-[url('/bg-cosmic.png')] bg-cover bg-center bg-fixed text-slate-200 font-sans pt-12 pb-48 px-6 relative overflow-hidden`}>
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none opacity-40 mix-blend-color-dodge -z-10 transition-colors" style={{ backgroundColor: `hsl(${(mousePos.x + 400) / 10}, 70%, 50%)` }} />
      
      <header className="max-w-4xl mx-auto mb-10 text-center relative z-10 flex flex-col items-center">
        <div className="flex items-center gap-4 mb-4">
           {systemStatus && (
              <div key="status-badges" className="flex gap-4 animate-in fade-in slide-in-from-top-4 duration-1000">
                <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full border border-white/5 text-[10px] uppercase font-bold text-slate-400">
                  <div className={`w-2 h-2 rounded-full ${systemStatus.workerHealthy ? 'bg-lime-500 shadow-[0_0_10px_rgba(132,204,22,0.8)]' : 'bg-rose-500'}`} />
                  Neural {systemStatus.localModel} (Heap: {systemStatus.memoryUsage})
                </div>
                <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full border border-white/5 text-[10px] uppercase font-bold text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-cyan-700" />
                  Mode: Local-First (Privacy)
                </div>
              </div>
           )}
        </div>

        <h1 className="text-6xl md:text-8xl font-black lowercase tracking-tighter text-white flex flex-col md:flex-row items-center gap-6">
          <span className="bg-cyan-600 text-white p-6 rounded-[2.5rem] shadow-[0_10px_60px_rgba(6,182,212,0.6)] rotate-[-8deg]"><Zap className="h-16 w-12 fill-white" /></span>
          <span>meeting AI<br/><span className="text-3xl tracking-widest text-cyan-400">transcript</span></span>
        </h1>
      </header>

      <main className="max-w-4xl mx-auto relative z-10 flex flex-col gap-8">
        
        {status !== 'idle' && (
          <div className="w-full bg-black/60 backdrop-blur-md rounded-[2.5rem] border-2 border-white/10 p-6 flex justify-between items-center relative overflow-hidden">
             <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-cyan-400 via-emerald-500 to-cyan-400 transition-all duration-1000" style={{ width: `${(STEPS.findIndex(s => s.id === status) / (STEPS.length - 1)) * 100}%` }} />
             {STEPS.map((step, idx) => (
                <div key={step.id} className={`relative z-10 flex flex-col items-center gap-2`}>
                   <div className={`w-10 h-10 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center transition-all ${status === step.id ? 'bg-cyan-900 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)] scale-110' : 'bg-black border-white/10'}`}>
                      <step.icon className={`w-5 h-5 ${status === step.id ? 'text-white' : 'text-slate-600'}`} />
                   </div>
                   <span className="text-[9px] font-black uppercase text-slate-500">{step.label}</span>
                </div>
             ))}
          </div>
        )}

        {status !== 'idle' && (
          <div className="bg-black/95 text-lime-400 p-8 rounded-[2.5rem] shadow-inner border-2 border-white/5 text-center relative w-full overflow-hidden min-h-[140px] flex flex-col items-center justify-center gap-2">
            <span className="font-mono text-xl uppercase tracking-widest font-black z-10 animate-in fade-in" dangerouslySetInnerHTML={{ __html: `&gt; ${statusText}` }} />
            {eta !== null && eta > 0 && (
              <div className="flex items-center gap-4 bg-cyan-900/40 px-6 py-2 rounded-full border border-cyan-500/30 text-cyan-100 font-black tracking-widest animate-in fade-in slide-in-from-top-2 z-10">
                <Clock className="w-5 h-5 text-cyan-400" />
                <span>預計剩餘時間: <span className="text-2xl text-white underline decoration-cyan-500 decoration-4">{formatETA(eta)}</span></span>
              </div>
            )}
            {(status === 'extracting' || status === 'transcribing') && (
              <button 
                onClick={finalizeTranscription} 
                className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-full text-xs font-black flex items-center gap-2 shadow-xl z-20"
              >
                <CheckCircle2 className="w-4 h-4" /> 提前結束並導出現有內容
              </button>
            )}
          </div>
        )}

        {status === 'idle' && (
          <div className="flex flex-col gap-6">
            <div onClick={() => fileInputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`${TACTILE_BOX} p-20 md:p-32 border-4 text-center cursor-pointer transition-all ${isDragging ? 'scale-105 border-cyan-400' : 'border-cyan-500/30'} group`}>
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="video/*,audio/*" />
              <div className="w-48 h-48 mx-auto mb-12 bg-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)] group-hover:scale-110 transition-transform">
                 <Zap className="w-24 h-24 text-cyan-600 fill-cyan-600" />
              </div>
              <h3 className="text-4xl md:text-6xl font-black text-white mb-8">stand activation.</h3>
              <p className="text-slate-400 font-bold mb-12 tracking-widest uppercase">Pure Local Transcription (Privacy First).</p>
              <div className="inline-flex items-center gap-6 bg-white text-black px-12 py-6 rounded-full text-lg font-black hover:bg-emerald-400 transition-all"><Flame className="w-8 h-8" /> Start Transcription</div>
            </div>
            
            <div className="flex justify-center">
               <button onClick={clearNeuralCache} className="flex items-center gap-2 px-6 py-3 bg-rose-900/20 hover:bg-rose-900/40 border border-rose-500/30 text-rose-300 rounded-full text-[10px] uppercase font-black tracking-widest transition-all">
                  <Trash2 className="w-3 h-3" /> 重啟引擎 & 清理本地緩存
               </button>
            </div>
          </div>
        )}

        {(status === 'extracting' || status === 'transcribing') && (
          <div className="space-y-8 animate-in fade-in">
            <div className={`${TACTILE_BOX} overflow-hidden`}>
              <div className="bg-cyan-900/40 px-8 py-4 flex justify-between items-center">
                <h3 className="font-black text-cyan-200 uppercase tracking-widest flex items-center gap-3">
                  <BarChart3 className="w-5 h-5" /> 實時轉錄流 (Neural Stream)
                </h3>
                {status === 'transcribing' && <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />}
              </div>
              <table className="w-full text-left text-sm font-mono">
                <thead className="bg-black/60 text-slate-500 uppercase"><tr><th className="px-8 py-4"># 分段</th><th className="px-8 py-4">時間</th><th className="px-8 py-4">內容</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {chunks.length === 0 ? (
                    <tr><td colSpan={3} className="px-8 py-12 text-center text-slate-700 font-black animate-pulse uppercase tracking-[0.5em]">Waiting for first wave...</td></tr>
                  ) : (
                    chunks.map((c, i) => (
                      <tr key={i} className={`transition-colors duration-500 ${c.text ? 'bg-cyan-500/5' : ''}`}>
                        <td className="px-8 py-4 text-cyan-400 font-black">#0{c.index + 1}</td>
                        <td className="px-8 py-4 text-slate-500">{c.timeRange}</td>
                        <td className="px-8 py-4 text-white">
                          {c.text || <div className="flex items-center gap-2 text-cyan-400/60"><Loader2 className="w-3 h-3 animate-spin" /> 推論中...</div>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {status === 'done' && (
          <div className="w-full space-y-10 animate-in bounce-in duration-700">
            <div className={`${TACTILE_BOX} p-12 border-emerald-500/40 shadow-[0_0_100px_rgba(16,185,129,0.2)]`}>
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black text-emerald-400 uppercase flex items-center gap-3"><CheckCircle2/> 轉錄已完成</h2>
                <button 
                  onClick={downloadTranscript} 
                  className="bg-emerald-500 text-black px-10 py-5 rounded-full font-black flex items-center gap-3 hover:scale-110 active:scale-95 transition-all shadow-2xl"
                >
                  <Download className="w-6 h-6" /> 下載 Markdown 逐字稿
                </button>
              </div>
              <div className="bg-black/80 rounded-3xl p-8 border border-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                <pre className="whitespace-pre-wrap font-mono text-emerald-100 text-sm leading-relaxed">{transcript}</pre>
              </div>
            </div>
            
            <button onClick={resetState} className={`${CLAY_BUTTON} px-14 py-8 bg-black/80 text-white flex items-center gap-6 mx-auto mt-10`}><RefreshCw /> New Session</button>
          </div>
        )}
      </main>

      {/* Execution Console */}
      <ExecutionConsole 
        logs={workerLogs} 
        isProcessing={status !== 'idle' && status !== 'done'} 
        onDownloadLogs={downloadLogs} 
      />

      {/* Floating Mascot */}
      <div className="fixed top-0 left-0 pointer-events-none z-50 transition-all duration-700 ease-out flex flex-col items-center" style={{ transform: `translate(${mascotPos.x + 30}px, ${mascotPos.y - 20}px) rotate(${targetTilt}deg)` }}>
        <img src="/mascot.png" className="w-32 h-32 animate-bounce" />
        <div className="mt-4 bg-black/60 backdrop-blur-3xl px-6 py-4 rounded-full border border-cyan-500/40 text-[10px] font-black uppercase text-white shadow-2xl">{getMascotSpeech()}</div>
      </div>

      {showJojo && (<div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center bg-black/90"><div className="bg-white border-[10px] border-black p-20 shadow-[40px_40px_0_#06b6d4]"><h2 className="text-6xl font-black text-black uppercase">「{currentQuote}」</h2></div></div>)}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #06b6d4; border-radius: 10px; }
      `}} />
    </div>
  );
}
