'use client';

import React, { useState, useRef, DragEvent, useEffect } from 'react';
import { localAudioProcessor } from '@/lib/localAudioProcessor';
import { LocalWhisperEngine, decodeAudioBlobToFloat32Array } from '@/lib/localWhisperEngine';
import { exportToMarkdown, TranscriptSegment } from '@/lib/exportToMarkdown';
import { 
  FileDown, BrainCircuit, UploadCloud, Stars, RefreshCw, CheckCircle2,
  HardDrive, Cpu, Radio, AlignLeft, AudioWaveform, AlertCircle, Zap, Skull
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
  
  const [downloadStats, setDownloadStats] = useState({ file: '', loaded: 0, total: 0, percentage: 0 });
  
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null);

  const jojoUploadQuotes = [
    "又要開會？這種無馱無馱無馱的會議，交給我的替身！",
    "老總... 你的敗因只有一個，叫我聽這長達 3 小時的廢話。",
    "我從短暫的社畜人生中學到一件事... 我不聽錄音檔啦！",
    "這就是我替身的能力。你剛開了三小時的會，我一秒就看透。",
    "我只想要平靜的下班生活... 碰上長音檔，我也絕不退縮！"
  ];

  useEffect(() => {
    // Set initial position after mount
    setMascotPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    lastMousePosRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    const handleMouseMove = (e: MouseEvent) => {
      // Crazy Y2K Metaverse Shift Factor (Aggressive shift)
      const x = (e.clientX / window.innerWidth - 0.5) * 600;
      const y = (e.clientY / window.innerHeight - 0.5) * 600;
      setMousePos({ x, y });
      
      // Calculate velocity for Mascot tilt leaning
      const dx = e.clientX - lastMousePosRef.current.x;
      const tilt = Math.max(-45, Math.min(45, dx * 1.5)); // Extreme tilt up to 45 deg
      setTargetTilt(tilt);

      // Mascot Follow offset
      setMascotPos({ x: e.clientX, y: e.clientY });
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };

      // Return to upright when stopped
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      stopTimerRef.current = setTimeout(() => {
        setTargetTilt(0);
      }, 100);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const triggerJojoEffect = () => {
    setCurrentQuote(jojoUploadQuotes[Math.floor(Math.random() * jojoUploadQuotes.length)]);
    setShowJojo(true);
    setTimeout(() => setShowJojo(false), 4500); 
  };

  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<any>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setHoverQuote("「貧弱！貧弱！這點大小的檔案也敢拿來？」");
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
      triggerJojoEffect(); // Trigger Dramatic Anime Overlay Action!
      
      setStatus('processing');
      setProgress(0);
      setSegments([]);
      setDownloadStats({ file: '', loaded: 0, total: 0, percentage: 0 });
      
      setActiveStep(1);
      setStatusText('mounting virtual matrix via ffmpeg.wasm...');
      const audioBlob = await localAudioProcessor(targetFile, (ratio) => {
        setProgress(Math.round(ratio * 30));
      });

      setActiveStep(2);
      setProgress(32);
      setStatusText('warning: hardcore audio decoding to Float32Array (UI may choke!) ⚠️');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      const audioData = await decodeAudioBlobToFloat32Array(audioBlob);

      setActiveStep(3);
      setStatusText('neural network awakening... 🧠');
      setProgress(35);

      const engine = new LocalWhisperEngine((event) => {
        if (event.type === 'model_progress') {
          setActiveStep(3);
          const modelP = event.progress || 0;
          setProgress(35 + Math.round((modelP / 100) * 15));
          
          if (event.status === 'initiate') {
            setStatusText(`[DOWNLOAD] initializing: ${event.file || 'models'}...`);
          } else if (event.status === 'progress' && event.file) {
            setDownloadStats({
              file: event.file,
              loaded: (event as any).loaded || 0,
              total: (event as any).total || 0,
              percentage: event.progress || 0
            });
            setStatusText(`[DOWNLOAD] PULLING ${event.file}... ${Math.round(modelP)}%`);
          } else if (event.status === 'ready') {
            setStatusText(`[MODULE READY]: ${event.file || 'layer_1'} ✨`);
          } else {
            setStatusText(`[SYSTEM] locking memory... ${Math.round(modelP)}%`);
          }
        } else if (event.type === 'ready') {
          setActiveStep(4);
          setStatusText('[OVERDRIVE] cyber engine active! streaming real-time...');
          engine.transcribe(audioData);
        } else if (event.type === 'chunk_update') {
          setProgress((prev) => (prev < 98 ? prev + 1 : prev));
          setStatusText('[INFERENCE] crushing logic matrix into words...');
          if (event.output && Array.isArray(event.output)) {
            const mappedSegments = event.output.map((o: any) => ({
              timestamp: o.timestamp ? `${o.timestamp[0]} - ${o.timestamp[1] || '...'}` : 'unknown',
              speaker: 'speaker_1',
              text: o.text
            }));
            setSegments(mappedSegments);
          }
        } else if (event.type === 'complete') {
          if (event.result && event.result.chunks) {
            const finalSegments = event.result.chunks.map((chunk: any) => ({
              timestamp: chunk.timestamp ? `${chunk.timestamp[0]} - ${chunk.timestamp[1] || 'end'}` : 'unknown',
              speaker: 'speaker_1',
              text: chunk.text
            }));
            setSegments(finalSegments);
          } else if (event.result && event.result.text) {
             setSegments([{ timestamp: '0.00-end', speaker: 'speaker_1', text: event.result.text }]);
          }
          setProgress(100);
          setStatusText('transcript crafted entirely offline. 🍒');
          setStatus('completed');
          setActiveStep(5);
        } else if (event.type === 'error') {
          setStatus('error');
          setStatusText(event.message);
        }
      });

      engineRef.current = engine;
      engine.init();

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setStatusText(err.message || 'unknown critical error');
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
      const safeText = seg.text.replace(/\\|/g, '&#124;').replace(/\n/g, '<br>');
      mdContent += `| ${seg.timestamp} | ${seg.speaker || '???'} | ${safeText} |\n`;
    });
    return mdContent;
  };

  // Dark Y2K Space Style Constants (PURE NEON DARKNESS)
  const TACTILE_BOX = "bg-slate-950/80 backdrop-blur-3xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_80px_rgba(255,0,255,0.1)] rounded-[3rem]";
  const CLAY_BUTTON = "rounded-full font-black tracking-widest uppercase transition-all duration-300 hover:scale-[1.05] active:scale-90 shadow-[0_10px_30px_rgba(0,0,0,0.8)] border-2 border-transparent hover:border-fuchsia-500/50";
  const SOFT_PILL = "flex items-center gap-4 p-5 rounded-[2rem] border border-white/5 bg-[#0a0a0f] transition-all duration-500 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]";

  const getMascotSpeech = () => {
    if (hoverQuote) return hoverQuote;
    if (status === 'idle') return "「人類什麼時候才不開會？」 🌍";
    if (status === 'processing') {
      if (activeStep === 3) return "「好重！150MB 的大腦下載中！💦」";
      return "「歐拉歐拉歐拉！碎紙中！」 ⚙️";
    }
    if (status === 'error') return "「替身能力超載！機體故障啦！🤬」";
    return "「全裸待機結束，可以睡了嗎？💤」";
  };

  return (
    <div className={`w-full min-h-screen bg-[#06080f] text-slate-200 font-sans pt-12 pb-24 px-6 md:px-12 selection:bg-fuchsia-500 selection:text-white relative overflow-hidden ${showJojo ? 'animate-[shake_0.1s_linear_infinite]' : ''}`}>
      
      {/* Absolute Madness: Dark Y2K Neon Blobs */}
      <div 
        className="fixed top-[-30%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-gradient-to-tr from-fuchsia-600/40 to-purple-800/40 blur-[120px] -z-10 animate-pulse mix-blend-color-dodge pointer-events-none transition-transform duration-[200ms] ease-out" 
        style={{ transform: `translate(${-mousePos.x}px, ${-mousePos.y}px)`, animationDuration: '4s' }} 
      />
      <div 
        className="fixed bottom-[-20%] right-[-20%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tl from-cyan-400/40 to-lime-500/20 blur-[120px] -z-10 animate-pulse mix-blend-color-dodge pointer-events-none transition-transform duration-[200ms] ease-out" 
        style={{ transform: `translate(${mousePos.x}px, ${mousePos.y}px)`, animationDuration: '7s' }} 
      />
      
      {/* Web Overlay Grid for Cyberpunk / Y2K feel */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="max-w-4xl mx-auto mb-16 flex flex-col items-center justify-center text-center gap-4 relative z-10 p-4">
        <h1 className="text-6xl md:text-8xl font-black lowercase tracking-tighter text-white flex flex-col md:flex-row items-center justify-center gap-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          <span className="bg-lime-400 text-lime-950 p-4 rounded-[2rem] shadow-[inset_0_-8px_16px_rgba(0,0,0,0.5),0_10px_40px_rgba(163,230,53,0.3)] rotate-[-6deg] hover:rotate-12 transition-transform duration-300">
            <Zap className="h-12 w-12 fill-lime-950" />
          </span>
          transcribe_ai.
        </h1>
        <p className="text-fuchsia-300 font-bold tracking-[0.2em] text-sm md:text-lg uppercase bg-slate-900/80 px-8 py-3 rounded-full border border-fuchsia-500/30 shadow-[0_0_20px_rgba(217,70,239,0.3)] backdrop-blur-xl mt-4 cursor-crosshair">
          dark y2k local neural overdrive 🌌
        </p>
      </header>
      
      <main className="max-w-3xl mx-auto relative z-10 pl-0 md:pl-20"> {/* Offset left to make room for mascot */}
        
        {/* State A: Idle (Drag & Drop Dark Y2K Style) */}
        {status === 'idle' && (
          <div 
            onClick={handleFileClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onMouseEnter={() => setHoverQuote('「把長達一小時的錄音檔拖進來吧... 雖然我很想下班。」')}
            onMouseLeave={() => setHoverQuote('')}
            className={`
              relative overflow-hidden group cursor-pointer transition-all duration-300 text-center
              ${TACTILE_BOX} p-16 md:p-32 
              ${isDragging ? 'scale-[1.03] shadow-[0_40px_100px_rgba(217,70,239,0.4)] border-fuchsia-500 bg-slate-900/95' : 'hover:scale-[1.01] hover:bg-slate-900/80 hover:border-slate-600'}
            `}
          >
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="video/*,audio/*" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className={`p-8 rounded-[2.5rem] mb-10 transition-all duration-500 
                ${isDragging ? 'bg-fuchsia-500 text-white shadow-[inset_0_-10px_20px_rgba(0,0,0,0.5),0_0_60px_rgba(217,70,239,0.8)] rotate-12 scale-125' : 'bg-slate-800 text-slate-400 group-hover:bg-lime-400 group-hover:text-lime-950 group-hover:shadow-[inset_0_-10px_20px_rgba(0,0,0,0.4),0_10px_40px_rgba(163,230,53,0.5)] group-hover:-rotate-[10deg]'}`}>
                <Skull className="h-20 w-20" strokeWidth={2} />
              </div>
              
              <h3 className="text-5xl font-black lowercase tracking-tighter text-white mb-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                feed the beast.
              </h3>
              <p className="text-slate-400 font-bold text-sm max-w-sm mx-auto leading-relaxed mb-12 lowercase tracking-widest bg-black/40 px-6 py-4 rounded-3xl border border-white/5">
                我們將在您的瀏覽器記憶體內，直接用 WASM 壓縮並啟動「離線神經網路」。完全隱私，極度中二。
              </p>
              
              <div className="inline-flex items-center gap-4 bg-white text-slate-950 px-10 py-5 rounded-[2.5rem] text-sm font-black lowercase tracking-widest shadow-[0_10px_40px_rgba(255,255,255,0.2)] hover:bg-lime-400 hover:shadow-[0_10px_40px_rgba(163,230,53,0.4)] transition-all">
                <UploadCloud className="w-6 h-6" strokeWidth={3} /> Ignite Engine
              </div>
            </div>
          </div>
        )}

        {/* State B: Processing (Intense Loading Visualizer) */}
        {status === 'processing' && (
          <div className={`${TACTILE_BOX} relative overflow-hidden`}>
            {/* Blinking Border Light */}
            <div className={`absolute inset-0 border-[6px] transition-colors duration-200 pointer-events-none rounded-[3rem] ${
              activeStep === 3 && downloadStats.file ? 'border-amber-500/50 mix-blend-overlay animate-[pulse_0.5s_infinite]' : 'border-transparent'
            }`} />

            <div className="p-10 md:p-14">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b-2 border-slate-800 pb-8">
                <div>
                  <h2 className="text-5xl font-black lowercase tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">converting...</h2>
                  <p className="text-slate-400 mt-4 font-black flex items-center gap-3 lowercase tracking-wider text-sm bg-black/50 px-5 py-3 rounded-2xl border border-white/10 w-fit">
                    <AudioWaveform className="w-5 h-5 text-fuchsia-500 animate-[bounce_1s_infinite]" /> {file?.name}
                  </p>
                </div>
                <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-600 tabular-nums tracking-tighter">
                  {progress}
                  <span className="text-4xl text-slate-500">%</span>
                </div>
              </div>

              {/* Massive Squishy Progress Bar */}
              <div className="h-10 w-full bg-black/50 border-2 border-slate-800 shadow-[inset_0_10px_20px_rgba(0,0,0,0.8)] rounded-full overflow-hidden mb-12 p-1.5 backdrop-blur-sm">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-lime-400 rounded-full transition-all duration-[800ms] ease-out shadow-[0_0_20px_rgba(217,70,239,0.8)] relative overflow-hidden"
                  style={{ width: `${Math.max(2, progress)}%` }}
                >
                   <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0.3)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.3)_75%,transparent_75%,transparent)] bg-[length:2rem_2rem] animate-[progress-stripe_1s_linear_infinite]" />
                </div>
              </div>

              {/* CRAZY 35% DOWNLOAD VISUALIZER */}
              {activeStep === 3 && (
                <div className="mb-12 bg-[#1a0f00] border-4 border-amber-500 rounded-[2.5rem] p-8 shadow-[inset_0_0_50px_rgba(245,158,11,0.2),0_0_30px_rgba(245,158,11,0.4)] animate-in fade-in zoom-in duration-300">
                  <h3 className="text-amber-500 font-black text-2xl md:text-3xl uppercase tracking-tighter mb-4 flex items-center gap-3 animate-pulse">
                    <Zap className="h-8 w-8" fill="currentColor" /> 
                    Downloading Local AI Brain (150MB+) 
                    <Zap className="h-8 w-8" fill="currentColor" />
                  </h3>
                  <p className="font-mono text-amber-200/70 text-sm md:text-base mb-6 bg-black/60 p-4 rounded-xl border border-amber-500/30 overflow-hidden text-ellipsis whitespace-nowrap">
                    TARGET: {downloadStats.file || 'models/Xenova/whisper-tiny'}
                  </p>
                  
                  {/* Sub-progress bar for current file */}
                  <div className="flex justify-between font-mono text-amber-400 mb-2 font-black text-lg">
                    <span>{Math.round(downloadStats.loaded / 1024 / 1024 * 10) / 10} MB / {Math.round(downloadStats.total / 1024 / 1024 * 10) / 10} MB</span>
                    <span>{Math.round(downloadStats.percentage)}%</span>
                  </div>
                  <div className="h-4 bg-black/80 rounded-full overflow-hidden border border-amber-900 shadow-inner">
                    <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${Math.max(0, downloadStats.percentage)}%` }} />
                  </div>
                </div>
              )}

              {/* Stepper bubbles */}
              <div className="space-y-4 max-w-xl mx-auto opacity-90">
                {/* Step 1 */}
                <div className={`${SOFT_PILL} ${activeStep === 1 ? 'scale-105 border-fuchsia-500 bg-[#2d1b36] shadow-[0_10px_40px_rgba(217,70,239,0.3)]' : activeStep > 1 ? 'opacity-30' : 'opacity-10'}`}>
                  <div className={`p-4 rounded-[1.5rem] ${activeStep === 1 ? 'bg-fuchsia-500 text-white shadow-[inset_0_-4px_8px_rgba(0,0,0,0.4)]' : 'bg-slate-800 text-slate-500'}`}>
                    <HardDrive className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-200 tracking-wide lowercase text-xl">1. virtual mount</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">ffmpeg.wasm injection</p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className={`${SOFT_PILL} ${activeStep === 2 ? 'scale-105 border-rose-500 bg-[#361a1e] shadow-[0_10px_40px_rgba(244,63,94,0.3)]' : activeStep > 2 ? 'opacity-30' : 'opacity-10'}`}>
                  <div className={`p-4 rounded-[1.5rem] ${activeStep === 2 ? 'bg-rose-500 text-white shadow-[inset_0_-4px_8px_rgba(0,0,0,0.4)] animate-[bounce_0.5s_infinite]' : 'bg-slate-800 text-slate-500'}`}>
                    <Cpu className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-200 tracking-wide lowercase text-xl">2. raw acoustic extraction</h4>
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-1 rounded inline-block mt-1">DANGER: Float32Array Max CPU Load</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className={`${SOFT_PILL} ${activeStep === 3 ? 'scale-105 border-amber-500 bg-[#362512] shadow-[0_10px_40px_rgba(245,158,11,0.3)]' : activeStep > 3 ? 'opacity-30' : 'opacity-10'}`}>
                  <div className={`p-4 rounded-[1.5rem] ${activeStep === 3 ? 'bg-amber-500 text-black shadow-[inset_0_-4px_8px_rgba(0,0,0,0.4)] animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                    <Radio className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-200 tracking-wide lowercase text-xl">3. load onnx graph</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">transformers.js weights</p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className={`${SOFT_PILL} ${activeStep === 4 ? 'scale-105 border-lime-400 bg-[#223616] shadow-[0_10px_40px_rgba(163,230,53,0.3)]' : activeStep > 4 ? 'opacity-30' : 'opacity-10'}`}>
                  <div className={`p-4 rounded-[1.5rem] ${activeStep === 4 ? 'bg-lime-400 text-lime-950 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.4)] animate-[spin_2s_linear_infinite]' : 'bg-slate-800 text-slate-500'}`}>
                    <AlignLeft className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-200 tracking-wide lowercase text-xl">4. active transcribing</h4>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">crunching matrix into text</p>
                  </div>
                </div>
              </div>

              {/* Status Footer Log */}
              <div className="mt-12 bg-black/80 text-cyan-400 p-6 rounded-[2rem] text-center shadow-[inset_0_4px_20px_rgba(0,0,0,1)] border border-slate-800 mx-auto w-full backdrop-blur-3xl overflow-hidden relative">
                <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(34,211,238,0.1),transparent)] animate-[scan_2s_ease-in-out_infinite]" />
                <span className="font-mono text-xs md:text-sm uppercase tracking-[0.3em] font-black z-10 relative">
                  &gt; {statusText || 'INITIALIZING SYSTEMS...'} _
                </span>
              </div>
            </div>
          </div>
        )}

        {/* State C: Error */}
        {status === 'error' && (
          <div className={`${TACTILE_BOX} p-16 text-center`}>
            <div className="bg-rose-500 text-white w-40 h-40 mx-auto rounded-[4rem] shadow-[inset_0_-10px_30px_rgba(0,0,0,0.5),0_0_80px_rgba(244,63,94,0.6)] flex items-center justify-center mb-10 rotate-12 hover:rotate-0 transition-transform">
              <Skull className="h-20 w-20" strokeWidth={2.5} />
            </div>
            <h2 className="text-6xl font-black lowercase tracking-tighter text-rose-500 mb-6 drop-shadow-[0_0_20px_rgba(244,63,94,0.5)]">critical failure.</h2>
            <p className="bg-black/80 text-rose-300 px-8 py-6 rounded-3xl font-mono text-sm max-w-2xl mx-auto mb-16 border border-rose-900 shadow-inner overflow-hidden text-left">
              <span className="text-rose-600 block mb-2">FATAL ERROR LOG:</span>
              {statusText}
            </p>
            <button 
              onClick={resetState}
              onMouseEnter={() => setHoverQuote('「再來一次？人類還真是不懂放棄啊...」')}
              onMouseLeave={() => setHoverQuote('')}
              className={`${CLAY_BUTTON} px-12 py-6 text-xl bg-white text-slate-950 flex items-center gap-4 mx-auto`}
            >
              <RefreshCw className="h-8 w-8" strokeWidth={3} /> reboot system
            </button>
          </div>
        )}

        {/* State D: Completed */}
        {status === 'completed' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-12 duration-700">
            <div className={`${TACTILE_BOX} p-8 md:p-14`}>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 border-b-2 border-slate-800 pb-10">
                <div>
                  <h2 className="text-6xl font-black lowercase tracking-tighter text-white flex items-center gap-6 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                    <span className="bg-lime-400 text-lime-950 p-4 rounded-[2rem] shadow-[inset_0_-8px_16px_rgba(0,0,0,0.5),0_10px_40px_rgba(163,230,53,0.4)] rotate-[6deg]">
                      <CheckCircle2 className="h-12 w-12" strokeWidth={3} />
                    </span>
                    done.
                  </h2>
                  <p className="text-slate-400 mt-6 font-bold lowercase tracking-widest text-sm bg-black/60 px-6 py-3 rounded-full border border-slate-800 w-fit">
                    {file?.name}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <button 
                    onClick={resetState}
                    onMouseEnter={() => setHoverQuote('「又要上傳新的？放過我好嗎？」')}
                    onMouseLeave={() => setHoverQuote('')}
                    className={`${CLAY_BUTTON} px-10 py-5 bg-black/50 text-slate-300 hover:bg-slate-800 hover:text-white text-sm border-slate-800 backdrop-blur-md`}
                  >
                    new file
                  </button>
                  <button 
                    onClick={handleExport}
                    onMouseEnter={() => setHoverQuote('「給我下載！這可是我嘔心瀝血聽出來的！」')}
                    onMouseLeave={() => setHoverQuote('')}
                    className={`${CLAY_BUTTON} px-10 py-5 bg-cyan-400 text-cyan-950 flex items-center justify-center gap-3 text-sm shadow-[0_10px_40px_rgba(34,211,238,0.4)] hover:bg-cyan-300 group`}
                  >
                    <FileDown className="h-6 w-6 stroke-[3] group-hover:translate-y-1 transition-transform" /> save `.md`
                  </button>
                </div>
              </div>
              
              <div className="bg-black/70 rounded-[3rem] p-8 md:p-10 border border-slate-800 shadow-[inset_0_20px_50px_rgba(0,0,0,1)] relative">
                <div className="absolute top-0 right-0 p-8 z-10">
                  <span className="text-xs font-black text-lime-950 bg-lime-400 px-6 py-3 rounded-full shadow-[0_0_30px_rgba(163,230,53,0.5)] uppercase tracking-widest">
                    success mission
                  </span>
                </div>
                <h3 className="text-sm font-black text-fuchsia-500 uppercase tracking-[0.3em] mb-8 pl-4 flex items-center gap-3">
                  <AlignLeft className="w-5 h-5" />
                  Raw Output Node
                </h3>
                <textarea 
                  readOnly
                  className="w-full h-[500px] font-mono p-10 bg-black/40 border border-slate-800/50 rounded-[2.5rem] text-[13px] leading-loose text-slate-300 focus:outline-none shadow-[inset_0_5px_20px_rgba(0,0,0,0.8)] resize-none custom-scrollbar" 
                  value={generateMarkdownPreview()} 
                />
              </div>

            </div>
          </div>
        )}
      </main>

      {/* Floating Pessimistic Companion (天竺鼠車車羊毛氈風 章魚星人) */}
      <div 
        className="fixed top-0 left-0 pointer-events-none z-50 transition-all duration-[800ms] ease-out flex flex-col items-center drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)] mix-blend-normal"
        style={{ transform: `translate(${mascotPos.x + 30}px, ${mascotPos.y + 30}px) rotate(${targetTilt}deg)` }}
      >
        {/* The generated green-background felt octopus, cropped beautifully using a circle mask and heavy borders */}
        <div className="w-32 h-32 md:w-44 md:h-44 rounded-full overflow-hidden border-[6px] border-[#0a0f1a] shadow-[0_0_60px_rgba(217,70,239,0.5)] bg-[#00FF00]">
          <img 
            src="/mascot.png" 
            alt="Pessimistic Space Octopus Buddy" 
            className="w-[124%] h-[124%] -ml-[12%] -mt-[12%] object-cover animate-[bounce_2.5s_ease-in-out_infinite]" 
          />
        </div>
        
        {/* Dynamic Speech Bubble based on Status and Hover */}
        <div className="mt-6 bg-white/10 backdrop-blur-2xl px-6 py-4 rounded-3xl border-2 border-fuchsia-500/30 text-sm md:text-base font-black text-fuchsia-300 shadow-[0_20px_50px_rgba(0,0,0,0.8)] opacity-100 transition-opacity whitespace-nowrap" style={{ transform: `rotate(${-targetTilt * 0.5}deg)` }}>
          {getMascotSpeech()}
        </div>
      </div>

      {/* Extreme JoJo Bizarre Adventure Overlay Effect */}
      {showJojo && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex flex-col items-center justify-center overflow-hidden">
          
          {/* Intense CSS Comic Speedlines */}
          <div className="absolute inset-0 opacity-80 mix-blend-screen" 
               style={{ 
                 background: 'repeating-conic-gradient(from 0deg, rgba(255,255,255,0) 0deg 3deg, rgba(255,255,255,1) 3deg 5deg, rgba(255,255,255,0) 5deg 8deg)',
                 animation: 'spin 0.5s linear infinite',
                 maskImage: 'radial-gradient(circle, transparent 15%, black 90%)'
               }} 
          />
          <div className="absolute inset-0 opacity-90 mix-blend-color-dodge bg-gradient-to-t from-rose-600/50 via-transparent to-fuchsia-600/50 animate-pulse" />
          
          {/* Onomatopoeia 1 */}
          <div className="absolute top-[5%] left-[-10%] md:left-[2%] text-8xl md:text-[12rem] font-black text-rose-500 opacity-100 rotate-[-15deg] drop-shadow-[10px_10px_0_rgba(255,255,255,1)] animate-in slide-in-from-left-40 duration-200">
            ゴゴゴゴゴ...
          </div>
          
          {/* Onomatopoeia 2 */}
          <div className="absolute bottom-[5%] right-[-10%] md:right-[2%] text-8xl md:text-[12rem] font-black text-cyan-400 opacity-100 rotate-[10deg] drop-shadow-[10px_10px_0_rgba(255,255,255,1)] animate-in slide-in-from-right-40 duration-200 delay-75">
             ドドドドド!!
          </div>

          {/* Epic Manga Quote Box */}
          <div className="relative z-10 bg-black border-[12px] border-white p-10 md:p-20 max-w-[95%] md:max-w-5xl text-center transform shadow-[30px_30px_0_rgba(217,70,239,1)] animate-in zoom-in spin-in-6 duration-[250ms] rotate-[-3deg]">
            {/* Action Flash lines on the box */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiAvPgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLXdpZHRoPSIwLjUiIG9wYWNpdHk9IjAuMSIgLz4KPC9zdmc+')] opacity-50 pointer-events-none mix-blend-screen" />
            
            <h2 className="text-4xl md:text-7xl font-black text-white leading-tight tracking-tighter" style={{ fontFamily: '"Noto Serif TC", serif' }}>
              「{currentQuote}」
            </h2>
          </div>

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes shake {
              0% { transform: translate(10px, 10px) rotate(0deg); }
              20% { transform: translate(-10px, 0px) rotate(2deg); }
              40% { transform: translate(10px, -10px) rotate(-1deg); }
              60% { transform: translate(-10px, 10px) rotate(0deg); }
              80% { transform: translate(-10px, -10px) rotate(1deg); }
              100% { transform: translate(10px, -10px) rotate(-2deg); }
            }
            @keyframes spin {
              100% { transform: rotate(360deg); }
            }
            @keyframes scan {
              0% { transform: translateY(-100%); }
              100% { transform: translateY(100%); }
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 12px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: rgba(0,0,0,0.5);
              border-radius: 20px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(217,70,239,0.5);
              border-radius: 20px;
            }
          `}} />
        </div>
      )}
    </div>
  );
}
