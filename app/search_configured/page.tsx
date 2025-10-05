'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Topic {
  id: number;
  slug: string;
  name: string;
  query: string | null;
  includes: string[];
  excludes: string[];
  lang: string[];
  freshnessHours: number;
  maxItems: number;
  enabled: boolean;
}

interface Source {
  id: number;
  name: string;
  domain: string;
  type: string;
  points: number;
  topicId: number | null;
  enabled: boolean;
  lastSeenAt: string | null;
}

export default function SearchConfiguredPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadConfigurations();
  }, []);

  const loadConfigurations = async () => {
    try {
      setLoading(true);

      const [topicsRes, sourcesRes] = await Promise.all([
        fetch('/.netlify/functions/get-topics'),
        fetch('/.netlify/functions/get-sources'),
      ]);

      if (topicsRes.ok && sourcesRes.ok) {
        const topicsData = await topicsRes.json();
        const sourcesData = await sourcesRes.json();
        setTopics(topicsData);
        setSources(sourcesData);
      } else {
        setError('Failed to load configurations');
      }
    } catch (err) {
      setError('Error loading configurations: ' + err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '50px auto', padding: '20px' }}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '50px auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Search Configured</h1>
        <Link
          href="/admin"
          style={{
            padding: '10px 20px',
            backgroundColor: '#000',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          Back to Admin
        </Link>
      </div>

      {error && (
        <div style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '50px' }}>
        <h2 style={{ marginBottom: '20px' }}>Topics ({topics.length})</h2>
        {topics.length === 0 ? (
          <p style={{ color: '#666' }}>No topics configured yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Slug</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Query</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Includes</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Excludes</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Lang</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Freshness</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Max Items</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Enabled</th>
                </tr>
              </thead>
              <tbody>
                {topics.map((topic) => (
                  <tr key={topic.id}>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{topic.slug}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{topic.name}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{topic.query || '-'}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{topic.includes.join(', ') || '-'}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{topic.excludes.join(', ') || '-'}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{topic.lang.join(', ')}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{topic.freshnessHours}h</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{topic.maxItems}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <span style={{ color: topic.enabled ? 'green' : 'red' }}>
                        {topic.enabled ? '✓' : '✗'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 style={{ marginBottom: '20px' }}>Sources ({sources.length})</h2>
        {sources.length === 0 ? (
          <p style={{ color: '#666' }}>No sources configured yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Domain</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Points</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>ID_Topics</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Last Seen</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Enabled</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id}>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{source.name}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{source.domain}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{source.type}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{source.points}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>{source.topicId || '-'}</td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      {source.lastSeenAt ? new Date(source.lastSeenAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                      <span style={{ color: source.enabled ? 'green' : 'red' }}>
                        {source.enabled ? '✓' : '✗'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
