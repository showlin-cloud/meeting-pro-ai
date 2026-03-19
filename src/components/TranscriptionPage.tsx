'use client';

import React, { useState, useRef, DragEvent } from 'react';
import { localAudioProcessor } from '@/lib/localAudioProcessor';
import { LocalWhisperEngine, decodeAudioBlobToFloat32Array } from '@/lib/localWhisperEngine';
import { exportToMarkdown, TranscriptSegment } from '@/lib/exportToMarkdown';
import { 
  FileDown, BrainCircuit, UploadCloud, Settings, AlertCircle, RefreshCw, CheckCircle2,
  HardDrive, Cpu, Radio, AlignLeft, Sparkles, AudioWaveform
} from 'lucide-react';

export default function TranscriptionPage() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [activeStep, setActiveStep] = useState(0); // 0: none, 1: ffmpeg, 2: decode, 3: model, 4: inference
  const [isDragging, setIsDragging] = useState(false);
  
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<any>(null);

  // 處理拖曳事件
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      startProcessing(droppedFile);
    }
  };

  const handleFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      startProcessing(selectedFile);
    }
  };

  // 核心處理邏輯
  const startProcessing = async (targetFile: File) => {
    try {
      setStatus('processing');
      setProgress(0);
      setSegments([]);
      
      // Step 1: FFmpeg
      setActiveStep(1);
      setStatusText('FFmpeg 正在提取音軌... (大檔處理需時，請耐心等候)');
      const audioBlob = await localAudioProcessor(targetFile, (ratio) => {
        setProgress(Math.round(ratio * 30));
      });

      // Step 2: Audio Decoding (This causes the 32% freeze!)
      setActiveStep(2);
      setProgress(32);
      setStatusText('音訊提取完畢！正在將音訊轉換為 WebAudio 記憶體陣列... (這可能會停滯數十秒，系統並未當機喔！)');
      
      // Give UI a moment to render the statusText before doing the heavy un-yielding decoding
      await new Promise(resolve => setTimeout(resolve, 500));
      const audioData = await decodeAudioBlobToFloat32Array(audioBlob);

      // Step 3: Model Loading
      setActiveStep(3);
      setStatusText('啟動 Web Worker 並加載 AI 模型 (Whisper Tiny)...');
      setProgress(35);

      const engine = new LocalWhisperEngine((event) => {
        if (event.type === 'model_progress') {
          setActiveStep(3);
          const modelP = event.progress || 0;
          setProgress(35 + Math.round((modelP / 100) * 15));
          
          if (event.status === 'initiate') {
            setStatusText(`準備連線並下載模型: ${event.file || ''}...`);
          } else if (event.status === 'progress') {
            setStatusText(`下載神經網路權重 (${event.file || ''}): ${Math.round(modelP)}%`);
          } else if (event.status === 'ready') {
            setStatusText(`模型 ${event.file || ''} 加載完成`);
          } else {
            setStatusText(`載入模型中... ${Math.round(modelP)}%`);
          }
        } else if (event.type === 'ready') {
          setActiveStep(4);
          setStatusText('模型加載完畢！開始進行高能文字轉譯...');
          engine.transcribe(audioData);
        } else if (event.type === 'chunk_update') {
          setProgress((prev) => (prev < 98 ? prev + 1 : prev));
          setStatusText('正在解析語意結構...');
          
          if (event.output && Array.isArray(event.output)) {
            const mappedSegments = event.output.map((o: any) => ({
              timestamp: o.timestamp ? `${o.timestamp[0]} - ${o.timestamp[1] || '...'}` : '未知',
              speaker: 'Speaker 1',
              text: o.text
            }));
            setSegments(mappedSegments);
          }
        } else if (event.type === 'complete') {
          if (event.result && event.result.chunks) {
            const finalSegments = event.result.chunks.map((chunk: any) => ({
              timestamp: chunk.timestamp ? `${chunk.timestamp[0]} - ${chunk.timestamp[1] || 'end'}` : '未知',
              speaker: 'Speaker 1',
              text: chunk.text
            }));
            setSegments(finalSegments);
          } else if (event.result && event.result.text) {
             setSegments([{ timestamp: '0.00-End', speaker: 'Speaker 1', text: event.result.text }]);
          }
          setProgress(100);
          setStatusText('轉譯成就達成！');
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
      setStatusText(err.message || '發生未知錯誤');
    }
  };

  const handleExport = () => {
    exportToMarkdown(segments, `Meeting_${file?.name || 'Transcript'}.md`);
  };

  const resetState = () => {
    setStatus('idle');
    setFile(null);
    setSegments([]);
    setProgress(0);
    setStatusText('');
    setActiveStep(0);
  };

  const generateMarkdownPreview = () => {
    if (segments.length === 0) return '尚未有轉譯結果...';
    let mdContent = '| 時間戳 | 講者 | 對話內容 |\n';
    mdContent += '| --- | --- | --- |\n';
    segments.forEach((seg) => {
      const safeText = seg.text.replace(/\\|/g, '&#124;').replace(/\n/g, '<br>');
      mdContent += `| ${seg.timestamp} | ${seg.speaker || '未知'} | ${safeText} |\n`;
    });
    return mdContent;
  };

  return (
    <div className="w-full min-h-screen bg-zinc-50 font-sans text-zinc-900 pt-16 pb-24 px-6 md:px-12 selection:bg-indigo-200">
      
      {/* Header (Typography Focus) */}
      <header className="max-w-4xl mx-auto mb-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 flex items-center gap-4">
            <span className="bg-zinc-900 text-white p-3 rounded-2xl shadow-xl shadow-zinc-900/20">
              <Sparkles className="h-8 w-8" />
            </span>
            Transcribe_AI.
          </h1>
          <p className="text-zinc-500 mt-3 font-medium tracking-tight text-lg max-w-lg">
            A fully local, zero-cost, privacy-first transcription engine built on Transformers.js and FFmpeg.wasm.
          </p>
        </div>
        
        <div className="flex bg-white/60 backdrop-blur-md text-zinc-700 px-5 py-2.5 rounded-full text-sm font-bold items-center gap-2 border border-zinc-200/50 shadow-sm transition-all hover:bg-white hover:shadow-md cursor-default">
          <Settings className="w-4 h-4 text-indigo-500" /> 本機晶片推論模式
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto relative">
        {/* State A: Idle (Drag & Drop Focus) */}
        {status === 'idle' && (
          <div 
            onClick={handleFileClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative overflow-hidden group bg-white border-2 border-dashed rounded-[2rem] p-16 md:p-32 text-center cursor-pointer transition-all duration-500 shadow-sm
              ${isDragging ? 'border-indigo-500 bg-indigo-50/30 scale-[1.02] shadow-2xl shadow-indigo-500/10' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50 hover:shadow-xl'}
            `}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/*,audio/*"
            />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className={`p-6 rounded-full mb-8 transition-transform duration-500 ${isDragging ? 'bg-indigo-600 scale-110 shadow-lg shadow-indigo-600/30' : 'bg-zinc-100 group-hover:bg-zinc-900 group-hover:scale-105'}`}>
                <BrainCircuit className={`h-12 w-12 transition-colors duration-500 ${isDragging ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`} />
              </div>
              
              <h3 className="text-3xl font-extrabold tracking-tight text-zinc-900 mb-4 transition-colors">
                Drop your file to ignite the engine
              </h3>
              <p className="text-zinc-500 font-medium max-w-md mx-auto leading-relaxed mb-10">
                自動支援 20GB 以下影片或音軌。我們將在您的本地裝置透過 WASM 壓縮並進行神經網路語音辨識。
              </p>
              
              <div className="inline-flex items-center gap-2 bg-zinc-900 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg shadow-zinc-900/20 group-hover:bg-indigo-600 transition-colors duration-300">
                <UploadCloud className="w-5 h-5" /> 點擊選取檔案
              </div>
            </div>
          </div>
        )}

        {/* State B: Processing (Interactive Progress Tracking) */}
        {status === 'processing' && (
          <div className="bg-white border border-zinc-200/60 shadow-2xl shadow-zinc-200/50 rounded-[2rem] p-10 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-100">
              <div className="h-full bg-indigo-600 transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900">引擎運轉中</h2>
                <p className="text-zinc-500 mt-2 font-medium flex items-center gap-2">
                  <AudioWaveform className="w-4 h-4 text-indigo-500 animate-pulse" /> {file?.name}
                </p>
              </div>
              <div className="text-5xl font-black text-zinc-200 tabular-nums tracking-tighter">
                {progress}%
              </div>
            </div>

            {/* Stepper tracking */}
            <div className="space-y-6 max-w-2xl">
              <div className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${activeStep === 1 ? 'bg-indigo-50 border border-indigo-100 shadow-inner' : activeStep > 1 ? 'opacity-50' : 'opacity-30'}`}>
                <div className={`p-3 rounded-full ${activeStep === 1 ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-zinc-100 text-zinc-500'}`}>
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900">1. FFmpeg 音軌抽出</h4>
                  <p className="text-sm font-medium text-zinc-500">將原生檔案串流掛載至 WebAssembly 環境</p>
                </div>
              </div>

              <div className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${activeStep === 2 ? 'bg-amber-50 border border-amber-100 shadow-inner' : activeStep > 2 ? 'opacity-50' : 'opacity-30'}`}>
                <div className={`p-3 rounded-full ${activeStep === 2 ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 animate-pulse' : 'bg-zinc-100 text-zinc-500'}`}>
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900">2. WebAudio 陣列解碼</h4>
                  <p className="text-sm font-medium text-zinc-500">轉換為 16kHz Float32Array (可能停滯 10~30 秒)</p>
                </div>
              </div>

              <div className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${activeStep === 3 ? 'bg-purple-50 border border-purple-100 shadow-inner' : activeStep > 3 ? 'opacity-50' : 'opacity-30'}`}>
                <div className={`p-3 rounded-full ${activeStep === 3 ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30' : 'bg-zinc-100 text-zinc-500'}`}>
                  <Radio className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900">3. AI 神經網絡就緒</h4>
                  <p className="text-sm font-medium text-zinc-500">載入 Whisper 權重模型</p>
                </div>
              </div>

              <div className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-500 ${activeStep === 4 ? 'bg-emerald-50 border border-emerald-100 shadow-inner' : activeStep > 4 ? 'opacity-50' : 'opacity-30'}`}>
                <div className={`p-3 rounded-full ${activeStep === 4 ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 animate-[spin_3s_linear_infinite]' : 'bg-zinc-100 text-zinc-500'}`}>
                  <AlignLeft className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900">4. 語意解析推論中</h4>
                  <p className="text-sm font-medium text-zinc-500">正在執行轉譯程序...</p>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-zinc-100 flex justify-between items-center">
              <span className="text-sm font-bold text-zinc-500 animate-pulse">{statusText}</span>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* State C: Error */}
        {status === 'error' && (
          <div className="bg-white border border-red-200 shadow-2xl shadow-red-500/10 rounded-[2rem] p-16 text-center">
            <div className="bg-red-50 text-red-600 w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-8">
              <AlertCircle className="h-12 w-12" />
            </div>
            <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight mb-4">系統過載或發生錯誤</h2>
            <p className="bg-red-50 text-red-700 px-6 py-4 rounded-2xl font-mono text-sm max-w-xl mx-auto mb-10 border border-red-100">
              {statusText}
            </p>
            <button 
              onClick={resetState}
              className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 mx-auto shadow-xl shadow-zinc-900/20"
            >
              <RefreshCw className="h-5 w-5" /> 重啟引擎
            </button>
          </div>
        )}

        {/* State D: Completed */}
        {status === 'completed' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white border border-zinc-200/60 shadow-2xl shadow-zinc-200/50 rounded-[2rem] p-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-10 border-b border-zinc-100">
                <div>
                  <h2 className="text-3xl font-extrabold text-zinc-900 flex items-center gap-3 tracking-tight">
                    <CheckCircle2 className="text-emerald-500 h-10 w-10" />
                    解析成就達成
                  </h2>
                  <p className="text-zinc-500 mt-2 font-medium">{file?.name}</p>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                  <button 
                    onClick={resetState}
                    className="flex-1 md:flex-none px-6 py-3.5 border-2 border-zinc-200 text-zinc-700 font-bold rounded-2xl hover:bg-zinc-50 hover:border-zinc-300 transition-all"
                  >
                    處理新檔案
                  </button>
                  <button 
                    onClick={handleExport}
                    className="flex-1 md:flex-none px-6 py-3.5 bg-zinc-900 text-white font-bold rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-zinc-900/20 active:scale-95 group"
                  >
                    <FileDown className="h-5 w-5 group-hover:translate-y-1 transition-transform" /> 下載 Markdown
                  </button>
                </div>
              </div>
              
              <div className="bg-zinc-50 rounded-2xl p-6 md:p-8 border border-zinc-200/60 shadow-inner overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4">
                  <span className="text-xs font-black text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-full border border-emerald-200/50 uppercase tracking-widest shadow-sm">
                    Success
                  </span>
                </div>
                <h3 className="text-sm font-black text-zinc-400 uppercase tracking-widest mb-4">Transcript Preview</h3>
                <textarea 
                  readOnly
                  className="w-full h-96 font-mono p-6 bg-white border border-zinc-200 rounded-xl text-sm leading-8 text-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-900/5 resize-none shadow-sm" 
                  value={generateMarkdownPreview()} 
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
