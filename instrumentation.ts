export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAutoBackupScheduler } = await import('./src/lib/autoBackup');
    startAutoBackupScheduler();
  }
}
