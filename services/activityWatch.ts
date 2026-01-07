
import { AWBucket, AWEvent } from '../types.ts';

// 127.0.0.1 is often preferred over localhost to avoid IPv6 resolution delays/errors
const HOSTS = ['http://127.0.0.1:5600', 'http://localhost:5600'];
const API_PATH = '/api/0';

export class ActivityWatchService {
  private static activeHost: string = HOSTS[0];

  private static async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 4000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        mode: 'cors', // Explicitly request CORS
        headers: {
          'Accept': 'application/json',
          ...options.headers,
        }
      });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      console.error(`VisionGuard: Fetch error for ${url}`, e);
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
        console.log(`VisionGuard: Trying connection to ${host}...`);
        const buckets = await this.tryFetchBuckets(host);
        this.activeHost = host; 
        console.log(`VisionGuard: Connected to ActivityWatch at ${host}`);
        
        // Match against 'currentwindow' type (used by aw-watcher-window)
        const windowBucket = buckets.find(b => 
          (b.type === 'currentwindow' || b.type === 'window') && 
          (b.client.toLowerCase().includes('window') || b.id.toLowerCase().includes('window'))
        );
        
        if (windowBucket) {
          console.log(`VisionGuard: Selected bucket ${windowBucket.id}`);
        } else {
          console.warn("VisionGuard: ActivityWatch connected but no window watcher bucket found.");
        }
        
        return windowBucket?.id || null;
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    throw lastError || new Error('All connection attempts failed');
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
