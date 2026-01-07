
import { AWBucket, AWEvent } from '../types.ts';

const HOSTS = ['http://localhost:5600', 'http://127.0.0.1:5600'];
const API_PATH = '/api/0';

export class ActivityWatchService {
  private static activeHost: string = HOSTS[0];

  private static async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 2000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  }

  private static async tryFetchBuckets(host: string): Promise<AWBucket[]> {
    const response = await this.fetchWithTimeout(`${host}${API_PATH}/buckets`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Object.values(data);
  }

  static async findWindowBucket(): Promise<string | null> {
    let lastError: any = null;

    for (const host of HOSTS) {
      try {
        const buckets = await this.tryFetchBuckets(host);
        this.activeHost = host; 
        const windowBucket = buckets.find(b => 
          b.type === 'window' && 
          (b.client.includes('aw-watcher-window') || b.id.includes('window'))
        );
        return windowBucket?.id || null;
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    throw lastError || new Error('Could not connect to ActivityWatch');
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
}
