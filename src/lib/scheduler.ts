import cron from 'node-cron';

export function startSchedulers() {
  // Schedule to run at 00:00 every Sunday
  cron.schedule('0 0 * * 0', async () => {
    console.log('Starting automated weekly model retraining...');
    try {
      // 1. Trigger the python retrain API
      const res = await fetch("http://127.0.0.1:8000/retrain", { method: "POST" });
      if (!res.ok) throw new Error("Python retrain API failed");
      
      console.log('Automated weekly retraining completed successfully.');
    } catch (error) {
      console.error('Automated weekly retraining failed:', error);
    }
  });
}
