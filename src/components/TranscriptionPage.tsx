'use client';

import React, { useState, useRef, DragEvent } from 'react';
import { localAudioProcessor } from '@/lib/localAudioProcessor';
import { LocalWhisperEngine, decodeAudioBlobToFloat32Array } from '@/lib/localWhisperEngine';
import { exportToMarkdown, TranscriptSegment } from '@/lib/exportToMarkdown';
import { 
  FileDown, BrainCircuit, UploadCloud, Stars, RefreshCw, CheckCircle2,
  HardDrive, Cpu, Radio, AlignLeft, AudioWaveform
} from 'lucide-react';

export default function TranscriptionPage() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [activeStep, setActiveStep] = useState(0); 
  const [isDragging, setIsDragging] = useState(false);
  
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const engineRef = useRef<any>(null);

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
      setStatus('processing');
      setProgress(0);
      setSegments([]);
      
      setActiveStep(1);
      setStatusText('melting the video matrix... (ffmpeg extraction)');
      const audioBlob = await localAudioProcessor(targetFile, (ratio) => {
        setProgress(Math.round(ratio * 30));
      });

      setActiveStep(2);
      setProgress(32);
      setStatusText('decoding quantum audio waves... (this may freeze processing momentarily)');
      
      await new Promise(resolve => setTimeout(resolve, 500));
      const audioData = await decodeAudioBlobToFloat32Array(audioBlob);

      setActiveStep(3);
      setStatusText('waking up ai local brain... 🧠');
      setProgress(35);

      const engine = new LocalWhisperEngine((event) => {
        if (event.type === 'model_progress') {
          setActiveStep(3);
          const modelP = event.progress || 0;
          setProgress(35 + Math.round((modelP / 100) * 15));
          if (event.status === 'initiate') {
            setStatusText(`syncing neo-cortex: ${event.file || ''}...`);
          } else if (event.status === 'progress') {
            setStatusText(`downloading neural pathways: ${Math.round(modelP)}%`);
          } else if (event.status === 'ready') {
            setStatusText(`module loaded: ${event.file || ''} ✨`);
          } else {
            setStatusText(`loading memory... ${Math.round(modelP)}%`);
          }
        } else if (event.type === 'ready') {
          setActiveStep(4);
          setStatusText('cyber engine active! transcribing real-time...');
          engine.transcribe(audioData);
        } else if (event.type === 'chunk_update') {
          setProgress((prev) => (prev < 98 ? prev + 1 : prev));
          setStatusText('weaving words out of noise...');
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
          setStatusText('transcript crafted. 🍒');
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
      setStatusText(err.message || 'unknown error');
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

  // Y2K Tactile Minimalism Style Constants
  const TACTILE_BOX = "bg-white/80 backdrop-blur-2xl border-4 border-white shadow-[0_20px_50px_rgba(200,208,230,0.6)] rounded-[3rem]";
  const CLAY_BUTTON = "rounded-full font-black tracking-widest uppercase transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-[0_10px_30px_rgba(0,0,0,0.1)] active:shadow-inner border-2 border-transparent hover:border-white/50";
  const SOFT_PILL = "flex items-center gap-4 p-5 rounded-[2rem] border-4 border-white bg-slate-50 transition-all duration-500 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.02)]";

  return (
    <div className="w-full min-h-screen bg-[#f1f3f9] text-slate-800 font-sans pt-12 pb-24 px-6 md:px-12 selection:bg-pink-300 selection:text-pink-900 relative overflow-hidden">
      
      {/* Background Decorative Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-pink-200/40 to-fuchsia-200/40 blur-3xl -z-10 animate-pulse mix-blend-multiply pointer-events-none" style={{ animationDuration: '8s' }} />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-tr from-lime-200/40 to-emerald-200/40 blur-3xl -z-10 animate-pulse mix-blend-multiply pointer-events-none" style={{ animationDuration: '12s' }} />
      
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-16 flex flex-col items-center justify-center text-center gap-4 relative z-10">
        <h1 className="text-5xl md:text-7xl font-black lowercase tracking-tighter text-slate-900 flex items-center justify-center gap-4">
          <span className="bg-lime-300 text-lime-900 p-4 rounded-[1.5rem] shadow-[inset_0_-8px_16px_rgba(0,0,0,0.1),0_10px_20px_rgba(163,230,53,0.3)] rotate-[-6deg] hover:rotate-0 transition-transform duration-500">
            <Stars className="h-10 w-10 fill-lime-900" />
          </span>
          transcribe_ai.
        </h1>
        <p className="text-slate-500 font-bold tracking-tight text-lg lowercase bg-white/50 px-6 py-2 rounded-full border border-white shadow-sm">
          tactile local machine learning. 🍒 zero cost.
        </p>
      </header>
      
      <main className="max-w-3xl mx-auto relative z-10">
        
        {/* State A: Idle (Drag & Drop Y2K Style) */}
        {status === 'idle' && (
          <div 
            onClick={handleFileClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative overflow-hidden group cursor-pointer transition-all duration-500 text-center
              ${TACTILE_BOX} p-16 md:p-32 
              ${isDragging ? 'scale-[1.02] shadow-[0_30px_70px_rgba(163,230,53,0.4)] border-lime-200 bg-lime-50/80' : 'hover:scale-[1.01] hover:bg-white'}
            `}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:16px_16px] opacity-50" />
            
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} accept="video/*,audio/*" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className={`p-8 rounded-[2.5rem] mb-10 transition-all duration-700 
                ${isDragging ? 'bg-indigo-500 text-white shadow-[inset_0_-10px_20px_rgba(0,0,0,0.2),0_15px_30px_rgba(99,102,241,0.5)] rotate-12 scale-110' : 'bg-[#e2e8f0] text-slate-400 group-hover:bg-amber-300 group-hover:text-amber-900 group-hover:shadow-[inset_0_-10px_20px_rgba(0,0,0,0.1),0_15px_30px_rgba(251,191,36,0.4)] group-hover:-rotate-3'}`}>
                <BrainCircuit className="h-16 w-16" strokeWidth={2.5} />
              </div>
              
              <h3 className="text-4xl font-black lowercase tracking-tighter text-slate-800 mb-4">
                feed me audio.
              </h3>
              <p className="text-slate-500 font-bold text-sm max-w-sm mx-auto leading-relaxed mb-10 lowercase tracking-wide">
                auto-chunks up to 20gb local files. fully sealed, fully yours.
              </p>
              
              <div className="inline-flex items-center gap-3 bg-slate-900 text-slate-50 px-8 py-4 rounded-[2rem] text-sm font-black lowercase tracking-widest shadow-[0_10px_25px_rgba(15,23,42,0.3)] hover:bg-slate-800 transition-colors">
                <UploadCloud className="w-5 h-5" strokeWidth={3} /> browse files
              </div>
            </div>
          </div>
        )}

        {/* State B: Processing (Claymorphism Stepper) */}
        {status === 'processing' && (
          <div className={`${TACTILE_BOX} p-10 md:p-14 relative overflow-hidden bg-white/90`}>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b-4 border-slate-100 pb-8">
              <div>
                <h2 className="text-4xl font-black lowercase tracking-tighter text-slate-800">processing...</h2>
                <p className="text-slate-500 mt-2 font-black flex items-center gap-2 lowercase tracking-wider text-sm bg-slate-100 px-4 py-2 rounded-full inline-flex">
                  <AudioWaveform className="w-4 h-4 text-pink-500 animate-pulse" /> {file?.name}
                </p>
              </div>
              <div className="text-7xl font-black text-slate-200 tabular-nums tracking-tighter">
                {progress}
                <span className="text-3xl">%</span>
              </div>
            </div>

            {/* Massive Squishy Progress Bar */}
            <div className="h-8 w-full bg-slate-100 border-4 border-white shadow-[inset_0_4px_8px_rgba(0,0,0,0.05)] rounded-full overflow-hidden mb-12 p-1">
              <div 
                className="h-full bg-gradient-to-r from-amber-300 to-pink-400 rounded-full transition-all duration-700 ease-out shadow-[inset_0_-4px_8px_rgba(0,0,0,0.1)] relative overflow-hidden"
                style={{ width: `${Math.max(5, progress)}%` }}
              >
                 <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.4)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.4)_50%,rgba(255,255,255,0.4)_75%,transparent_75%,transparent)] bg-[length:1.5rem_1.5rem] animate-[progress-stripe_2s_linear_infinite]" />
              </div>
            </div>

            {/* Stepper bubbles */}
            <div className="space-y-4 max-w-xl mx-auto">
              {/* Step 1 */}
              <div className={`${SOFT_PILL} ${activeStep === 1 ? 'scale-105 border-pink-100 bg-pink-50 shadow-[0_15px_30px_rgba(244,114,182,0.2)]' : activeStep > 1 ? 'opacity-40 grayscale' : 'opacity-30 grayscale'}`}>
                <div className={`p-4 rounded-[1.5rem] ${activeStep === 1 ? 'bg-pink-400 text-white shadow-[inset_0_-4px_8px_rgba(0,0,0,0.2)]' : 'bg-slate-200 text-slate-500'}`}>
                  <HardDrive className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 tracking-wide lowercase text-xl">1. ffmpeg slice</h4>
                  <p className="text-xs font-bold text-slate-400 lowercase">mounting workerfs virtual blob</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className={`${SOFT_PILL} ${activeStep === 2 ? 'scale-105 border-amber-100 bg-amber-50 shadow-[0_15px_30px_rgba(251,191,36,0.2)]' : activeStep > 2 ? 'opacity-40 grayscale' : 'opacity-30 grayscale'}`}>
                <div className={`p-4 rounded-[1.5rem] ${activeStep === 2 ? 'bg-amber-400 text-amber-900 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.2)] animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
                  <Cpu className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 tracking-wide lowercase text-xl">2. decode to web audio</h4>
                  <p className="text-xs font-bold text-slate-400 lowercase">Float32Array heavy lift (may stick)</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`${SOFT_PILL} ${activeStep === 3 ? 'scale-105 border-indigo-100 bg-indigo-50 shadow-[0_15px_30px_rgba(99,102,241,0.2)]' : activeStep > 3 ? 'opacity-40 grayscale' : 'opacity-30 grayscale'}`}>
                <div className={`p-4 rounded-[1.5rem] ${activeStep === 3 ? 'bg-indigo-500 text-white shadow-[inset_0_-4px_8px_rgba(0,0,0,0.2)]' : 'bg-slate-200 text-slate-500'}`}>
                  <Radio className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 tracking-wide lowercase text-xl">3. onnx models load</h4>
                  <p className="text-xs font-bold text-slate-400 lowercase">downloading whisper-tiny weights</p>
                </div>
              </div>

              {/* Step 4 */}
              <div className={`${SOFT_PILL} ${activeStep === 4 ? 'scale-105 border-lime-100 bg-lime-50 shadow-[0_15px_30px_rgba(163,230,53,0.3)]' : activeStep > 4 ? 'opacity-40 grayscale' : 'opacity-30 grayscale'}`}>
                <div className={`p-4 rounded-[1.5rem] ${activeStep === 4 ? 'bg-lime-400 text-lime-900 shadow-[inset_0_-4px_8px_rgba(0,0,0,0.2)] animate-spin-slow' : 'bg-slate-200 text-slate-500'}`}>
                  <AlignLeft className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-black text-slate-800 tracking-wide lowercase text-xl">4. active transcribing</h4>
                  <p className="text-xs font-bold text-slate-400 lowercase">crunching matrix into text</p>
                </div>
              </div>
            </div>

            <div className="mt-12 bg-slate-900 text-lime-300 p-5 rounded-[2rem] text-center shadow-[inset_0_-4px_10px_rgba(0,0,0,0.3)] border-4 border-slate-800">
              <span className="font-mono text-sm uppercase tracking-[0.2em] animate-pulse">
                {statusText || 'INITIALIZING'}
              </span>
            </div>

            <style dangerouslySetInnerHTML={{__html: `
              @keyframes progress-stripe {
                0% { background-position: 1.5rem 0; }
                100% { background-position: 0 0; }
              }
              .animate-spin-slow {
                animation: spin 4s linear infinite;
              }
            `}} />
          </div>
        )}

        {/* State C: Error */}
        {status === 'error' && (
          <div className={`${TACTILE_BOX} p-16 text-center bg-white/90`}>
            <div className="bg-rose-500 text-white w-32 h-32 mx-auto rounded-[3rem] shadow-[inset_0_-10px_20px_rgba(0,0,0,0.2),0_15px_30px_rgba(244,63,94,0.4)] flex items-center justify-center mb-10 rotate-12 hover:rotate-0 transition-transform">
              <AlertCircle className="h-16 w-16" strokeWidth={3} />
            </div>
            <h2 className="text-5xl font-black lowercase tracking-tighter text-slate-800 mb-6">critical error.</h2>
            <p className="bg-rose-50 text-rose-700 px-6 py-4 rounded-3xl font-bold text-sm max-w-xl mx-auto mb-12 border-4 border-rose-100 shadow-inner">
              {statusText}
            </p>
            <button 
              onClick={resetState}
              className={`${CLAY_BUTTON} px-10 py-5 text-lg bg-slate-900 text-white flex items-center gap-3 mx-auto`}
            >
              <RefreshCw className="h-6 w-6" strokeWidth={3} /> restart engine
            </button>
          </div>
        )}

        {/* State D: Completed */}
        {status === 'completed' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className={`${TACTILE_BOX} p-8 md:p-12 bg-white/90`}>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                <div>
                  <h2 className="text-5xl font-black lowercase tracking-tighter text-slate-800 flex items-center gap-4">
                    <span className="bg-lime-300 text-lime-900 p-3 rounded-2xl shadow-[inset_0_-4px_8px_rgba(0,0,0,0.1),0_10px_20px_rgba(163,230,53,0.3)]">
                      <CheckCircle2 className="h-12 w-12" strokeWidth={3} />
                    </span>
                    done.
                  </h2>
                  <p className="text-slate-500 mt-4 font-bold lowercase tracking-widest text-sm bg-slate-100 px-4 py-2 rounded-full inline-block">
                    {file?.name}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                  <button 
                    onClick={resetState}
                    className={`${CLAY_BUTTON} px-8 py-4 bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 text-sm`}
                  >
                    new file
                  </button>
                  <button 
                    onClick={handleExport}
                    className={`${CLAY_BUTTON} px-8 py-4 bg-lime-300 text-lime-950 flex items-center justify-center gap-2 text-sm shadow-[0_10px_20px_rgba(163,230,53,0.3)] hover:bg-lime-400 group`}
                  >
                    <FileDown className="h-5 w-5 stroke-[3] group-hover:translate-y-1 transition-transform" /> save `.md`
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-100 rounded-[2.5rem] p-6 md:p-8 border-4 border-white shadow-[inset_0_-5px_15px_rgba(0,0,0,0.03)] relative">
                <div className="absolute top-0 right-0 p-6 z-10">
                  <span className="text-xs font-black text-lime-800 bg-lime-300 px-4 py-2 rounded-full shadow-sm lowercase tracking-widest border-2 border-white">
                    success
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-400 lowercase tracking-[0.2em] mb-6 pl-2">raw transcript area</h3>
                <textarea 
                  readOnly
                  className="w-full h-96 font-mono p-8 bg-white/80 backdrop-blur-sm border-4 border-white rounded-[2rem] text-sm leading-8 text-slate-700 focus:outline-none shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] resize-none" 
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
