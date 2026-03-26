'use client';

import React from 'react';
import { useMeetingStore, MeetingType } from '@/lib/store';

const SUMMARY_HINTS: Record<MeetingType, string> = {
  'General': '通用會議：將擷取包含會議時間、核心決議及待辦清單 (Action Items)。',
  'Kick-off': '啟動會議：將重點摘要各部會提出的要點與討論方針。',
  'Wireframe': '原型討論：將詳盡紀錄討論過程與介面修正結論。'
};

export default function MeetingTypeSelector() {
  const meetingType = useMeetingStore((state) => state.meetingType);
  const setMeetingType = useMeetingStore((state) => state.setMeetingType);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMeetingType(e.target.value as MeetingType);
  };

  return (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <label htmlFor="meetingType" className="font-semibold text-sm">
        會議類型
      </label>
      
      {/* 
        This is a native <select> styled to match Shadcn UI defaults.
        True Radix UI Select components can be installed later via `npx shadcn@latest add select`.
      */}
      <select
        id="meetingType"
        value={meetingType}
        onChange={handleSelectChange}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="General">通用會議 (General)</option>
        <option value="Kick-off">啟動會議 (Kick-off)</option>
        <option value="Wireframe">原型討論 (Wireframe)</option>
      </select>

      <div className="mt-1 rounded border bg-blue-50/50 p-2 text-sm text-blue-800 shadow-sm">
        <strong className="font-medium inline-block mb-1">提示情報：</strong>
        <p className="opacity-90 leading-relaxed text-xs">{SUMMARY_HINTS[meetingType]}</p>
      </div>
    </div>
  );
}
