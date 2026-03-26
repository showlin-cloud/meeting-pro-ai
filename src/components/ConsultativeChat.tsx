'use client';

import React, { useState } from 'react';

export interface IntentParameters {
  category: string;
  requirements: string[];
  audience: string;
}

interface ConsultativeChatProps {
  onComplete: (intent: IntentParameters) => void;
}

/**
 * 組件：ConsultativeChat (對話引導 UI)
 * 實作生成會議紀錄前的問答機制。當逐字稿完成後彈出此介面，
 * 收集意圖參數 (Intent Parameters) 送交 API 生成摘要。
 */
export default function ConsultativeChat({ onComplete }: ConsultativeChatProps) {
  const [category, setCategory] = useState<string>('General');
  const [requirements, setRequirements] = useState<string>('');
  const [audience, setAudience] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedReqs = requirements.split(',').map(r => r.trim()).filter(Boolean);
    onComplete({
      category,
      requirements: parsedReqs,
      audience: audience || '全局讀者'
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 rounded-xl border border-blue-100 bg-white p-6 shadow-xl">
      <div className="space-y-1 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-800">✨ 逐字稿讀取完成！</h2>
        <p className="text-sm text-gray-500">
          在為您生成最終會議紀錄前，想先請教幾個問題，確保這份 AI 報告完全切中您的工作流程與團隊需求：
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
        {/* 問題一 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">1. 本次會議屬於哪一類別？</label>
          <select 
            value={category} 
            onChange={e => setCategory(e.target.value)}
            className="rounded-lg border border-gray-300 p-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
          >
            <option value="General">通用決策 (General)</option>
            <option value="Wireframe">Wireframe / UI 設計</option>
            <option value="Technical">功能需求 / 技術開發</option>
            <option value="Project">專案進度追蹤</option>
            <option value="Legal Review">法務合規 (Legal Review)</option>
            <option value="Marketing Brainstorming">行銷腦力激盪 (Marketing)</option>
          </select>
        </div>

        {/* 問題二 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">2. 是否有特定的記錄模組需求？</label>
          <input 
            type="text" 
            placeholder="如：Figma Comment 表、API 成本評估、心智圖 (請以逗號分隔)"
            value={requirements}
            onChange={e => setRequirements(e.target.value)}
            className="rounded-lg border border-gray-300 p-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
          />
        </div>

        {/* 問題三 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-gray-700">3. 閱讀對象是誰？</label>
          <input 
            type="text" 
            placeholder="如：負責切版的前端工程師、不看細節的高階主管"
            value={audience}
            onChange={e => setAudience(e.target.value)}
            className="rounded-lg border border-gray-300 p-2.5 text-sm bg-gray-50 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors"
          />
        </div>

        <button 
          type="submit" 
          className="mt-4 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          儲存意圖並生成智能摘要
        </button>
      </form>
    </div>
  );
}
