export interface TranscriptSegment {
  timestamp: string; // e.g. "00:01-00:05"
  speaker: string; // e.g. "Speaker 1"
  text: string;
}

export function exportToMarkdown(segments: TranscriptSegment[], filename = 'transcript.md') {
  let mdContent = '# 語音轉譯紀錄\n\n';
  mdContent += '| 時間戳 | 講者 | 對話內容 |\n';
  mdContent += '| --- | --- | --- |\n';

  segments.forEach((seg) => {
    // 解決 Markdown 表格可能因為文字內的 '|' 或換行符號跑版的問題
    const safeText = seg.text.replace(/\\|/g, '&#124;').replace(/\n/g, '<br>');
    mdContent += `| ${seg.timestamp} | ${seg.speaker || '未知'} | ${safeText} |\n`;
  });

  // 觸發下載
  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
