export class AlertEngine {
  async getRecentAlerts() {
    // In the future this will query an Alerts table/system
    // and handle deduplication, escalation, and resolution.
    return [];
  }
}

export const alertEngine = new AlertEngine();
