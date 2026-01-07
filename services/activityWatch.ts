
import { AWBucket, AWEvent } from '../types.ts';

const HOSTS = ['http://127.0.0.1:5600', 'http://localhost:5600'];
const API_PATH = '/api/0';

export class ActivityWatchService {
  private static activeHost: string = HOSTS[0];
  private static manualBuckets: AWBucket[] | null = null;

  private static async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 4000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        }
      });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  static setManualBuckets(json: any) {
    if (typeof json === 'object' && !Array.isArray(json)) {
      this.manualBuckets = Object.values(json);
    } else if (Array.isArray(json)) {
      this.manualBuckets = json;
    }
  }

  static async findWindowBucket(): Promise<string | null> {
    // If we have manual data, use it first to identify the correct bucket ID
    const sourceBuckets = this.manualBuckets;
    
    if (sourceBuckets) {
      const found = sourceBuckets.find(b => 
        (b.type === 'currentwindow' || b.type === 'window') && 
        b.client.includes('window')
      );
      if (found) return found.id;
    }

    let lastError: any = null;
    for (const host of HOSTS) {
      try {
        const response = await this.fetchWithTimeout(`${host}${API_PATH}/buckets`);
        if (!response.ok) continue;
        const data = await response.json();
        const buckets: AWBucket[] = Object.values(data);
        this.activeHost = host; 
        
        const windowBucket = buckets.find(b => 
          (b.type === 'currentwindow' || b.type === 'window') && 
          (b.client.toLowerCase().includes('window') || b.id.toLowerCase().includes('window'))
        );
        
        return windowBucket?.id || null;
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    throw lastError || new Error('Connection blocked by browser security');
  }

  static async getLatestEvent(bucketId: string): Promise<AWEvent | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.activeHost}${API_PATH}/buckets/${bucketId}/events?limit=1`);
      if (!response.ok) return null;
      const events = await response.json();
      return events.length > 0 ? events[0] : null;
    } catch (e) {
      return null;
    }
  }

  static getActiveHost(): string {
    return this.activeHost;
  }
}
