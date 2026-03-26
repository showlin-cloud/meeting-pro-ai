'use client';

import React, { useState } from 'react';

export interface FigmaIntentParameters {
  category: string;
  requirements: string[];
  audience: string;
  figmaIntegrationMode: 'A' | 'B' | 'none'; // 新增 Figma 整合模式
}

interface FigmaContextAwareConsultantProps {
  onComplete: (intent: FigmaIntentParameters) => void;
  // 模擬環境：從先前 parseFigmaComments 模組接收到的分析數據元資料
  // 在沒有傳入時，利用預設值模擬題目要求的情境
  detectedFigmaComments?: { startId: string; endId: string; count: number } | null;
}

/**
 * 組件：FigmaContextAwareConsultant 
 * 升級版的 PreGenConsultant，能夠自動偵測 Figma 評論的存在，並提供深度融合的選項。 (Y2K Edition)
 */
export default function FigmaContextAwareConsultant({ 
  onComplete,
  detectedFigmaComments = { startId: '129', endId: '157', count: 29 } // Default Mock
}: FigmaContextAwareConsultantProps) {
  const [category, setCategory] = useState<string>('Wireframe');
  const [requirements, setRequirements] = useState<string>('');
  const [audience, setAudience] = useState<string>('');
  const [figmaMode, setFigmaMode] = useState<'A' | 'B'>('B');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedReqs = requirements.split(',').map(r => r.trim()).filter(Boolean);
    onComplete({
      category,
      requirements: parsedReqs,
      audience: audience || '全局讀者',
      figmaIntegrationMode: detectedFigmaComments ? figmaMode : 'none'
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-[2.5rem] border-2 border-fuchsia-500/30 bg-[#0b101a]/90 p-8 md:p-12 shadow-[0_0_60px_rgba(217,70,239,0.2)] backdrop-blur-xl">
      <div className="space-y-2 border-b-2 border-fuchsia-500/20 pb-6">
        <h2 className="text-3xl md:text-4xl font-black text-white lowercase tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">
          ✨ 逐字稿與環境數據讀取完成
        </h2>
        <p className="text-sm md:text-base text-fuchsia-300/80 font-mono tracking-wider lowercase">
          為了讓這份 AI 報告更懂您的設計討論，請回答以下幾個問題：
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-8 pt-4">
        {/* Figma Context 專屬提問區塊 */}
        {detectedFigmaComments && (
          <div className="rounded-3xl border-l-[8px] border-cyan-400 bg-cyan-950/40 p-6 md:p-8 shadow-[inset_0_4px_30px_rgba(34,211,238,0.1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <span className="text-9xl font-black">F.</span>
            </div>
            
            <h3 className="font-black text-cyan-50 mb-4 flex items-center gap-3 text-2xl drop-shadow-[0_0_10px_rgba(34,211,238,0.6)] relative z-10">
              <span className="text-3xl">🎨</span> 偵測到 Figma 評論連動數據
            </h3>
            <p className="text-sm md:text-base text-cyan-100/90 mb-6 leading-relaxed font-mono relative z-10">
              系統發現此專案環境帶有 <strong className="text-white bg-cyan-900/80 px-2 py-0.5 rounded">#{detectedFigmaComments.startId}-#{detectedFigmaComments.endId}</strong> 等共 <strong className="text-cyan-300">{detectedFigmaComments.count}</strong> 筆 Figma Comments 數據。<br/>
              <span className="font-bold text-cyan-200 mt-2 block text-lg">是否要將 Comments 內容與會議逐字稿討論過程進行一對一比對與整合？</span>
            </p>
            
            <div className="flex flex-col gap-4 relative z-10">
              <label className="flex items-start gap-4 cursor-pointer p-4 rounded-2xl border-2 border-white/10 bg-black/60 hover:border-cyan-500/50 hover:bg-cyan-900/40 transition-all shadow-sm">
                <input 
                  type="radio" 
                  name="figmaMode" 
                  value="A" 
                  checked={figmaMode === 'A'} 
                  onChange={() => setFigmaMode('A')}
                  className="mt-1 flex-shrink-0 appearance-none w-5 h-5 rounded-full border-2 border-cyan-500/50 checked:bg-cyan-400 checked:border-cyan-400 transition-colors"
                />
                <div>
                  <div className="font-black text-base text-white lowercase tracking-wide">(A) 僅作為參考附件</div>
                  <div className="text-sm text-slate-400 mt-1 font-mono">將 Figma 留言輕量化附加至會議紀錄最末端，不強行干預討論脈絡即可。</div>
                </div>
              </label>
              
              <label className={`flex items-start gap-4 cursor-pointer p-4 rounded-2xl border-2 transition-all shadow-lg ${figmaMode === 'B' ? 'border-cyan-400 bg-cyan-900/60 shadow-[0_0_30px_rgba(34,211,238,0.3)]' : 'border-white/10 bg-black/60 hover:border-cyan-500/50 hover:bg-cyan-900/40'}`}>
                <input 
                  type="radio" 
                  name="figmaMode" 
                  value="B" 
                  checked={figmaMode === 'B'} 
                  onChange={() => setFigmaMode('B')}
                  className="mt-1 flex-shrink-0 appearance-none w-5 h-5 rounded-full border-2 border-cyan-500/50 checked:bg-cyan-400 checked:box-shadow-[0_0_10px_rgba(34,211,238,1)] transition-colors"
                />
                <div>
                  <div className={`font-black text-base lowercase tracking-wide ${figmaMode === 'B' ? 'text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-white'}`}>
                    (B) 作為會議紀錄核心章節
                  </div>
                  <div className={`text-sm mt-1 font-mono ${figmaMode === 'B' ? 'text-cyan-100' : 'text-slate-400'}`}>
                    比照 2.1 架構設計，將逐字稿提到「這個點」與 Figma 留言一對一強關聯，還原本次深度的修改與決策共識。
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <label className="text-sm font-black text-fuchsia-300 tracking-widest uppercase">會議類別設定</label>
          <select 
            value={category} 
            onChange={e => setCategory(e.target.value)}
            className="rounded-2xl border-2 border-fuchsia-500/20 p-4 text-base font-bold bg-black/60 text-white focus:border-fuchsia-400 focus:outline-none focus:ring-4 focus:ring-fuchsia-500/20 transition-all appearance-none cursor-pointer"
          >
            <option value="Wireframe">Wireframe / UI 設計 (針對介面)</option>
            <option value="Technical">功能需求 / 技術開發</option>
            <option value="Project">專案管理 / 進度追蹤</option>
            <option value="General">通用決策 (General)</option>
          </select>
        </div>

        <button 
          type="submit" 
          className="mt-8 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-600 px-8 py-5 text-lg font-black uppercase tracking-widest text-white shadow-[0_0_30px_rgba(217,70,239,0.4)] transition-all hover:scale-[1.05] hover:shadow-[0_0_50px_rgba(34,211,238,0.6)] active:scale-95"
        >
          儲存 Figma 意圖並生成智能摘要
        </button>
      </form>
    </div>
  );
}
