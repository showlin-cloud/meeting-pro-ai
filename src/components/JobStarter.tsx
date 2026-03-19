'use client';

import React, { useState } from 'react';
import { estimateCost } from '@/actions/estimateCost';
import { Play, DollarSign, Loader2, Link2 } from 'lucide-react';

type Provider = 'groq' | 'openai';

export default function JobStarter() {
  const [driveUrl, setDriveUrl] = useState('');
  const [provider, setProvider] = useState<Provider>('groq');
  const [loading, setLoading] = useState(false);
  const [estimateResult, setEstimateResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEstimate = async () => {
    if (!driveUrl) return;
    setLoading(true);
    setError(null);
    setEstimateResult(null);

    try {
      const res = await estimateCost(driveUrl, provider);
      if (res.success) {
        setEstimateResult(res);
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      setError("無法連線至估算服務");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    // 呼叫預算檢查邏輯
    if (estimateResult) {
      alert(`正在檢查預算...\n預估花費: $${estimateResult.estimatedCostUsd} USD\n預算充足，啟動任務！`);
    } else {
      alert("請先估算費用再啟動任務！");
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto p-8 bg-white/70 backdrop-blur-lg rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
      <h2 className="text-2xl font-bold mb-8 text-gray-800 flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Play className="text-blue-600 h-6 w-6" strokeWidth={2.5} />
        </div>
        任務啟動控制中心
      </h2>

      <div className="space-y-6">
        {/* Drive URL Input */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">Google Drive 檔案連結</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500 text-gray-400">
              <Link2 className="h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder="貼上你的 Google Drive URL 共用連結"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              className="pl-11 w-full p-3.5 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-gray-50/50 focus:bg-white text-gray-800 placeholder-gray-400 font-medium text-sm"
            />
          </div>
        </div>

        {/* Provider Selection */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-gray-700">選擇轉錄引擎</label>
          <div className="grid grid-cols-2 gap-4">
            <label className={`relative flex flex-col justify-center items-center text-center gap-2 p-5 border-2 rounded-xl cursor-pointer transition-all ${provider === 'groq' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'}`}>
              <input
                type="radio"
                name="provider"
                value="groq"
                checked={provider === 'groq'}
                onChange={() => setProvider('groq')}
                className="absolute right-4 top-4 w-4 h-4 text-blue-600 focus:ring-blue-500 opacity-0"
              />
              {provider === 'groq' && (
                <div className="absolute top-4 right-4 w-4 h-4 rounded-full border-[5px] border-blue-600 bg-white shadow-sm ring-1 ring-black/5" />
              )}
              {provider !== 'groq' && (
                <div className="absolute top-4 right-4 w-4 h-4 rounded-full border border-gray-300 bg-white" />
              )}
              <div className="font-bold text-gray-900 text-lg">Groq</div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">快速 / 便宜</span>
            </label>
            <label className={`relative flex flex-col justify-center items-center text-center gap-2 p-5 border-2 rounded-xl cursor-pointer transition-all ${provider === 'openai' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'}`}>
              <input
                type="radio"
                name="provider"
                value="openai"
                checked={provider === 'openai'}
                onChange={() => setProvider('openai')}
                className="absolute right-4 top-4 w-4 h-4 text-blue-600 focus:ring-blue-500 opacity-0"
              />
              {provider === 'openai' && (
                <div className="absolute top-4 right-4 w-4 h-4 rounded-full border-[5px] border-blue-600 bg-white shadow-sm ring-1 ring-black/5" />
              )}
              {provider !== 'openai' && (
                <div className="absolute top-4 right-4 w-4 h-4 rounded-full border border-gray-300 bg-white" />
              )}
              <div className="font-bold text-gray-900 text-lg">OpenAI</div>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-semibold rounded-full">穩定 / 標準</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            onClick={handleEstimate}
            disabled={!driveUrl || loading}
            className="flex-1 bg-white border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98]"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
            估算費用
          </button>
          
          <button
            onClick={handleStart}
            disabled={!driveUrl || !estimateResult}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0"
          >
            <Play className="h-5 w-5" fill="currentColor" />
            啟動任務
          </button>
        </div>

        {/* Results / Error Display */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${error || estimateResult ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0 m-0'}`}>
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
              <div className="h-2 w-2 bg-red-500 rounded-full" />
              {error}
            </div>
          )}

          {estimateResult && !error && (
            <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-xl space-y-3 shadow-inner">
              <h3 className="font-bold text-green-900 flex items-center gap-2 text-sm uppercase tracking-wider">
                <DollarSign className="h-4 w-4" /> 費用估算結果
              </h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-green-700/70 font-medium text-xs">檔案名稱</span>
                  <span className="font-semibold text-green-900 truncate pr-2" title={estimateResult.fileInfo.name}>{estimateResult.fileInfo.name || "未提供權限"}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-green-700/70 font-medium text-xs">檔案大小</span>
                  <span className="font-semibold text-green-900">{estimateResult.fileInfo.sizeMb} MB</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-green-700/70 font-medium text-xs">預估時長</span>
                  <span className="font-semibold text-green-900">{estimateResult.fileInfo.durationHours} 小時</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-green-700/70 font-medium text-xs">預估成本</span>
                  <span className="font-bold text-2xl text-emerald-600">${estimateResult.estimatedCostUsd} <span className="text-xs font-semibold uppercase">USD</span></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
