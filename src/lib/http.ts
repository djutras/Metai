interface FetchOptions {
  timeoutMs?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
}

interface FetchResult {
  status: number;
  html: string;
  notModified: boolean;
  etag?: string;
  lastModified?: string;
}

const USER_AGENT = `${process.env.USER_AGENT_NAME || 'NewsAggregator'}/${process.env.USER_AGENT_VERSION || '1.0'}; contact: ${process.env.USER_AGENT_CONTACT || 'admin@example.com'}`;

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff with jitter
 */
function getBackoffDelay(attempt: number, baseMs = 1000): number {
  const exponential = Math.min(baseMs * Math.pow(2, attempt), 30000);
  const jitter = Math.random() * 0.3 * exponential;
  return exponential + jitter;
}

/**
 * Fetch HTML with retry logic, backoff, and conditional requests
 */
export async function fetchHtml(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  const {
    timeoutMs = 15000,
    maxRetries = 3,
    headers = {},
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          ...headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : getBackoffDelay(attempt);
        console.warn(`Rate limited on ${url}, waiting ${waitTime}ms`);
        await sleep(waitTime);
        continue;
      }

      // Handle 304 Not Modified
      if (response.status === 304) {
        return {
          status: 304,
          html: '',
          notModified: true,
        };
      }

      // Handle errors with retry
      if (!response.ok) {
        if (response.status === 403 || response.status === 401) {
          // Don't retry auth errors
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        if (attempt < maxRetries - 1 && response.status >= 500) {
          await sleep(getBackoffDelay(attempt));
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      return {
        status: response.status,
        html,
        notModified: false,
        etag: response.headers.get('ETag') || undefined,
        lastModified: response.headers.get('Last-Modified') || undefined,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on timeout or abort
      if (lastError.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }

      // Retry with backoff
      if (attempt < maxRetries - 1) {
        await sleep(getBackoffDelay(attempt));
        continue;
      }
    }
  }

  throw lastError || new Error('Unknown fetch error');
}

/**
 * Fetch XML (for sitemaps, feeds)
 */
export async function fetchXml(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult> {
  return fetchHtml(url, {
    ...options,
    headers: {
      ...options.headers,
      'Accept': 'application/xml,text/xml,application/rss+xml,application/atom+xml',
    },
  });
}
