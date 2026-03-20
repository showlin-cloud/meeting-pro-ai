'use client';

import React, { useState, useRef, DragEvent, useEffect } from 'react';
import { localAudioProcessor } from '@/lib/localAudioProcessor';
import { LocalWhisperEngine, decodeAudioBlobToFloat32Array } from '@/lib/localWhisperEngine';
import { exportToMarkdown, TranscriptSegment } from '@/lib/exportToMarkdown';
import { 
  FileDown, DownloadCloud, Stars, RefreshCw, CheckCircle2,
  HardDrive, Cpu, Radio, AlignLeft, AudioWaveform, Zap, Flame
} from 'lucide-react';

export default function TranscriptionPage() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [activeStep, setActiveStep] = useState(0); 
  const [isDragging, setIsDragging] = useState(false);
  
  // Y2K & JoJo Effect States
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mascotPos, setMascotPos] = useState({ x: 0, y: 0 });
  const [targetTilt, setTargetTilt] = useState(0);
  const [showJojo, setShowJojo] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("");
  const [hoverQuote, setHoverQuote] = useState("");
  const [isModelReady, setIsModelReady] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  
  const [downloadStats, setDownloadStats] = useState({ file: '', loaded: 0, total: 0, percentage: 0 });
  
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null);

  const jojoUploadQuotes = [
    "又要開會？這種無馱無馱無馱的會議，交給我的替身！",
    "老總... 你的敗因只有一個，叫我聽這長達 3 小時的廢話。",
    "我從短暫的社畜人生中學到一件事... 我不聽錄音檔啦！",
    "這就是我替身的能力。你剛開了三小時的會，我一秒就看透。",
    "我只想要平靜的下班生活... 碰上長音檔，我也絕不退縮！",
    "「世界」啊！停止這無意義的時間吧！由我來終結這段錄音！"
  ];

  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<LocalWhisperEngine | null>(null);

  // Initialize engine on mount for background pre-loading
  useEffect(() => {
    // Set initial position after mount
    setMascotPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    lastMousePosRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    // Create and Init Engine Backgroundly
    const engine = new LocalWhisperEngine((event) => {
      if (event.type === 'model_progress') {
        const modelP = event.progress || 0;
        
        // If we are currently processing, update main progress
        // Transition: 35% -> 50% for model loading
        if (statusRef.current === 'processing') {
          setActiveStep(3);
          setProgress(35 + Math.round((modelP / 100) * 15));
        }

        if (event.status === 'initiate') {
          setStatusText(`[降臨] 正在召喚深淵模組: ${event.file || 'models'}...`);
        } else if (event.status === 'progress' && event.file) {
          setDownloadStats({
            file: event.file,
            loaded: (event as any).loaded || 0,
            total: (event as any).total || 0,
            percentage: event.progress || 0
          });
        } else if (event.status === 'ready') {
          setStatusText(`[模組完全覺醒]: ${event.file || 'layer_1'} ✨`);
          setIsModelReady(true);
          setLogs((prev) => [...prev.slice(-19), `[SYSTEM] Model ready: ${event.file}`]);
        }
      } else if (event.type === 'ready') {
        setIsModelReady(true);
        setLogs((prev) => [...prev.slice(-19), `[SYSTEM] Engine fully initialized.`]);
        if (statusRef.current === 'processing') {
          setActiveStep(4);
          setStatusText('『替身：SILENT PRODUCER』完全顯現！開展領域：真實之言！');
          // Engine is ready, if processing, it likely needs a kick-start or is waiting for transcribe call
        }
      } else if (event.type === 'log') {
        setLogs((prev) => [...prev.slice(-19), `[WORKER] ${event.message}`]);
      } else if (event.type === 'chunk_update') {
        if (statusRef.current === 'processing') {
          setProgress((prev) => (prev < 98 ? prev + 1 : prev));
          setStatusText('正在將混沌的音波轉化為智慧的文字...');
          if (event.output && Array.isArray(event.output)) {
            const mappedSegments = event.output.map((o: any) => ({
              timestamp: o.timestamp ? `${o.timestamp[0]} - ${o.timestamp[1] || '...'}` : 'unknown',
              speaker: 'speaker_1',
              text: o.text || ""
            }));
            setSegments(mappedSegments);
          }
        }
      } else if (event.type === 'complete') {
        if (statusRef.current === 'processing') {
          if (event.result && event.result.chunks) {
            const finalSegments = event.result.chunks.map((chunk: any) => ({
              timestamp: chunk.timestamp ? `${chunk.timestamp[0]} - ${chunk.timestamp[1] || 'end'}` : 'unknown',
              speaker: 'speaker_1',
              text: chunk.text || ""
            }));
            setSegments(finalSegments);
          }
          setProgress(100);
          setStatusText('完全理解。所有秘密皆在此顯現。 🍒');
          setStatus('completed');
          setActiveStep(5);
        }
      } else if (event.type === 'error') {
        setStatus('error');
        setStatusText(event.message);
      }
    });

    engineRef.current = engine;
    engine.init(); // Start background download

    const handleMouseMove = (e: MouseEvent) => {
      // MEGA Y2K SHIFT (Aggressive shift for background)
      const x = (e.clientX / window.innerWidth - 0.5) * 800;
      const y = (e.clientY / window.innerHeight - 0.5) * 800;
      setMousePos({ x, y });
      
      // Mascot Tilt
      const dx = e.clientX - lastMousePosRef.current.x;
      const tilt = Math.max(-50, Math.min(50, dx * 2)); 
      setTargetTilt(tilt);

      // Mascot Pos
      setMascotPos({ x: e.clientX, y: e.clientY });
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = setTimeout(() => {
        setTargetTilt(0);
      }, 100);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      engine.terminate();
    };
  }, []);

  // Persistent ref for status to check inside stable engine callback
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  const triggerJojoEffect = () => {
    setCurrentQuote(jojoUploadQuotes[Math.floor(Math.random() * jojoUploadQuotes.length)]);
    setShowJojo(true);
    setTimeout(() => setShowJojo(false), 4500); 
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setHoverQuote("「受死吧！這點程度的音檔，在我的『WASM波紋』面前毫無還手之力！」");
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setHoverQuote("");
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setHoverQuote("");
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      startProcessing(droppedFile);
    }
  };

  const handleFileClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      startProcessing(selectedFile);
    }
  };

  const startProcessing = async (targetFile: File) => {
    try {
      if (!engineRef.current) throw new Error("Engine not ready.");

      triggerJojoEffect(); 
      setStatus('processing');
      setProgress(0);
      setSegments([]);
      setDownloadStats({ file: '', loaded: 0, total: 0, percentage: 0 });
      
      setActiveStep(1);
      setStatusText('啟動量子矩陣... FFMPEG.WASM 疊加態加壓中...');
      const audioBlob = await localAudioProcessor(targetFile, (ratio) => {
        setProgress(Math.round(ratio * 30));
      });

      setActiveStep(2);
      setProgress(32);
      setStatusText('警告：核心瘋狂解析中！Float32Array 正在燃燒你的 CPU 靈魂！ 🔥');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      const audioData = await decodeAudioBlobToFloat32Array(audioBlob);

      setActiveStep(4); 
      setProgress(50);
      setStatusText('『替身：SILENT PRODUCER』完全顯現！開展領域：真實之言！');
      setLogs((prev) => [...prev.slice(-19), `[SYSTEM] Starting inference with ${audioData.length} samples...`]);
      engineRef.current.transcribe(audioData);

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setStatusText(err.message || 'unknown critical error');
      setLogs((prev) => [...prev.slice(-19), `[ERROR] ${err.message}`]);
    }
  };

  const handleExport = () => {
    exportToMarkdown(segments, `transcribe_${file?.name || 'log'}.md`);
  };

  const resetState = () => {
    setStatus('idle');
    setFile(null);
    setSegments([]);
    setProgress(0);
    setStatusText('');
    setActiveStep(0);
    setDownloadStats({ file: '', loaded: 0, total: 0, percentage: 0 });
  };

  const generateMarkdownPreview = () => {
    if (segments.length === 0) return 'empty canvas...';
    let mdContent = '| timestamp | identity | dialog |\n';
    mdContent += '| --- | --- | --- |\n';
    segments.forEach((seg) => {
      const safeText = (seg.text || "").replace(/\\|/g, '&#124;').replace(/\n/g, '<br>');
      mdContent += `| ${seg.timestamp} | ${seg.speaker || '???'} | ${safeText} |\n`;
    });
    return mdContent;
  };

  // Dark Y2K Style Constants
  const TACTILE_BOX = "bg-[#0b101a]/85 backdrop-blur-3xl border border-fuchsia-500/20 shadow-[0_0_80px_rgba(255,0,255,0.1),inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-[3rem]";
  const CLAY_BUTTON = "rounded-full font-black tracking-widest uppercase transition-all duration-300 hover:scale-[1.1] active:scale-90 shadow-[0_0_30px_rgba(217,70,239,0.4)] border-2 border-slate-700 hover:border-fuchsia-400";
  const SOFT_PILL = "flex items-center gap-4 p-5 rounded-[2rem] border border-white/10 bg-black/40 transition-all duration-500 shadow-xl";

  const getMascotSpeech = () => {
    if (hoverQuote) return hoverQuote;
    if (status === 'idle') return "「這種波紋... 是開會的前兆嗎？！」 🌍";
    if (status === 'processing') {
      if (activeStep === 3) return "「歐拉歐拉歐拉！150MB 的大腦注入中！注入中！」";
      return "「木大木大木大！音檔太慢了，給我覺醒！」 ⚙️";
    }
    if (status === 'error') return "「這難道也是... 迪奧的陰謀嗎？！機體大破！」 🤬";
    return "「終於結束了... 這一場漫長的十字軍遠征（會議）。💤」";
  };

  return (
    <div className={`w-full min-h-screen bg-[#04060b] bg-[url('/bg-cosmic.png')] bg-cover bg-center bg-fixed text-slate-200 font-sans pt-12 pb-24 px-6 md:px-12 selection:bg-fuchsia-500 selection:text-white relative overflow-hidden ${showJojo ? 'animate-[shake_0.1s_linear_infinite]' : ''}`}>
      
      {/* Background Neon Overlays - Aggressive Reaction */}
      <div 
        className="fixed inset-0 pointer-events-none transition-colors duration-[300ms] opacity-40 mix-blend-color-dodge -z-10" 
        style={{ backgroundColor: `hsl(${(mousePos.x + 300) / 4}, 80%, 50%)` }}
      />
      <div 
        className="fixed top-[-30%] left-[-20%] w-[100vw] h-[100vw] rounded-full bg-gradient-to-tr from-fuchsia-600/50 to-purple-800/20 blur-[150px] -z-10 transition-transform duration-[150ms] ease-out" 
        style={{ transform: `translate(${-mousePos.x}px, ${-mousePos.y}px)` }} 
      />
      
      {/* Dynamic Scanline Grid */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none -z-10 animate-[pulse_5s_infinite]" />

      {/* Header */}
      <header className="max-w-4xl mx-auto mb-16 flex flex-col items-center justify-center text-center gap-4 relative z-10 p-4 drop-shadow-[0_0_30px_rgba(217,70,239,0.3)]">
        <h1 className="text-7xl md:text-9xl font-black lowercase tracking-tighter text-white flex flex-col md:flex-row items-center justify-center gap-6">
          <span className="bg-fuchsia-600 text-white p-6 rounded-[2.5rem] shadow-[inset_0_-8px_16px_rgba(0,0,0,0.5),0_10px_60px_rgba(217,70,239,0.6)] rotate-[-8deg] hover:rotate-12 transition-transform duration-300">
            <Zap className="h-16 w-12 fill-white" />
          </span>
          transcribe_ai.
        </h1>
        <p className="text-cyan-300 font-black tracking-[0.4em] text-lg md:text-2xl uppercase mt-4 bg-black/60 px-12 py-4 rounded-full border-4 border-cyan-400/50 shadow-[0_0_40px_rgba(34,211,238,0.4)] backdrop-blur-xl animate-pulse">
          neural overdrive ⚡ jojo stance
        </p>
      </header>
      
      <main className="max-w-3xl mx-auto relative z-10">
        {/* State A: Idle */}
        {status === 'idle' && (
          <div 
            onClick={handleFileClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseEnter={() => setHoverQuote('「把長達一小時的錄音檔拖進來吧！覺悟吧！」')}
            onMouseLeave={() => setHoverQuote('')}
            className={`
              relative overflow-hidden group cursor-crosshair transition-all duration-300 text-center
              ${TACTILE_BOX} p-16 md:p-32 border-4
              ${isDragging ? 'scale-[1.05] shadow-[0_0_120px_rgba(217,70,239,0.8)] border-fuchsia-400 bg-slate-900/90' : 'hover:scale-[1.02] border-fuchsia-500/30'}
            `}
          >
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="video/*,audio/*" />
            
            <div className="relative z-10 flex flex-col items-center">
              {/* Dancing JoJo Icon */}
              <div className="relative mb-12">
                 <div className="absolute inset-0 bg-fuchsia-500 blur-3xl opacity-30 animate-pulse" />
                 <img 
                    src="/jojo-icon.png" 
                    alt="Dancing JoJo" 
                    className={`w-48 h-48 md:w-64 md:h-64 object-contain transition-all duration-500 relative z-10 drop-shadow-[0_0_40px_rgba(255,255,255,0.5)] 
                    ${isDragging ? 'animate-[jojo-spin_0.5s_linear_infinite] scale-125' : 'animate-[jojo-dance_3s_ease-in-out_infinite]'}`} 
                 />
              </div>
              
              <h3 className="text-5xl md:text-7xl font-black lowercase tracking-tighter text-white mb-8 bg-black/40 px-8 py-4 rounded-3xl border border-white/10">
                stand activation.
              </h3>
              <p className="text-slate-300 font-bold text-sm md:text-lg max-w-xl mx-auto leading-relaxed mb-12 lowercase tracking-widest bg-fuchsia-950/40 p-10 rounded-[3rem] border-2 border-fuchsia-500/20 shadow-inner">
                這不是科學，這是覺醒！在您的瀏覽器深淵中，WASM 的波紋已然啟動。離線神經網路——『替身：SILENT PRODUCER』在此顯現！絕不外傳、絕不背叛，這就是我們的「黃金體驗」。
              </p>
              
              <div className="inline-flex items-center gap-6 bg-white text-slate-950 px-12 py-6 rounded-full text-lg font-black lowercase tracking-widest shadow-[0_15px_60px_rgba(255,255,255,0.3)] hover:bg-lime-400 hover:scale-110 transition-all cursor-pointer">
                <Flame className="w-8 h-8 fill-slate-950" strokeWidth={3} /> Ignite "The World"
              </div>
            </div>
          </div>
        )}

        {/* State B: Processing */}
        {status === 'processing' && (
          <div className={`${TACTILE_BOX} p-10 md:p-14 border-4 border-cyan-500/30`}>
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b-2 border-slate-800 pb-10">
                <div>
                  <h2 className="text-6xl font-black lowercase tracking-tighter text-white animate-pulse">overdrive...</h2>
                  <p className="text-cyan-400 font-black mt-4 lowercase tracking-[0.2em] text-sm bg-black/60 px-6 py-4 rounded-2xl border-2 border-cyan-500/30 flex items-center gap-4">
                    <AudioWaveform className="w-6 h-6 animate-[bounce_0.8s_infinite]" /> {file?.name}
                  </p>
                </div>
                <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-400 to-fuchsia-500 tabular-nums tracking-tighter drop-shadow-[0_0_30px_rgba(217,70,239,0.5)]">
                  {progress}<span className="text-4xl text-slate-500">%</span>
                </div>
              </div>

              {/* Mega Progress Bar */}
              <div className="h-16 w-full bg-black/80 border-4 border-slate-700 shadow-[inset_0_10px_30px_rgba(0,0,0,1)] rounded-[2rem] overflow-hidden mb-12 p-2 backdrop-blur-3xl">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-600 to-lime-400 rounded-2xl transition-all duration-[1000ms] ease-out shadow-[0_0_40px_rgba(217,70,239,1)] relative overflow-hidden"
                  style={{ width: `${Math.max(3, progress)}%` }}
                >
                   <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:4rem_4rem] animate-[progress-stripe_1.5s_linear_infinite]" />
                </div>
              </div>

              {/* 35% Download Visualizer */}
              {activeStep === 3 && (
                <div className="mb-12 bg-amber-600/20 border-[6px] border-amber-500/80 rounded-[3rem] p-10 shadow-[0_0_80px_rgba(245,158,11,0.4)] animate-in zoom-in duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent animate-pulse" />
                  <h3 className="text-amber-400 font-black text-3xl md:text-5xl uppercase tracking-tighter mb-6 flex items-center gap-6 z-10 relative">
                    <Zap className="h-12 w-12 fill-amber-500" /> 
                    Downloading "The Neural Stand" (150MB+)
                  </h3>
                  <div className="flex justify-between font-mono text-amber-300 mb-4 font-black text-2xl z-10 relative">
                    <span>{Math.round(downloadStats.loaded / 1024 / 1024)}MB / {Math.round(downloadStats.total / 1024 / 1024)}MB</span>
                    <span>{Math.round(downloadStats.percentage)}%</span>
                  </div>
                  <div className="h-6 bg-black/80 rounded-full border-2 border-amber-500/50 shadow-inner z-10 relative overflow-hidden">
                    <div className="h-full bg-amber-400 transition-all duration-300" style={{ width: `${Math.max(0, downloadStats.percentage)}%` }} />
                  </div>
                </div>
              )}

              {/* Status Header Log */}
              <div className="bg-black/90 text-lime-400 p-8 rounded-[2.5rem] shadow-[inset_0_4px_30px_rgba(0,0,0,1)] border-2 border-white/5 overflow-hidden text-center relative mb-12">
                <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(163,230,53,0.1),transparent)] animate-[scan_1.5s_ease-in-out_infinite]" />
                <span className="font-mono text-sm md:text-xl uppercase tracking-[0.4em] font-black z-10 relative">
                   &gt; {statusText || 'GATHERING STAND ENERGY...'} _
                </span>
              </div>
          </div>
        )}

         {/* (C) Error & (D) Completed States - Styled similarly with black/fuchsia theme */}
         {status === 'error' && (
          <div className={`${TACTILE_BOX} p-16 text-center border-4 border-rose-500/50`}>
            <div className="bg-rose-600 text-white w-48 h-48 mx-auto rounded-[4rem] shadow-[0_0_80px_rgba(244,63,94,0.6)] flex items-center justify-center mb-12 rotate-[-12deg]">
              <Flame className="h-24 w-24 fill-white" />
            </div>
            <h2 className="text-7xl font-black lowercase tracking-tighter text-rose-500 mb-8 drop-shadow-[0_0_30px_rgba(244,63,94,0.5)]">catastrophic collapse.</h2>
            <p className="bg-black text-rose-400 p-8 rounded-[3rem] font-mono text-lg border-2 border-rose-900 shadow-inner mb-16">
               {statusText}
            </p>
            <button onClick={resetState} className={`${CLAY_BUTTON} px-14 py-8 text-2xl bg-white text-slate-950 flex items-center gap-6 mx-auto`}>
               <RefreshCw className="h-10 w-10 font-black" strokeWidth={4} /> Restart Destiny
            </button>
          </div>
        )}

        {status === 'completed' && (
          <div className={`${TACTILE_BOX} p-10 md:p-16 border-4 border-lime-500/30`}>
             <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-12 border-b-2 border-slate-800 pb-12">
                <h2 className="text-7xl md:text-8xl font-black lowercase tracking-tighter text-white flex items-center gap-8">
                  <span className="bg-lime-400 text-lime-950 p-6 rounded-[3rem] shadow-[0_15px_60px_rgba(163,230,53,0.5)] rotate-[8deg]">
                    <CheckCircle2 className="h-16 w-16" strokeWidth={4} />
                  </span>
                  awoken.
                </h2>
                <div className="flex gap-6">
                  <button onClick={resetState} className={`${CLAY_BUTTON} px-12 py-6 bg-slate-900 text-white text-lg`}>New Case</button>
                  <button onClick={handleExport} className={`${CLAY_BUTTON} px-12 py-6 bg-cyan-400 text-cyan-950 flex items-center gap-4 text-lg`}>
                    <FileDown className="h-8 w-8 stroke-[4]" /> Save Grimoire
                  </button>
                </div>
             </div>
             <div className="bg-black/80 rounded-[4rem] p-10 border-2 border-slate-800 shadow-[inset_0_30px_100px_rgba(0,0,0,1)]">
                <textarea 
                  readOnly
                  className="w-full h-[600px] font-mono bg-transparent border-none rounded-none text-lg leading-relaxed text-slate-300 focus:outline-none resize-none custom-scrollbar" 
                  value={generateMarkdownPreview()} 
                />
             </div>
          </div>
        )}
      </main>

      {/* Floating Pessimistic Companion */}
      <div 
        className="fixed top-0 left-0 pointer-events-none z-50 transition-all duration-[700ms] ease-out flex flex-col items-center drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
        style={{ transform: `translate(${mascotPos.x + 30}px, ${mascotPos.y - 20}px) rotate(${targetTilt}deg)` }}
      >
        <img 
          src="/mascot.png" 
          alt="Space Octopus" 
          className="w-32 h-32 md:w-44 md:h-44 object-contain animate-[bounce_2s_ease-in-out_infinite]" 
        />
        <div className="mt-4 bg-white/10 backdrop-blur-3xl px-8 py-5 rounded-[2.5rem] border-2 border-fuchsia-500/40 text-sm md:text-lg font-black text-fuchsia-200 shadow-2xl whitespace-nowrap" style={{ transform: `rotate(${-targetTilt * 0.4}deg)` }}>
          {getMascotSpeech()}
        </div>
      </div>

      {/* Extreme JoJo Bizarre Adventure Overlay Effect */}
      {showJojo && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-80 mix-blend-screen" 
               style={{ 
                 background: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,0) 0deg 2deg, rgba(255,255,255,1) 2deg 4deg, rgba(255,255,255,0) 4deg 8deg)',
                 animation: 'spin 0.4s linear infinite',
                 maskImage: 'radial-gradient(circle, transparent 20%, black 95%)'
               }} 
          />
          <div className="absolute inset-0 opacity-90 mix-blend-color-dodge bg-gradient-to-t from-rose-600 via-transparent to-fuchsia-700 animate-pulse" />
          <div className="absolute top-[5%] left-[2%] text-9xl md:text-[15rem] font-black text-rose-500 rotate-[-15deg] drop-shadow-[15px_15px_0_rgba(255,255,255,1)]">ゴゴゴゴ...</div>
          <div className="absolute bottom-[5%] right-[2%] text-9xl md:text-[15rem] font-black text-cyan-400 rotate-[10deg] drop-shadow-[15px_15px_0_rgba(255,255,255,1)]">ドドドド!!</div>
          <div className="relative z-10 bg-black border-[15px] border-white p-12 md:p-24 max-w-[95%] text-center transform shadow-[50px_50px_0_rgba(217,70,239,1)] rotate-[-2deg]">
             <h2 className="text-5xl md:text-8xl font-black text-white leading-tight tracking-tighter">「{currentQuote}」</h2>
          </div>
        </div>
      )}

      {/* System Logs Console (Debug Stand) */}
      {showLogs && (
        <div className="fixed bottom-24 right-8 w-80 md:w-96 max-h-64 bg-black/95 border-2 border-fuchsia-500/50 rounded-3xl p-6 z-50 font-mono text-[10px] md:text-xs text-lime-400 overflow-y-auto shadow-[0_0_50px_rgba(217,70,239,0.3)] animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-between items-center mb-2 border-b border-fuchsia-500/30 pb-2">
            <span className="font-black text-fuchsia-400">STATUS MONITOR</span>
            <button onClick={() => setLogs([])} className="hover:text-white">CLEAR</button>
          </div>
          {logs.length === 0 ? (
            <div className="italic text-slate-500">Waiting for system signals...</div>
          ) : (
            logs.map((log, i) => <div key={i} className="mb-1 leading-tight">{log}</div>)
          )}
        </div>
      )}

      {/* Footer Info / Neural Readiness */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6">
        <button 
          onClick={() => setShowLogs(!showLogs)}
          className={`px-6 py-3 rounded-full border-2 transition-all duration-300 font-black text-xs uppercase tracking-widest ${showLogs ? 'bg-fuchsia-600 border-fuchsia-400 text-white' : 'bg-black/60 border-slate-700 text-slate-400 hover:border-fuchsia-500/50'}`}
        >
          {showLogs ? 'Dismiss Terminal' : 'Access Log'}
        </button>

        <div className={`flex items-center gap-3 px-6 py-3 rounded-full border-2 transition-all duration-500 backdrop-blur-xl ${isModelReady ? 'bg-lime-500/20 border-lime-400 text-lime-300 shadow-[0_0_30px_rgba(163,230,53,0.3)]' : 'bg-amber-500/10 border-amber-600/50 text-amber-500 animate-pulse'}`}>
          <div className={`w-3 h-3 rounded-full ${isModelReady ? 'bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,1)]' : 'bg-amber-500'}`} />
          <span className="text-xs md:text-sm font-black uppercase tracking-widest leading-none">
            {isModelReady ? 'Neural Stand: Fully Awoken' : 'Awakening Neural Stand...'}
          </span>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes jojo-dance {
          0% { transform: scale(1) rotate(0deg) skewX(0deg); }
          25% { transform: scale(1.1) rotate(15deg) skewX(10deg); filter: hue-rotate(90deg) brightness(1.5); }
          50% { transform: scale(1) rotate(-10deg) skewX(-10deg); filter: hue-rotate(180deg) brightness(1.2); }
          75% { transform: scale(1.2) rotate(5deg) skewX(5deg); filter: hue-rotate(270deg) brightness(1.5); }
          100% { transform: scale(1) rotate(0deg) skewX(0deg); }
        }
        @keyframes jojo-spin {
          0% { transform: rotate(0deg) scale(1); filter: hue-rotate(0deg); }
          100% { transform: rotate(360deg) scale(1.5); filter: hue-rotate(360deg); }
        }
        @keyframes shake {
          0% { transform: translate(10px, 10px) rotate(0deg); }
          20% { transform: translate(-10px, 0px) rotate(2deg); }
          100% { transform: translate(10px, -10px) rotate(-2deg); }
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }
        .custom-scrollbar::-webkit-scrollbar { width: 15px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.8); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, #d946ef, #22d3ee); border-radius: 20px; }
      `}} />
    </div>
  );
}
