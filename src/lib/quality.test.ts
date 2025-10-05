import { isArticle, topicMatchScore } from './quality';
import { ExtractedArticle } from './extract';

const mockArticle: ExtractedArticle = {
  canonical_url: 'https://example.com/article',
  title: 'Major Climate Summit Reaches Agreement on Emissions',
  summary: 'World leaders gathered at the annual climate summit have reached a landmark agreement on reducing carbon emissions. The deal includes commitments from over 150 countries to cut emissions by 40% by 2030. Environmental groups have praised the agreement as a significant step forward, though some critics argue the targets are not ambitious enough. The agreement will be formally signed next month.',
  published_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  source_domain: 'example.com',
  paywalled_bool: false,
};

const mockTopic = {
  freshnessHours: 72,
  query: 'climate environment',
  includes: ['climate', 'emissions'],
  excludes: ['opinion'],
};

describe('isArticle', () => {
  it('should accept valid article', () => {
    expect(isArticle(mockArticle, mockTopic)).toBe(true);
  });

  it('should reject article without title', () => {
    const article = { ...mockArticle, title: '' };
    expect(isArticle(article, mockTopic)).toBe(false);
  });

  it('should reject stale article', () => {
    const article = {
      ...mockArticle,
      published_at: new Date(Date.now() - 100 * 60 * 60 * 1000), // 100 hours ago
    };
    expect(isArticle(article, mockTopic)).toBe(false);
  });

  it('should reject article with short summary', () => {
    const article = { ...mockArticle, summary: 'Too short' };
    expect(isArticle(article, mockTopic)).toBe(false);
  });

  it('should reject opinion piece', () => {
    const article = {
      ...mockArticle,
      title: 'Opinion: Why Climate Action Matters',
    };
    expect(isArticle(article, mockTopic)).toBe(false);
  });

  it('should reject sponsored content', () => {
    const article = {
      ...mockArticle,
      summary: mockArticle.summary + ' This is sponsored content from our partners.',
    };
    expect(isArticle(article, mockTopic)).toBe(false);
  });
});

describe('topicMatchScore', () => {
  it('should score relevant article highly', () => {
    const score = topicMatchScore(mockArticle, mockTopic);
    expect(score).toBeGreaterThan(10);
  });

  it('should penalize article without includes', () => {
    const article = {
      ...mockArticle,
      title: 'Unrelated Technology News',
      summary: 'This article is about technology and has nothing to do with the topic.',
    };
    const score = topicMatchScore(article, mockTopic);
    expect(score).toBeLessThan(5);
  });

  it('should heavily penalize excluded keywords', () => {
    const article = {
      ...mockArticle,
      title: 'Opinion: Climate Change Reality',
    };
    const score = topicMatchScore(article, mockTopic);
    expect(score).toBe(0); // Capped at 0
  });

  it('should give higher score to title matches', () => {
    const titleMatch = {
      ...mockArticle,
      title: 'Climate Climate Climate Environment',
      summary: 'Generic text here.',
    };
    const summaryMatch = {
      ...mockArticle,
      title: 'Generic title',
      summary: 'Climate climate climate environment environment text here with lots of padding to make it long enough for quality check.',
    };

    const titleScore = topicMatchScore(titleMatch, mockTopic);
    const summaryScore = topicMatchScore(summaryMatch, mockTopic);

    expect(titleScore).toBeGreaterThan(summaryScore);
  });
});
