import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import os from 'os';

export async function GET() {
  try {
    let freeBytes = 0;
    let totalBytes = 0;

    if (os.platform() === 'win32') {
      // Windows: wmic
      const out = execSync('wmic logicaldisk get size,freespace,caption').toString();
      const lines = out.trim().split('\n').slice(1);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          freeBytes += parseInt(parts[1]) || 0;
          totalBytes += parseInt(parts[2]) || 0;
        }
      }
    } else {
      // macOS / Linux: df
      const out = execSync("df -k /").toString();
      const lines = out.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].trim().split(/\s+/);
        // df -k: Filesystem 1K-blocks Used Available Use% Mounted
        totalBytes = parseInt(parts[1]) * 1024 || 0;
        freeBytes = parseInt(parts[3]) * 1024 || 0;
      }
    }

    const freeGB = freeBytes / (1024 ** 3);
    const totalGB = totalBytes / (1024 ** 3);
    const usedGB = totalGB - freeGB;
    const usedPercent = totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0;
    const warning = freeGB < 10;

    return NextResponse.json({
      freeGB: Math.round(freeGB * 10) / 10,
      totalGB: Math.round(totalGB * 10) / 10,
      usedGB: Math.round(usedGB * 10) / 10,
      usedPercent,
      warning,
    });
  } catch {
    return NextResponse.json({ freeGB: null, warning: false, error: 'Не удалось получить данные диска' });
  }
}
