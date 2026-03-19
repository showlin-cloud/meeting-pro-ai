'use client';

import React, { useState, useRef, DragEvent } from 'react';
import { localAudioProcessor } from '@/lib/localAudioProcessor';
import { LocalWhisperEngine, decodeAudioBlobToFloat32Array } from '@/lib/localWhisperEngine';
import { exportToMarkdown, TranscriptSegment } from '@/lib/exportToMarkdown';
import { FileDown, BrainCircuit, UploadCloud, Settings, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function TranscriptionPage() {
  const [status, setStatus] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
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

  // 處理點擊上傳
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

  // 啟動核心處理邏輯
  const startProcessing = async (targetFile: File) => {
    try {
      setStatus('processing');
      setProgress(0);
      setSegments([]);
      setStatusText('1. FFmpeg 正在讀取並提取音軌 (請耐心等候，切勿關閉頁面)...');

      // 1. 本地 FFmpeg 提取音軌
      const audioBlob = await localAudioProcessor(targetFile, (ratio) => {
        // 第一階段佔整體進度的 30%
        setProgress(Math.round(ratio * 30));
      });

      setStatusText('2. 解碼音訊並加載 AI 模型 (Whisper Tiny)...');
      setProgress(32);

      // 解碼音訊為 Float32Array
      const audioData = await decodeAudioBlobToFloat32Array(audioBlob);

      // 3. 啟動 Web Worker 與 AI 引擎
      const engine = new LocalWhisperEngine((event) => {
        if (event.type === 'model_progress') {
          // 第二階段：模型下載佔整體 30-50%
          const modelP = event.progress || 0;
          setProgress(30 + Math.round((modelP / 100) * 20));
          setStatusText(`下載 AI 模型中... ${Math.round(modelP)}%`);
        } else if (event.type === 'ready') {
          setStatusText('3. 模型加載完畢！開始進行文字轉譯...');
          engine.transcribe(audioData);
        } else if (event.type === 'chunk_update') {
          // 第三階段：推論佔 50-99%
          // 這裡做個簡單的進度流動假象，或以時間戳去推斷，但因架構關係先隨機遞增
          setProgress((prev) => (prev < 95 ? prev + 1 : prev));
          
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
          setStatusText('處理完成！');
          setStatus('completed');
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
  };

  // 生成轉譯結果 Markdown 文字預覽
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
    <div className="w-full max-w-4xl mx-auto font-sans">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-950 tracking-tight">會議記錄專家</h1>
          <p className="text-zinc-500 mt-2 text-sm">Offline Local Edition 🚀</p>
        </div>
        
        <div className="flex bg-zinc-100 text-zinc-700 px-4 py-2 rounded-full text-sm font-medium items-center gap-2 border border-zinc-200 shadow-sm">
          <Settings className="w-4 h-4" /> 本機處理模式啟動
        </div>
      </div>
      
      {/* 畫面 A：Idle 拖曳上傳區 */}
      {status === 'idle' && (
        <div 
          onClick={handleFileClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            bg-white border-2 border-dashed rounded-xl p-24 text-center cursor-pointer transition-all duration-300 shadow-sm
            ${isDragging ? 'border-zinc-900 bg-zinc-50 shadow-md scale-[1.02]' : 'border-zinc-300 hover:border-zinc-400 hover:bg-zinc-50'}
          `}
        >
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*,audio/*"
          />
          <div className="bg-zinc-100 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
            <BrainCircuit className={`h-10 w-10 transition-colors ${isDragging ? 'text-zinc-900' : 'text-zinc-500'}`} />
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 mb-2">將檔案拖拽至此，或點選上傳</h3>
          <p className="text-zinc-500 max-w-sm mx-auto text-sm">支援高達 20GB 影片與錄音檔，完全本地端 100% 隱私處理。</p>
          <div className="mt-8 inline-flex items-center gap-2 bg-zinc-100 text-zinc-600 px-4 py-2 rounded-md text-xs font-semibold border border-zinc-200">
            <UploadCloud className="w-4 h-4" /> 零成本・100% 本地端
          </div>
        </div>
      )}

      {/* 畫面 B：Processing 處理中 */}
      {status === 'processing' && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-zinc-100">
            <div className="h-full bg-zinc-900 transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
          
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">正在處理檔案，請勿關閉網頁</h2>
          <p className="text-zinc-500 mb-10 text-sm">{file?.name}</p>
          
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-3 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-zinc-900 transition-all duration-500 rounded-full relative"
                style={{ width: `${progress}%` }}
              >
              </div>
            </div>
            
            <div className="flex justify-between text-sm font-medium">
              <span className="text-zinc-900 animate-pulse">{statusText}</span>
              <span className="text-zinc-500">{progress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* 畫面 C：Error 出錯 */}
      {status === 'error' && (
        <div className="bg-white border border-red-200 shadow-sm rounded-xl p-12 text-center">
          <div className="bg-red-50 text-red-600 w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 mb-4">處理失敗</h2>
          <p className="text-red-600 bg-red-50 px-4 py-3 rounded-md text-sm font-medium inline-block mb-8">{statusText}</p>
          <div>
            <button 
              onClick={resetState}
              className="px-6 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors flex items-center gap-2 mx-auto shadow-sm"
            >
              <RefreshCw className="h-4 w-4" /> 重新選擇檔案
            </button>
          </div>
        </div>
      )}

      {/* 畫面 D：Completed 完成 */}
      {status === 'completed' && (
        <div className="bg-white border border-zinc-200 shadow-sm rounded-xl p-8">
          <div className="flex justify-between items-center mb-6 pb-6 border-b border-zinc-100">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500 h-6 w-6" />
                轉譯完成
              </h2>
              <p className="text-zinc-500 mt-1 text-sm">{file?.name}</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={resetState}
                className="px-4 py-2 border border-zinc-200 text-zinc-700 text-sm font-medium rounded-md hover:bg-zinc-100 transition-colors"
              >
                處理新檔案
              </button>
              <button 
                onClick={handleExport}
                className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-md hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-sm"
              >
                <FileDown className="h-4 w-4" /> 匯出 Markdown
              </button>
            </div>
          </div>
          
          <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-xs font-semibold text-zinc-500">Markdown 預覽</span>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">解析成功</span>
            </div>
            <textarea 
              readOnly
              className="w-full h-96 font-mono p-4 bg-white border border-zinc-200 rounded-md text-sm leading-relaxed text-zinc-700 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900" 
              value={generateMarkdownPreview()} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
