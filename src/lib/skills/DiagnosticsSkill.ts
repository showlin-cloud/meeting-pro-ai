/**
 * Skill: DiagnosticsSkill (系統診斷技能)
 * 
 * 負責檢查本地 Web Worker 狀態、瀏覽器記憶體、以及與雲端 API 的連線。
 */

export interface SystemStatus {
  localModel: string;
  cloudModel: string;
  apiStatus: 'ok' | 'error';
  workerHealthy: boolean;
  memoryUsage?: string;
  message?: string;
}

export class DiagnosticsSkill {
  async checkAISystem(): Promise<SystemStatus> {
    const status: SystemStatus = {
      localModel: 'Whisper-tiny (Local)',
      cloudModel: 'Claude-3.5-Sonnet (Cloud)',
      apiStatus: 'error',
      workerHealthy: false,
    };

    // 1. 檢查 Web Memory
    if ((performance as any).memory) {
      const used = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
      const total = Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024);
      status.memoryUsage = `${used}MB / ${total}MB`;
    }

    // 2. 檢查 Cloud API (Ping /api/summarize)
    try {
      const resp = await fetch('/api/summarize', { method: 'GET' });
      const data = await resp.json();
      if (data.status === 'ok') {
        status.apiStatus = 'ok';
      } else {
        status.message = data.message;
      }
    } catch (err) {
      status.message = 'Network error or endpoint unavailable';
    }

    // 3. 檢查 Web Worker (簡單測試，前端會通過 transcriber 實例確認)
    status.workerHealthy = typeof Worker !== 'undefined';

    return status;
  }
}
