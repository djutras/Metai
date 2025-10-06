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
      summary: mockArticle.summary + ' This article is sponsored by our partners.',
    };
    expect(isArticle(article, mockTopic)).toBe(false);
  });

  // Topic keyword validation tests
  describe('topic keyword validation', () => {
    it('should accept article with topic keyword in title', () => {
      const topic = {
        freshnessHours: 72,
        query: 'Trump',
        includes: [],
        excludes: [],
      };
      const article = {
        ...mockArticle,
        title: 'Trump Announces New Policy Changes',
        summary: 'This is a lengthy article about various political developments in Washington DC. The article covers multiple aspects of the current administration and provides detailed analysis of recent events.',
      };
      expect(isArticle(article, topic)).toBe(true);
    });

    it('should accept article with topic keyword in summary', () => {
      const topic = {
        freshnessHours: 72,
        query: 'Trump',
        includes: [],
        excludes: [],
      };
      const article = {
        ...mockArticle,
        title: 'Major Political Developments in Washington',
        summary: 'This lengthy article discusses Donald Trump and his recent policy initiatives. The former president has been making headlines with various announcements and campaign events across the country.',
      };
      expect(isArticle(article, topic)).toBe(true);
    });

    it('should reject article without any topic keywords', () => {
      const topic = {
        freshnessHours: 72,
        query: 'Trump',
        includes: [],
        excludes: [],
      };
      const article = {
        ...mockArticle,
        title: 'Biden Administration Announces Infrastructure Plan',
        summary: 'The current administration has unveiled a comprehensive infrastructure package aimed at modernizing the nation highways bridges and public transportation systems. The proposal includes significant funding allocations.',
      };
      expect(isArticle(article, topic)).toBe(false);
    });

    it('should support case-insensitive matching', () => {
      const topic = {
        freshnessHours: 72,
        query: 'trump',
        includes: [],
        excludes: [],
      };
      const article = {
        ...mockArticle,
        title: 'TRUMP Makes Campaign Stop in Iowa',
        summary: 'The presidential candidate visited multiple cities during a campaign tour focusing on economic issues and border security policies that resonate with local voters.',
      };
      expect(isArticle(article, topic)).toBe(true);
    });

    it('should support partial matches', () => {
      const topic = {
        freshnessHours: 72,
        query: 'Trump',
        includes: [],
        excludes: [],
      };
      const article = {
        ...mockArticle,
        title: "Analysis of Trump's Economic Policies",
        summary: 'This comprehensive analysis examines the economic proposals put forward by the candidate including tax reform trade policies and regulatory changes that could impact various sectors.',
      };
      expect(isArticle(article, topic)).toBe(true);
    });

    it('should match keywords from includes array', () => {
      const topic = {
        freshnessHours: 72,
        query: '',
        includes: ['cryptocurrency', 'bitcoin'],
        excludes: [],
      };
      const article = {
        ...mockArticle,
        title: 'Bitcoin Reaches New All-Time High',
        summary: 'The leading cryptocurrency has surged to record levels amid growing institutional adoption and favorable regulatory developments in major markets around the world.',
      };
      expect(isArticle(article, topic)).toBe(true);
    });

    it('should match any keyword from query or includes', () => {
      const topic = {
        freshnessHours: 72,
        query: 'election campaign',
        includes: ['Trump', 'Biden'],
        excludes: [],
      };
      const article = {
        ...mockArticle,
        title: 'Presidential Campaign Intensifies',
        summary: 'As the campaign season heats up candidates are increasing their public appearances and advertising spending in key battleground states ahead of the upcoming primaries.',
      };
      expect(isArticle(article, topic)).toBe(true);
    });

    it('should allow articles when no topic keywords are defined', () => {
      const topic = {
        freshnessHours: 72,
        query: '',
        includes: [],
        excludes: [],
      };
      const article = {
        ...mockArticle,
        title: 'Generic News Article',
        summary: 'This is a generic news article about various events happening around the world including politics sports entertainment and business developments.',
      };
      expect(isArticle(article, topic)).toBe(true);
    });
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
