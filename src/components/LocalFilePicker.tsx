'use client';

import React, { useState } from 'react';
import ProgressTracker from '@/components/ProgressTracker';
import { HardDrive, MonitorPlay, CheckCircle2 } from 'lucide-react';

export default function LocalFilePicker() {
  const [file, setFile] = useState<File | null>(null);

  // 1. 使用 File System Access API 獲取檔案
  const handleSelectFile = async () => {
    try {
      if ('showOpenFilePicker' in window) {
        // @ts-ignore - TS 預設不包含此新 API
        const [fileHandle] = await window.showOpenFilePicker({
          types: [
            {
              description: '影片或音訊檔',
              accept: {
                'video/*': ['.mp4', '.mov', '.avi', '.mkv'],
                'audio/*': ['.mp3', '.wav', '.m4a']
              }
            }
          ]
        });
        const selectedFile = await fileHandle.getFile();
        setFile(selectedFile);
      } else {
        // Fallback for older browsers
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*,audio/*';
        input.onchange = (e) => {
          const target = e.target as HTMLInputElement;
          if (target.files && target.files.length > 0) {
            setFile(target.files[0]);
          }
        };
        input.click();
      }
    } catch (err) {
      console.log('User cancelled or error:', err);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
          <HardDrive className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">完全本地 AI 任務控制站</h2>
          <p className="text-sm text-gray-500">100% 隱私保護，無需 API Key，瀏覽器內建 AI 推論</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* File Selection */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <MonitorPlay className="h-4 w-4" /> 選擇本地音訊/影片 (支援超大檔案)
          </label>
          <div 
            onClick={handleSelectFile}
            className="border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors rounded-2xl p-8 text-center cursor-pointer group"
          >
            {file ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto" />
                <p className="font-semibold text-gray-800">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB</p>
              </div>
            ) : (
              <div className="space-y-2">
                <HardDrive className="h-10 w-10 text-gray-400 mx-auto group-hover:text-indigo-500 transition-colors" />
                <p className="font-semibold text-gray-700">點擊選取檔案</p>
                <p className="text-sm text-gray-500">利用 File System Access API 進行極速串流載入</p>
              </div>
            )}
          </div>
        </div>

        {/* Progress Tracker (Fully Local AI) */}
        {file && (
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">完全本地端 AI 推論 (Whisper Tiny)</h3>
            <ProgressTracker file={file} />
          </div>
        )}
      </div>
    </div>
  );
}
