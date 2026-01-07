
import { AWEvent } from '../types.ts';

// Now pointing to our new Flask Bridge which handles CORS
const BRIDGE_URL = 'http://localhost:5000/api';

export class ActivityWatchService {
  static async getBridgeStatus(): Promise<any> {
    try {
      const response = await fetch(`${BRIDGE_URL}/status`, {
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error('Bridge unreachable');
      return await response.json();
    } catch (e) {
      throw e;
    }
  }

  // Helper to map bridge data to our internal event type
  static async getLatestEvent(): Promise<AWEvent | null> {
    const bridgeData = await this.getBridgeStatus();
    if (bridgeData.status === 'connected') {
      return {
        id: 0,
        timestamp: bridgeData.data.timestamp,
        duration: 0,
        data: {
          app: bridgeData.data.app,
          title: bridgeData.data.title
        }
      };
    }
    return null;
  }
}
