
import { AWBucket, AWEvent } from '../types.ts';

// Using 127.0.0.1 first as it's often more reliable for cross-origin requests in some browser environments
const HOSTS = ['http://127.0.0.1:5600', 'http://localhost:5600'];
const API_PATH = '/api/0';

export class ActivityWatchService {
  private static activeHost: string = HOSTS[0];

  private static async fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        // credentials: 'omit' can help with some CORS issues on localhost
        credentials: 'omit',
        headers: {
          'Accept': 'application/json',
          ...(options.headers || {})
        }
      });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      console.warn(`VisionGuard: Fetch failed for ${url}`, e);
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
        console.log(`VisionGuard: Attempting connection to ${host}...`);
        const buckets = await this.tryFetchBuckets(host);
        this.activeHost = host; 
        console.log(`VisionGuard: Successfully connected to ${host}`);
        
        // Find the window bucket - looking for typical watcher IDs
        const windowBucket = buckets.find(b => 
          b.type === 'window' && 
          (b.client.toLowerCase().includes('window') || b.id.toLowerCase().includes('window'))
        );
        
        if (windowBucket) {
          console.log(`VisionGuard: Found window bucket: ${windowBucket.id}`);
        } else {
          console.warn("VisionGuard: Connected to AW but no 'window' bucket found. Is aw-watcher-window running?");
        }
        
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

  static getActiveHost(): string {
    return this.activeHost;
  }
}
