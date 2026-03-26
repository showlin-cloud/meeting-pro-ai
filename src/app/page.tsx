'use client';

import React, { useState, useRef, DragEvent, useEffect } from 'react';
import FigmaContextAwareConsultant, { FigmaIntentParameters } from '@/components/FigmaContextAwareConsultant';
import MindMapPreview from '@/components/MindMapPreview';
import { 
  FileDown, RefreshCw, CheckCircle2, AudioWaveform, Zap, Flame, Stars
} from 'lucide-react';

export default function MeetingProDashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'consulting' | 'summarizing' | 'done'>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [mindmapCode, setMindmapCode] = useState<string>('');

  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [activeStep, setActiveStep] = useState(0); 
  const [isDragging, setIsDragging] = useState(false);
  
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mascotPos, setMascotPos] = useState({ x: 0, y: 0 });
  const [targetTilt, setTargetTilt] = useState(0);
  const [showJojo, setShowJojo] = useState(false);
  const [currentQuote, setCurrentQuote] = useState("");
  const [hoverQuote, setHoverQuote] = useState("");
  
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const stopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const jojoUploadQuotes = [
    "又要開會？這種無馱無馱無馱的會議，交給我的替身！",
    "老總... 你的敗因只有一個，叫我聽這長達 3 小時的廢話。",
    "我從短暫的社畜人生中學到一件事... 我不聽錄音檔啦！",
    "這就是我替身的能力。你剛開了三小時的會，我一秒就看透。",
    "我只想要平靜的下班生活... 碰上長音檔，我也絕不退縮！",
    "「世界」啊！停止這無意義的時間吧！由我來終結這段錄音！"
  ];

  useEffect(() => {
    setMascotPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    lastMousePosRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 800;
      const y = (e.clientY / window.innerHeight - 0.5) * 800;
      setMousePos({ x, y });
      
      const dx = e.clientX - lastMousePosRef.current.x;
      const tilt = Math.max(-50, Math.min(50, dx * 2)); 
      setTargetTilt(tilt);

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
    };
  }, []);

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

  const startProcessing = (targetFile: File) => {
    triggerJojoEffect(); 
    setStatus('processing');
    setProgress(0);
    setActiveStep(1);
    setStatusText('啟動量子矩陣... FFMPEG.WASM 疊加態加壓中...');
    
    // Simulate processing over time
    let simulatedProgress = 0;
    const interval = setInterval(() => {
      simulatedProgress += 5;
      setProgress(simulatedProgress);
      if (simulatedProgress === 35) {
        setActiveStep(3);
        setStatusText('警告：核心瘋狂解析中！Float32Array 正在燃燒你的 CPU 靈魂！ 🔥');
      } else if (simulatedProgress === 75) {
        setActiveStep(4);
        setStatusText('『替身：SILENT PRODUCER』完全顯現！開展領域：真實之言！');
      }
      
      if (simulatedProgress >= 100) {
        clearInterval(interval);
        setTranscript("レオ：Wireframe 上的登入按鈕是不是要加大？\nサラ：對，那個設計點 (Comment #132) 客戶說不夠明顯。\nレオ：好，修改成藍色大按鈕。");
        setStatus('consulting');
        setStatusText('完全理解。所有秘密皆在此顯現。 🍒');
      }
    }, 150);
  };

  const handleConsultComplete = (intent: FigmaIntentParameters) => {
    console.log('接收到分析意圖參數: ', intent);
    setStatus('summarizing');
    setStatusText('啟動超頻運算，動態生成 80/20 會議報告與心智圖...');
    
    // Simulate generation APIs
    setTimeout(() => {
      setSummary(`### 會議基本資訊表
- 日期：2026-03-26
- 主要參與者：Leo, Sara

### 🔴 Figma 回饋項目討論 (Wireframe)
| Comment 編號 | 原始假設               | 修改共識                 |
|--------------|------------------------|--------------------------|
| #132         | 登入按鈕為正常大小尺寸 | 變更為藍色，並加寬加高按鈕|

### 待確認事項追蹤
- 【已確認事項】登入按鈕尺寸、顏色修改
- 【後續追蹤事項】🔴高：與前端確認藍色按鈕套用範圍的色碼規範 (Sara)`);
      
      setMindmapCode(`graph TD\n  A[網頁首頁設計] --> B(登入介面討論)\n  B --> C[登入按鈕]\n  C -->|Comment #132| D{修改為藍色大按鈕}\n  D --> E(交付前端)`);
      setStatus('done');
      setStatusText('神經網絡統整完成。這是你的黃金紀錄。');
    }, 3000);
  };

  const resetState = () => {
    setStatus('idle');
    setFile(null);
    setProgress(0);
    setStatusText('');
    setActiveStep(0);
  };

  // Dark Y2K Style Constants
  const TACTILE_BOX = "bg-[#0b101a]/85 backdrop-blur-3xl border border-fuchsia-500/20 shadow-[0_0_80px_rgba(255,0,255,0.1),inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-[3rem]";
  const CLAY_BUTTON = "rounded-full font-black tracking-widest uppercase transition-all duration-300 hover:scale-[1.1] active:scale-90 shadow-[0_0_30px_rgba(217,70,239,0.4)] border-2 border-slate-700 hover:border-fuchsia-400";

  const getMascotSpeech = () => {
    if (hoverQuote) return hoverQuote;
    if (status === 'idle') return "「這種波紋... 是開會的前兆嗎？！」 🌍";
    if (status === 'processing') return "「歐拉歐拉歐拉！大腦運算注入中！」";
    if (status === 'consulting') return "「Figma 空間震盪中！請設定你的意圖...」";
    if (status === 'summarizing') return "「貧弱貧弱！讓人工智慧把無聊對話變成黃金摘要！」 💥";
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
        <h1 className="text-6xl md:text-8xl font-black lowercase tracking-tighter text-white flex flex-col md:flex-row items-center justify-center gap-6">
          <span className="bg-fuchsia-600 text-white p-6 rounded-[2.5rem] shadow-[inset_0_-8px_16px_rgba(0,0,0,0.5),0_10px_60px_rgba(217,70,239,0.6)] rotate-[-8deg] hover:rotate-12 transition-transform duration-300 flex-shrink-0">
            <Zap className="h-16 w-12 fill-white" />
          </span>
          <span className="leading-none">meeting AI<br/><span className="text-3xl tracking-widest text-fuchsia-400">overdrive</span></span>
        </h1>
        <p className="text-cyan-300 font-black tracking-[0.4em] text-sm md:text-xl uppercase mt-4 bg-black/60 px-12 py-4 rounded-full border-4 border-cyan-400/50 shadow-[0_0_40px_rgba(34,211,238,0.4)] backdrop-blur-xl animate-pulse">
          neural insight ⚡ jojo stance
        </p>
      </header>
      
      <main className="max-w-4xl mx-auto relative z-10 flex flex-col gap-10">
        
        {/* Status Header Log (Visible in processing, consulting, summarizing, done) */}
        {status !== 'idle' && (
          <div className="bg-black/90 text-lime-400 p-8 rounded-[2.5rem] shadow-[inset_0_4px_30px_rgba(0,0,0,1)] border-2 border-white/5 overflow-hidden text-center relative w-full">
            <div className="absolute inset-0 bg-[linear-gradient(transparent,rgba(163,230,53,0.1),transparent)] animate-[scan_1.5s_ease-in-out_infinite]" />
            <span className="font-mono text-sm md:text-xl uppercase tracking-[0.4em] font-black z-10 relative">
               &gt; {statusText} _
            </span>
          </div>
        )}

        {/* State A: Idle Dropzone */}
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
              ${TACTILE_BOX} p-16 md:p-32 border-4 mx-auto w-full max-w-3xl
              ${isDragging ? 'scale-[1.05] shadow-[0_0_120px_rgba(217,70,239,0.8)] border-fuchsia-400 bg-slate-900/90' : 'hover:scale-[1.02] border-fuchsia-500/30'}
            `}
          >
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="video/*,audio/*" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="relative mb-12">
                 <div className="absolute inset-0 bg-fuchsia-500 blur-3xl opacity-30 animate-pulse" />
                 <img 
                    src="/jojo-icon.png" 
                    alt="Dancing JoJo" 
                    className={`w-48 h-48 md:w-64 md:h-64 object-contain transition-all duration-500 relative z-10 drop-shadow-[0_0_40px_rgba(255,255,255,0.5)] 
                    ${isDragging ? 'animate-[jojo-spin_0.5s_linear_infinite] scale-125' : 'animate-[jojo-dance_3s_ease-in-out_infinite]'}`} 
                 />
              </div>
              
              <h3 className="text-4xl md:text-6xl font-black lowercase tracking-tighter text-white mb-8 bg-black/40 px-8 py-4 rounded-3xl border border-white/10">
                stand activation.
              </h3>
              <p className="text-slate-300 font-bold text-sm md:text-lg max-w-xl mx-auto leading-relaxed mb-12 lowercase tracking-widest bg-fuchsia-950/40 p-10 rounded-[3rem] border-2 border-fuchsia-500/20 shadow-inner">
                這不是普通的開會，這是替身的對決！將錄影或錄音檔投入黑暗深淵，『SILENT PRODUCER』將洞悉一切核心邏輯與 Figma 意圖。
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
                <h2 className="text-5xl md:text-6xl font-black lowercase tracking-tighter text-white animate-pulse">overdrive...</h2>
                <p className="text-cyan-400 font-black mt-4 lowercase tracking-[0.2em] text-sm bg-black/60 px-6 py-4 rounded-2xl border-2 border-cyan-500/30 flex items-center gap-4">
                  <AudioWaveform className="w-6 h-6 animate-[bounce_0.8s_infinite]" /> {file?.name}
                </p>
              </div>
              <div className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-400 to-fuchsia-500 tabular-nums tracking-tighter drop-shadow-[0_0_30px_rgba(217,70,239,0.5)]">
                {progress}<span className="text-4xl text-slate-500">%</span>
              </div>
            </div>

            {/* Mega Progress Bar */}
            <div className="h-16 w-full bg-black/80 border-4 border-slate-700 shadow-[inset_0_10px_30px_rgba(0,0,0,1)] rounded-[2rem] overflow-hidden mb-8 p-2 backdrop-blur-3xl">
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 via-fuchsia-600 to-lime-400 rounded-2xl transition-all duration-300 ease-out shadow-[0_0_40px_rgba(217,70,239,1)] relative overflow-hidden"
                style={{ width: `${Math.max(3, progress)}%` }}
              >
                 <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:4rem_4rem] animate-[progress-stripe_1.5s_linear_infinite]" />
              </div>
            </div>
          </div>
        )}

        {/* State C: Consulting Figma Intent */}
        {status === 'consulting' && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 flex justify-center w-full">
            <FigmaContextAwareConsultant onComplete={handleConsultComplete} />
          </div>
        )}

        {/* State D: Summarizing / Generating AI Report */}
        {status === 'summarizing' && (
          <div className={`${TACTILE_BOX} p-12 flex flex-col items-center gap-10 animate-pulse border-4 border-fuchsia-500/50`}>
            <div className="text-8xl animate-bounce drop-shadow-[0_0_50px_rgba(217,70,239,0.8)] filter hue-rotate-180">🤖</div>
            <div className="text-center">
              <p className="text-white font-black text-4xl mb-4 lowercase tracking-tighter drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">DynamicPromptEngine Synthesis</p>
              <p className="text-fuchsia-300 font-mono text-lg lowercase tracking-widest bg-black/60 px-6 py-3 rounded-full border border-fuchsia-500/30">
                正在根據 80/20 規則建構 Prompt、對齊 Figma Id，並生成 Mermaid 術法 ...
              </p>
            </div>
            {/* Spinning Mandala */}
            <div className="relative w-32 h-32 flex justify-center items-center">
               <div className="absolute inset-0 border-8 border-transparent border-t-fuchsia-500 border-b-cyan-400 rounded-full animate-spin shadow-lg" />
               <div className="absolute inset-4 border-8 border-transparent border-l-lime-400 border-r-fuchsia-300 rounded-full animate-[spin_1.5s_linear_infinite_reverse] shadow-lg" />
               <Stars className="w-10 h-10 text-white animate-pulse" />
            </div>
          </div>
        )}

        {/* State E: DONE */}
        {status === 'done' && (
          <div className="w-full space-y-12 animate-in fade-in zoom-in-95 duration-500 pb-20">
            {/* Summary Block */}
            <div className={`${TACTILE_BOX} overflow-hidden border-2 border-cyan-500/30`}>
              <div className="bg-gradient-to-r from-cyan-900 via-cyan-950 to-black px-8 py-6 border-b-2 border-cyan-500/30">
                <h2 className="text-2xl md:text-3xl font-black text-cyan-50 flex items-center gap-3 lowercase tracking-tighter">
                  <CheckCircle2 className="text-cyan-400" /> 智能會議紀錄 (Markdown 轉譯)
                </h2>
              </div>
              <div className="p-8 md:p-12 pb-16">
                <pre className="whitespace-pre-wrap font-mono text-cyan-100/90 leading-relaxed text-sm md:text-base border-l-4 border-cyan-500/50 pl-6 bg-black/40 p-6 rounded-r-2xl shadow-inner break-words w-full overflow-x-auto custom-scrollbar">
                  {summary}
                </pre>
              </div>
            </div>
            
            {/* MindMap Block */}
            <div className={`${TACTILE_BOX} overflow-hidden border-2 border-fuchsia-500/30`}>
              <div className="bg-gradient-to-r from-fuchsia-900 via-fuchsia-950 to-black px-8 py-6 border-b-2 border-fuchsia-500/30">
                <h2 className="text-2xl md:text-3xl font-black text-fuchsia-50 flex items-center gap-3 lowercase tracking-tighter">
                  <Stars className="text-fuchsia-400" /> 動態會議心智圖 (Mermaid 術法陣)
                </h2>
              </div>
              <div className="p-8 md:p-12 pb-16">
                <MindMapPreview code={mindmapCode} />
              </div>
            </div>

            <div className="flex justify-center mt-12 mb-20">
              <button 
                onClick={resetState}
                className={`${CLAY_BUTTON} px-14 py-8 bg-black/80 text-white flex items-center gap-6 text-xl shadow-[0_0_40px_rgba(217,70,239,0.5)] bg-gradient-to-r from-fuchsia-600/20 to-cyan-600/20 max-w-sm w-full font-black mx-auto block w-max`}
              >
                <RefreshCw className="h-8 w-8" strokeWidth={3} /> Return to Zero
              </button>
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

      {/* Footer Info / Neural Readiness (Simulated) */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6">
        <div className="flex items-center gap-3 px-6 py-3 rounded-full border-2 transition-all duration-500 backdrop-blur-xl bg-lime-500/20 border-lime-400 text-lime-300 shadow-[0_0_30px_rgba(163,230,53,0.3)]">
          <div className="w-3 h-3 rounded-full bg-lime-400 shadow-[0_0_10px_rgba(163,230,53,1)]" />
          <span className="text-xs md:text-sm font-black uppercase tracking-widest leading-none">
            Neural Stand: Ready
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
        .custom-scrollbar::-webkit-scrollbar { width: 12px; height: 12px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.5); border-radius: 12px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: linear-gradient(to bottom, #d946ef, #22d3ee); border-radius: 12px; border: 2px solid transparent; background-clip: padding-box; }
        .custom-scrollbar::-webkit-scrollbar-corner { background: transparent; }
      `}} />
    </div>
  );
}
