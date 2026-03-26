'use client';

import React, { useState, useRef, DragEvent, useEffect } from 'react';
import FigmaContextAwareConsultant, { FigmaIntentParameters } from '@/components/FigmaContextAwareConsultant';
import MindMapPreview from '@/components/MindMapPreview';
import { 
  FileDown, RefreshCw, CheckCircle2, AudioWaveform, Zap, Flame, Stars, FileAudio, Subtitles, HelpCircle, Network, StopCircle, Loader2, Clock, BarChart3, Terminal, ChevronDown, ChevronUp
} from 'lucide-react';

// Import Real Skills
import { LocalStreamProcessor } from '@/lib/skills/LocalStreamProcessor';
import { WebWorkerTranscriber } from '@/lib/skills/WebWorkerTranscriber';
import { DynamicClaudeSummarizer } from '@/lib/skills/DynamicClaudeSummarizer';

interface TranscriptionChunk {
  index: number;
  text: string;
  timeRange: string;
}

export default function MeetingProDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'extracting' | 'transcribing' | 'consulting' | 'summarizing' | 'done'>('idle');
  const [chunks, setChunks] = useState<TranscriptionChunk[]>([]);
  const [transcript, setTranscript] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [mindmapCode, setMindmapCode] = useState<string>('');

  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  
  // ETA & Progress States
  const [startTime, setStartTime] = useState<number | null>(null);
  const [transcriptionStartTime, setTranscriptionStartTime] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [completedChunksCount, setCompletedChunksCount] = useState(0);
  
  // Debug Logging States
  const [workerLogs, setWorkerLogs] = useState<string[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(true);
  
  // Y2K/JoJo UI States
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mascotPos, setMascotPos] = useState({ x: 0, y: 0 });
  const [targetTilt, setTargetTilt] = useState(0);
  const [showJojo, setShowJojo] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("");
  const [hoverQuote, setHoverQuote] = useState("");
  
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Skill Instances
  const streamProcessor = useRef(new LocalStreamProcessor());
  const transcriber = useRef<WebWorkerTranscriber | null>(null);

  const jojoUploadQuotes = [
     "又是開會？這種無馱無馱無馱的會議，交給我的替身！",
     "老總... 你的敗因只有一個，叫我聽這長達 3 小時的廢話。",
     "我不聽錄音檔啦！",
     "我一秒就看透。",
     "我只想要平靜的下班生活...",
     "「世界」啊！終結這段錄音！"
  ];

  const STEPS = [
    { id: 'extracting', label: '1. 音訊提取', icon: FileAudio },
    { id: 'transcribing', label: '2. 神經轉錄', icon: Subtitles },
    { id: 'consulting', label: '3. 意圖諮詢', icon: HelpCircle },
    { id: 'summarizing', label: '4. 智能摘要', icon: Network },
  ];

  useEffect(() => {
    setMascotPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    
    // Initialize transcriber
    transcriber.current = new WebWorkerTranscriber();
    
    transcriber.current.onLog((msg) => {
      setWorkerLogs(prev => [...prev, `${new Date().toLocaleTimeString()} ${msg}`].slice(-100));
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

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [workerLogs]);

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
    setWorkerLogs([`${new Date().toLocaleTimeString()} [System] 初始化引擎...`]);
    const startT = Date.now();
    setStartTime(startT);
    setStatusText('啟動 LocalStreamProcessor... FFmpeg 正在壓制 PCM...');

    try {
      await streamProcessor.current.processStream(
        targetFile,
        (pcmData, index) => {
          if (index === 0) setTranscriptionStartTime(Date.now());
          
          setStatus('transcribing');
          setStatusText(`神經網絡發動！轉錄中：第 ${index + 1} 片段 (${(index*5)}-${(index+1)*5}min)`);
          
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
             setStatusText('音訊提取完畢。AI 正在進行逐字稿超速推理...');
          }
        }
      );

    } catch (err) {
      console.error(err);
      setStatusText('系統發生錯誤！請查看下方神經調試日誌。');
      setWorkerLogs(prev => [...prev, `${new Date().toLocaleTimeString()} [Critical] ${err}`]);
    }
  };

  const finalizeTranscription = () => {
    const fullText = chunks.filter(c => c.text).map(c => `[Slice ${c.index + 1}] ${c.text}`).join('\n\n');
    setTranscript(fullText || "轉錄結果為空");
    setStatus('consulting');
    setStatusText('轉錄完結。強制暫停：請檢閱文稿並設定意圖。');
    setEta(null);
  };

  const handleAbortAndSummarize = () => {
    streamProcessor.current.abort();
    finalizeTranscription();
  };

  const handleConsultComplete = async (intent: FigmaIntentParameters) => {
    setStatus('summarizing');
    setStatusText('啟動 DynamicClaudeSummarizer... 分析 80/20 結構中...');
    
    try {
      const summarizer = new DynamicClaudeSummarizer();
      const result = await summarizer.summarize(transcript);
      setSummary(result.structuredNotes);
      setMindmapCode(result.mindMapSyntax);
      setStatus('done');
      setStatusText('分析完成。');
    } catch (err) {
      console.error(err);
      setStatusText('摘要生成失敗。');
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
    setWorkerLogs([]);
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
    if (status === 'idle') return "「這種波紋... 是開會的前兆嗎？！」 🌍";
    if (status === 'extracting') return "「FFmpeg 正在切片！音質淨化中！」";
    if (status === 'transcribing') return "「歐拉歐拉！逐字稿碎片正即時掉落！」";
    if (status === 'consulting') return "「強制停止！確認完畢才能產出最終奧義！」 🛑";
    if (status === 'summarizing') return "「貧弱貧弱！Claude 正在把垃圾會議變黃金！」 💥";
    return "「會議遠征終於劃下句號。💤」";
  };

  const TACTILE_BOX = "bg-[#0b101a]/85 backdrop-blur-3xl border border-fuchsia-500/20 shadow-[0_0_80px_rgba(255,0,255,0.1)] rounded-[3rem]";
  const CLAY_BUTTON = "rounded-full font-black tracking-widest uppercase transition-all duration-300 hover:scale-[1.1] active:scale-95 shadow-[0_0_30px_rgba(217,70,239,0.4)] border-2 border-slate-700 hover:border-fuchsia-400";

  return (
    <div className={`w-full min-h-screen bg-[#04060b] bg-[url('/bg-cosmic.png')] bg-cover bg-center bg-fixed text-slate-200 font-sans pt-12 pb-48 px-6 relative overflow-hidden`}>
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none opacity-40 mix-blend-color-dodge -z-10 transition-colors" style={{ backgroundColor: `hsl(${(mousePos.x + 400) / 5}, 70%, 50%)` }} />
      
      <header className="max-w-4xl mx-auto mb-10 text-center relative z-10 flex flex-col items-center">
        <h1 className="text-6xl md:text-8xl font-black lowercase tracking-tighter text-white flex flex-col md:flex-row items-center gap-6">
          <span className="bg-fuchsia-600 text-white p-6 rounded-[2.5rem] shadow-[0_10px_60px_rgba(217,70,239,0.6)] rotate-[-8deg]"><Zap className="h-16 w-12 fill-white" /></span>
          <span>meeting AI<br/><span className="text-3xl tracking-widest text-fuchsia-400">overdrive</span></span>
        </h1>
        <p className="text-cyan-300 font-black tracking-[0.4em] text-sm md:text-xl uppercase mt-8 bg-black/60 px-12 py-4 rounded-full border-4 border-cyan-400/50 shadow-2xl backdrop-blur-xl animate-pulse">
          progressive neural flow ⚡ wasm + whisper
        </p>
      </header>

      <main className="max-w-4xl mx-auto relative z-10 flex flex-col gap-8">
        {status !== 'idle' && (
          <div className="w-full bg-black/60 backdrop-blur-md rounded-[2.5rem] border-2 border-white/10 p-6 flex justify-between items-center relative overflow-hidden">
             <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-cyan-400 to-lime-400" style={{ width: `${Math.max(0, STEPS.findIndex(s => s.id === status)) * 33.33}%` }} />
             {STEPS.map((step, idx) => (
                <div key={step.id} className={`relative z-10 flex flex-col items-center gap-2`}>
                   <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full border-2 flex items-center justify-center ${status === step.id ? 'bg-fuchsia-900 border-fuchsia-400 animate-pulse' : 'bg-black border-white/10'}`}>
                      <step.icon className={`w-6 h-6 ${status === step.id ? 'text-white' : 'text-slate-600'}`} />
                   </div>
                   <span className="text-[10px] font-black uppercase text-slate-500">{step.label}</span>
                </div>
             ))}
          </div>
        )}

        {status !== 'idle' && (
          <div className="bg-black/95 text-lime-400 p-8 rounded-[2.5rem] shadow-inner border-2 border-white/5 text-center relative w-full overflow-hidden min-h-[140px] flex flex-col items-center justify-center gap-2">
            <span className="font-mono text-xl uppercase tracking-widest font-black z-10">&gt; {statusText}</span>
            {eta !== null && eta > 0 && (
              <div className="flex items-center gap-4 bg-fuchsia-900/40 px-6 py-2 rounded-full border border-fuchsia-500/30 text-fuchsia-100 font-black tracking-widest animate-in fade-in slide-in-from-top-2 z-10">
                <Clock className="w-5 h-5 text-fuchsia-400" />
                <span>預計剩餘時間: <span className="text-2xl text-white underline decoration-fuchsia-500 decoration-4">{formatETA(eta)}</span></span>
              </div>
            )}
            {(status === 'extracting' || status === 'transcribing') && (
              <button onClick={handleAbortAndSummarize} className="mt-4 bg-rose-600 hover:bg-rose-500 text-white px-8 py-3 rounded-full text-xs font-black flex items-center gap-2 shadow-xl z-20"><StopCircle className="w-4 h-4" /> 提早結束並摘要</button>
            )}
          </div>
        )}

        {status === 'idle' && (
          <div onClick={() => fileInputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} className={`${TACTILE_BOX} p-20 md:p-32 border-4 text-center cursor-pointer transition-all ${isDragging ? 'scale-105 border-fuchsia-400' : 'border-fuchsia-500/30'}`}>
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="video/*,audio/*" />
            <div className="w-48 h-48 mx-auto mb-12 animate-bounce bg-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)]">
               <Zap className="w-24 h-24 text-fuchsia-600 fill-fuchsia-600" />
            </div>
            <h3 className="text-4xl md:text-6xl font-black text-white mb-8">stand activation.</h3>
            <p className="text-slate-400 font-bold mb-12 tracking-widest">WASM-based local processing (up to 20GB). Pure Privacy.</p>
            <div className="inline-flex items-center gap-6 bg-white text-black px-12 py-6 rounded-full text-lg font-black hover:bg-lime-400 transition-all"><Flame className="w-8 h-8" /> Start Analysis</div>
          </div>
        )}

        {(status === 'extracting' || status === 'transcribing') && (
          <div className="space-y-8 animate-in fade-in">
            {status === 'extracting' ? (
              <div className={`${TACTILE_BOX} p-10 flex flex-col gap-6`}>
                <div className="flex justify-between items-center px-4">
                   <div className="flex flex-col">
                     <span className="text-amber-400 font-black uppercase text-xs tracking-[0.3em]">Power level in extraction</span>
                     <span className="text-white font-black text-4xl">FFmpeg {progress}%</span>
                   </div>
                   {eta !== null && (
                      <div className="text-right flex flex-col">
                        <span className="text-slate-500 text-[10px] uppercase font-black tracking-widest">Time to slice end</span>
                        <span className="text-fuchsia-400 font-mono text-3xl font-black tracking-tighter">-{formatETA(eta)}</span>
                      </div>
                   )}
                </div>
                <div className="h-6 w-full bg-black/50 rounded-full overflow-hidden border-2 border-white/5"><div className="h-full bg-gradient-to-r from-amber-500 via-rose-500 to-fuchsia-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]" style={{ width: `${progress}%` }} /></div>
              </div>
            ) : (
              <div className={`${TACTILE_BOX} p-10 flex flex-col gap-6 border-cyan-500/30`}>
                 <div className="flex justify-between items-center px-4">
                   <div className="flex flex-col">
                     <span className="text-cyan-400 font-black uppercase text-xs tracking-[0.3em]">Neural transcription status</span>
                     <span className="text-white font-black text-4xl">{completedChunksCount} / {chunks.length} Chunks</span>
                   </div>
                   {eta !== null && eta > 0 && (
                      <div className="text-right flex flex-col">
                        <span className="text-slate-500 text-[10px] uppercase font-black tracking-widest">Total ETA remaining</span>
                        <span className="text-fuchsia-400 font-mono text-3xl font-black tracking-tighter">-{formatETA(eta)}</span>
                      </div>
                   )}
                </div>
                {/* Visual Progress Grid */}
                <div className="flex flex-wrap gap-2 px-4">
                  {chunks.map((c, i) => (
                    <div key={i} className={`w-4 h-4 rounded-sm border ${c.text ? 'bg-cyan-400 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-black border-white/10 animate-pulse'}`} />
                  ))}
                </div>
              </div>
            )}

            <div className={`${TACTILE_BOX} overflow-hidden`}>
              <div className="bg-cyan-900/40 px-8 py-4 flex justify-between items-center">
                <h3 className="font-black text-cyan-200 uppercase tracking-widest flex items-center gap-3">
                  <BarChart3 className="w-5 h-5" /> 漸進式轉錄流 (Streaming AI)
                </h3>
                <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              </div>
              <table className="w-full text-left text-sm font-mono">
                <thead className="bg-black/60 text-slate-500 uppercase"><tr><th className="px-8 py-4"># Slice</th><th className="px-8 py-4">Range</th><th className="px-8 py-4">Text</th></tr></thead>
                <tbody className="divide-y divide-white/5">
                  {chunks.length === 0 ? (
                    <tr><td colSpan={3} className="px-8 py-12 text-center text-slate-700 font-black animate-pulse uppercase tracking-[0.5em]">Waiting for first wave...</td></tr>
                  ) : (
                    chunks.map((c, i) => (
                      <tr key={i} className={`transition-colors duration-500 ${c.text ? 'bg-cyan-500/5' : ''}`}>
                        <td className="px-8 py-4 text-cyan-400 font-black">#0{c.index + 1}</td>
                        <td className="px-8 py-4 text-slate-500">{c.timeRange}</td>
                        <td className="px-8 py-4 text-white">
                          {c.text || <div className="flex items-center gap-2 text-cyan-400/60"><Loader2 className="w-3 h-3 animate-spin" /> 模型推論中...</div>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {status === 'consulting' && (
          <div className="w-full flex flex-col gap-10 animate-in slide-in-from-bottom-5">
            <div className={`${TACTILE_BOX} p-12 overflow-hidden`}>
               <h2 className="text-2xl font-black text-cyan-400 mb-6 uppercase">Final Transcript Confirmation</h2>
               <pre className="whitespace-pre-wrap font-mono text-cyan-50 p-8 bg-black/80 rounded-2xl border border-white/5 max-h-96 overflow-y-auto custom-scrollbar">{transcript}</pre>
            </div>
            <FigmaContextAwareConsultant onComplete={handleConsultComplete} />
          </div>
        )}

        {status === 'summarizing' && (
          <div className={`${TACTILE_BOX} p-24 text-center animate-pulse border-fuchsia-500/50`}>
             <Loader2 className="w-24 h-24 text-fuchsia-500 mx-auto mb-8 animate-spin" />
             <h3 className="text-3xl font-black text-white">Claude 3.5 Sonnet Brainstorming...</h3>
          </div>
        )}

        {status === 'done' && (
          <div className="w-full space-y-10 animate-in zoom-in-95">
            <div className={`${TACTILE_BOX} p-12 border-cyan-500/20`}>
              <h2 className="text-2xl font-black text-cyan-400 mb-6 uppercase flex items-center gap-3"><CheckCircle2/> AI Meeting Summary</h2>
              <pre className="whitespace-pre-wrap font-mono text-cyan-50 leading-relaxed text-sm bg-black/40 p-10 rounded-2xl">{summary}</pre>
            </div>
            <div className={`${TACTILE_BOX} p-12 border-fuchsia-500/20`}>
              <h2 className="text-2xl font-black text-fuchsia-400 mb-6 uppercase flex items-center gap-3"><Stars/> Perspective Mindmap</h2>
              <MindMapPreview code={mindmapCode} />
            </div>
            <button onClick={resetState} className={`${CLAY_BUTTON} px-14 py-8 bg-black/80 text-white flex items-center gap-6 mx-auto mt-10`}><RefreshCw /> New Session</button>
          </div>
        )}
      </main>

      {/* Neural Debug Console (Fixed Bottom) */}
      <div className={`fixed bottom-0 left-0 right-0 z-[100] transition-all duration-500 ${isConsoleOpen ? 'h-64' : 'h-12'} bg-black/90 backdrop-blur-3xl border-t-2 border-fuchsia-500/30 flex flex-col shadow-[0_-20px_100px_rgba(217,70,239,0.2)]`}>
          <div className="flex items-center justify-between px-6 py-2 bg-fuchsia-900/20 border-b border-white/5 cursor-pointer" onClick={() => setIsConsoleOpen(!isConsoleOpen)}>
            <div className="flex items-center gap-3 text-fuchsia-400 font-black text-xs uppercase tracking-[0.4em]">
              <Terminal className="w-4 h-4" /> Neural Diagnostics Console {workerLogs.length > 0 && <span className="text-white ml-2 bg-fuchsia-600 px-2 rounded-full text-[10px]">{workerLogs.length}</span>}
            </div>
            <div className="flex items-center gap-4">
              {workerLogs.length > 0 && (
                <button onClick={(e) => { e.stopPropagation(); downloadLogs(); }} className="text-white hover:text-fuchsia-400 transition-colors">
                  <FileDown className="w-4 h-4" />
                </button>
              )}
              {isConsoleOpen ? <ChevronDown className="w-5 h-5 text-white" /> : <ChevronUp className="w-5 h-5 text-white" />}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] md:text-sm text-lime-400 space-y-1 selection:bg-lime-400 selection:text-black scroll-smooth custom-scrollbar">
             {workerLogs.length === 0 ? (
                <div className="text-slate-600 italic">No neural telemetry detected. Waiting for ignition...</div>
             ) : (
                workerLogs.map((log, i) => (
                  <div key={i} className="flex gap-4 border-l-2 border-lime-400/20 pl-4 hover:bg-white/5 transition-colors">
                    <span className="opacity-40 shrink-0">{log.split(' ')[0]}</span>
                    <span>{log.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))
             )}
             <div ref={consoleEndRef} />
          </div>
      </div>

      {/* Floating Mascot */}
      <div className="fixed top-0 left-0 pointer-events-none z-50 transition-all duration-700 ease-out flex flex-col items-center" style={{ transform: `translate(${mascotPos.x + 30}px, ${mascotPos.y - 20}px) rotate(${targetTilt}deg)` }}>
        <img src="/mascot.png" className="w-32 h-32 animate-bounce" />
        <div className="mt-4 bg-black/60 backdrop-blur-3xl px-6 py-4 rounded-full border border-fuchsia-500/40 text-[10px] font-black uppercase text-white shadow-2xl">{getMascotSpeech()}</div>
      </div>

      {showJojo && (<div className="fixed inset-0 z-[100] pointer-events-none flex items-center justify-center bg-black/90"><div className="bg-white border-[10px] border-black p-20 shadow-[40px_40px_0_#d946ef]"><h2 className="text-6xl font-black text-black uppercase">「{currentQuote}」</h2></div></div>)}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #d946ef; border-radius: 10px; }
        @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
      `}} />
    </div>
  );
}
