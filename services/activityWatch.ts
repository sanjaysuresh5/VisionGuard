
import { AWBucket, AWEvent } from '../types';

const BASE_URL = 'http://localhost:5600/api/0';

export class ActivityWatchService {
  private static async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 3000): Promise<Response> {
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

  private static async fetchBuckets(): Promise<AWBucket[]> {
    const response = await this.fetchWithTimeout(`${BASE_URL}/buckets`);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    return Object.values(data);
  }

  static async findWindowBucket(): Promise<string | null> {
    try {
      const buckets = await this.fetchBuckets();
      // aw-watcher-window is the standard bucket for active window tracking
      const windowBucket = buckets.find(b => b.type === 'window' && (b.client.includes('aw-watcher-window') || b.id.includes('window')));
      return windowBucket?.id || null;
    } catch (e) {
      console.warn('ActivityWatch connection failed. This is likely due to CORS or the server not running.', e);
      throw e; // Propagate to let UI handle specific error types
    }
  }

  static async getLatestEvent(bucketId: string): Promise<AWEvent | null> {
    try {
      const response = await this.fetchWithTimeout(`${BASE_URL}/buckets/${bucketId}/events?limit=1`);
      if (!response.ok) return null;
      const events = await response.json();
      return events.length > 0 ? events[0] : null;
    } catch (e) {
      return null;
    }
  }

  static async testConnection(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${BASE_URL}/buckets`);
      return response.ok;
    } catch (e) {
      return false;
    }
  }
}
