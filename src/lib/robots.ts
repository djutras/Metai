import { fetchHtml } from './http';

interface RobotsRules {
  crawlDelay: number;
  disallowedPaths: string[];
  allowedPaths: string[];
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  capacity: number;
  refillRate: number; // tokens per second
}

// Cache robots.txt rules in memory
const robotsCache = new Map<string, { rules: RobotsRules; fetchedAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting buckets per domain
const rateLimitBuckets = new Map<string, TokenBucket>();

// Domain cooldowns (for 429/403 responses)
const domainCooldowns = new Map<string, number>();

/**
 * Parse robots.txt content for our user agent
 */
function parseRobots(content: string, userAgent = '*'): RobotsRules {
  const lines = content.split('\n').map(l => l.trim());
  const rules: RobotsRules = {
    crawlDelay: 1,
    disallowedPaths: [],
    allowedPaths: [],
  };

  let currentAgent = '';
  let matchesOurAgent = false;

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;

    const [directive, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();

    if (directive.toLowerCase() === 'user-agent') {
      currentAgent = value.toLowerCase();
      matchesOurAgent = currentAgent === userAgent.toLowerCase() || currentAgent === '*';
      continue;
    }

    if (!matchesOurAgent) continue;

    switch (directive.toLowerCase()) {
      case 'disallow':
        if (value) rules.disallowedPaths.push(value);
        break;
      case 'allow':
        if (value) rules.allowedPaths.push(value);
        break;
      case 'crawl-delay':
        const delay = parseFloat(value);
        if (!isNaN(delay)) rules.crawlDelay = Math.max(delay, 1);
        break;
    }
  }

  return rules;
}

/**
 * Get robots.txt rules for a domain
 */
export async function getRobots(domain: string): Promise<RobotsRules> {
  const now = Date.now();

  // Check cache
  const cached = robotsCache.get(domain);
  if (cached && now - cached.fetchedAt < CACHE_TTL) {
    return cached.rules;
  }

  try {
    const robotsUrl = `https://${domain}/robots.txt`;
    const result = await fetchHtml(robotsUrl, { timeoutMs: 5000, maxRetries: 2 });

    const rules = parseRobots(result.html);
    robotsCache.set(domain, { rules, fetchedAt: now });
    return rules;
  } catch (error) {
    // If robots.txt is not available, assume everything is allowed with default crawl delay
    const defaultRules: RobotsRules = {
      crawlDelay: 2,
      disallowedPaths: [],
      allowedPaths: [],
    };
    robotsCache.set(domain, { rules: defaultRules, fetchedAt: now });
    return defaultRules;
  }
}

/**
 * Check if a URL is allowed by robots.txt
 */
export function isAllowed(url: string, rules: RobotsRules): boolean {
  const urlObj = new URL(url);
  const path = urlObj.pathname + urlObj.search;

  // Check allowed paths first (more specific)
  for (const allowed of rules.allowedPaths) {
    if (path.startsWith(allowed)) return true;
  }

  // Check disallowed paths
  for (const disallowed of rules.disallowedPaths) {
    if (path.startsWith(disallowed)) return false;
  }

  return true;
}

/**
 * Get rate limit delay for a domain using token bucket algorithm
 */
export function rateLimitFor(domain: string): number {
  const now = Date.now();

  // Check cooldown
  const cooldownUntil = domainCooldowns.get(domain);
  if (cooldownUntil && now < cooldownUntil) {
    return cooldownUntil - now;
  }

  let bucket = rateLimitBuckets.get(domain);

  if (!bucket) {
    // Initialize bucket: 1-2 req/sec with jitter
    bucket = {
      tokens: 1,
      lastRefill: now,
      capacity: 2,
      refillRate: 1.5, // 1.5 tokens per second (with jitter = ~1-2 req/sec)
    };
    rateLimitBuckets.set(domain, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(
    bucket.capacity,
    bucket.tokens + elapsed * bucket.refillRate
  );
  bucket.lastRefill = now;

  // Check if we have tokens
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    // Add jitter (0-300ms)
    return Math.random() * 300;
  }

  // Calculate wait time for next token
  const tokensNeeded = 1 - bucket.tokens;
  const waitMs = (tokensNeeded / bucket.refillRate) * 1000;

  return waitMs + Math.random() * 200; // Add jitter
}

/**
 * Set a cooldown for a domain (e.g., after 429/403)
 */
export function setCooldown(domain: string, durationMs = 60 * 60 * 1000): void {
  const now = Date.now();
  domainCooldowns.set(domain, now + durationMs);
}

/**
 * Clear cooldown for a domain
 */
export function clearCooldown(domain: string): void {
  domainCooldowns.delete(domain);
}
