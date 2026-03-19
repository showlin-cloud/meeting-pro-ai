'use client';

import React, { useState, useEffect, useRef } from 'react';
import { localAudioProcessor } from '@/lib/localAudioProcessor';
import { LocalWhisperEngine, decodeAudioBlobToFloat32Array } from '@/lib/localWhisperEngine';
import { exportToMarkdown, TranscriptSegment } from '@/lib/exportToMarkdown';
import { Play, Pause, Square, FileDown, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';

type ProcessState = 'idle' | 'extracting' | 'downloading_model' | 'transcribing' | 'completed' | 'error' | 'paused' | 'cancelled';

export default function ProgressTracker({ file }: { file: File }) {
  const [state, setState] = useState<ProcessState>('idle');
  
  const [extractProgress, setExtractProgress] = useState(0);
  const [modelProgress, setModelProgress] = useState(0);
  const [transcribeProgress, setTranscribeProgress] = useState(0); // in percentage
  
  const [errorMsg, setErrorMsg] = useState('');
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  
  const engineRef = useRef<any>(null);
  
  // 開始任務
  const startProcess = async () => {
    try {
      if (!file) return;
      setState('extracting');
      setExtractProgress(0);
      setModelProgress(0);
      setTranscribeProgress(0);
      setSegments([]);

      // 1. 本地 FFmpeg 提取音軌
      const audioBlob = await localAudioProcessor(file, (ratio) => {
        setExtractProgress(Math.round(ratio * 100));
      });
      setExtractProgress(100);

      setState('downloading_model');

      // 2. 解碼音訊為 Float32Array (16kHz Mono)
      const audioData = await decodeAudioBlobToFloat32Array(audioBlob);

      // 3. 啟動 Web Worker 與 AI 引擎
      const engine = new LocalWhisperEngine((event) => {
        if (event.type === 'model_progress') {
          setState('downloading_model');
          setModelProgress(Math.round(event.progress || 0));
        } else if (event.type === 'ready') {
          setState('transcribing');
          engine.transcribe(audioData);
        } else if (event.type === 'chunk_update') {
          // Transformers chunk update callback output might contain segments
          if (event.output && Array.isArray(event.output)) {
            const mappedSegments = event.output.map((o: any) => ({
              timestamp: o.timestamp ? `${o.timestamp[0]} - ${o.timestamp[1] || '...'}` : '未知',
              speaker: 'Speaker 1',
              text: o.text
            }));
            setSegments(mappedSegments);
            // Rough estimation of progress based on audio duration vs processed
            // Since chunk_update doesn't natively give overall percentage easily unless calculated,
            // we will simulate an increment or use chunk count if available.
            // ...
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
          setTranscribeProgress(100);
          setState('completed');
        } else if (event.type === 'error') {
          setState('error');
          setErrorMsg(event.message);
        }
      });

      engineRef.current = engine;
      engine.init();

    } catch (err: any) {
      console.error(err);
      setState('error');
      setErrorMsg(err.message || '發生未知錯誤');
    }
  };

  const cancelProcess = () => {
    if (engineRef.current) {
      engineRef.current.terminate();
    }
    setState('cancelled');
  };

  const handleExport = () => {
    exportToMarkdown(segments, `Transcript_${file.name}.md`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-6">
      <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">處理進度面板</h3>
          <p className="text-sm text-gray-500">{file?.name || '無指定檔案'}</p>
        </div>
        <div className="flex gap-2">
          {state === 'idle' || state === 'cancelled' || state === 'error' ? (
            <button onClick={startProcess} className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2 transition-all">
              <Play className="h-4 w-4" /> 啟動
            </button>
          ) : state === 'completed' ? (
            <button onClick={handleExport} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 flex items-center gap-2 transition-all">
              <FileDown className="h-4 w-4" /> 匯出為 Markdown
            </button>
          ) : (
            <>
              {/* Note: pausing a web worker mid-execution is complex so we simulate it or we provide cancel */}
              <button onClick={cancelProcess} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 flex items-center gap-2 transition-all">
                <Square className="h-4 w-4" /> 取消
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-4">
        {/* Step 1: ffmpeg */}
        <div className={`p-4 rounded-xl border transition-all ${state === 'extracting' ? 'border-indigo-400 bg-indigo-50/50 shadow-sm' : extractProgress === 100 ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50/30'}`}>
          <div className="flex justify-between mb-2">
            <span className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
              <ChevronRight className={`h-4 w-4 ${state === 'extracting' ? 'text-indigo-500' : extractProgress === 100 ? 'text-green-500' : 'text-gray-400'}`} />
              1. 音軌提取 (FFmpeg)
            </span>
            <span className="text-sm font-medium text-gray-500">{extractProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all duration-300 ${extractProgress === 100 ? 'bg-green-500' : 'bg-indigo-600'}`} style={{ width: `${extractProgress}%` }} />
          </div>
        </div>

        {/* Step 2: Model download */}
        <div className={`p-4 rounded-xl border transition-all ${state === 'downloading_model' ? 'border-indigo-400 bg-indigo-50/50 shadow-sm' : modelProgress === 100 && state !== 'idle' ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-gray-50/30'}`}>
          <div className="flex justify-between mb-2">
            <span className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
              <ChevronRight className={`h-4 w-4 ${state === 'downloading_model' ? 'text-indigo-500' : modelProgress === 100 ? 'text-green-500' : 'text-gray-400'}`} />
              2. AI 模型下載 (Whisper Tiny)
            </span>
            <span className="text-sm font-medium text-gray-500">{modelProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all duration-300 ${modelProgress === 100 ? 'bg-green-500' : 'bg-indigo-600'}`} style={{ width: `${modelProgress}%` }} />
          </div>
        </div>

        {/* Step 3: Transcription */}
        <div className={`p-4 rounded-xl border transition-all ${(state === 'transcribing' || state === 'completed') ? 'border-indigo-400 bg-indigo-50/50 shadow-sm' : 'border-gray-200 bg-gray-50/30'}`}>
          <div className="flex justify-between mb-2">
            <span className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
              <ChevronRight className={`h-4 w-4 ${state === 'transcribing' ? 'text-indigo-500' : state === 'completed' ? 'text-green-500' : 'text-gray-400'}`} />
              3. 文字轉譯進度
            </span>
            <span className="text-sm font-medium text-gray-500">{['transcribing', 'completed'].includes(state) ? '處理中...' : '0%'} {state === 'completed' && '(100%)'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden relative">
            {state === 'transcribing' ? (
               <div className="absolute top-0 left-0 h-full bg-indigo-600 w-1/3 animate-[translateX_2s_infinite_linear]" style={{ animation: "slide 2s infinite linear" }} />
            ) : (
               <div className={`h-2 rounded-full transition-all duration-300 ${state === 'completed' ? 'bg-green-500 w-full' : 'bg-gray-200 w-0'}`} />
            )}
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes slide {
              0% { transform: translateX(-100%); width: 30%; }
              100% { transform: translateX(400%); width: 30%; }
            }
          `}} />
        </div>
      </div>

      {/* Errors */}
      {state === 'error' && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
          發生錯誤: {errorMsg}
        </div>
      )}

      {/* Live Transcript Preview */}
      {segments.length > 0 && (
        <div className="mt-6">
          <h4 className="font-bold text-gray-700 mb-2">即時片段預覽：</h4>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 h-64 overflow-y-auto space-y-3 font-mono text-sm leading-relaxed text-gray-300 shadow-inner">
             {segments.map((seg, idx) => (
                <div key={idx} className="flex gap-4">
                  <span className="text-emerald-400 shrink-0 w-24">[{seg.timestamp}]</span>
                  <span className="text-gray-100">{seg.text}</span>
                </div>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}
