'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Topic {
  id: number;
  name: string;
  slug: string;
}

interface Discovery {
  domain: string;
  discovered_via: string;
  discovered_in: string;
  score: number;
  has_sitemap: boolean;
  has_rss: boolean;
  https_enabled: boolean;
}

interface DiscoveryResult {
  discoveries: Discovery[];
  total_articles_analyzed: number;
  total_domains_discovered: number;
}

export default function DiscoverSourcesPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [discovering, setDiscovering] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-topics');
      if (response.ok) {
        const data = await response.json();
        setTopics(data);
        if (data.length > 0) {
          setSelectedTopicId(data[0].id.toString());
        }
      }
    } catch (error) {
      console.error('Failed to load topics:', error);
    }
  };

  const handleDiscover = async () => {
    if (!selectedTopicId) {
      setError('Please select a topic');
      return;
    }

    setDiscovering(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/.netlify/functions/discover-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: parseInt(selectedTopicId) })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        const errorData = await response.text();
        setError(`Discovery failed: ${errorData}`);
      }
    } catch (error) {
      setError(`Error: ${error}`);
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '50px auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Discover New Sources</h1>
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

      <div style={{
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '30px'
      }}>
        <p style={{ marginBottom: '20px', color: '#666' }}>
          This tool analyzes recent articles from your sources to discover new obscure websites
          that they link to. Sources that find good new sites earn discovery points.
        </p>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Select Topic:
            </label>
            <select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              disabled={discovering}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                borderRadius: '4px',
                border: '1px solid #ccc',
              }}
            >
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name} ({topic.slug})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDiscover}
            disabled={discovering || !selectedTopicId}
            style={{
              padding: '10px 30px',
              backgroundColor: discovering ? '#6c757d' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: discovering ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            {discovering ? 'Discovering...' : 'Discover Sources'}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '10px',
            marginBottom: '20px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
          }}
        >
          {error}
        </div>
      )}

      {discovering && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>Analyzing articles and discovering new sources...</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>This may take 1-2 minutes</p>
        </div>
      )}

      {result && (
        <>
          <div style={{
            padding: '20px',
            backgroundColor: '#d4edda',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h3 style={{ marginTop: 0 }}>Discovery Complete!</h3>
            <p style={{ margin: '10px 0' }}>
              Analyzed <strong>{result.total_articles_analyzed}</strong> articles
            </p>
            <p style={{ margin: '10px 0' }}>
              Found <strong>{result.total_domains_discovered}</strong> new potential sources
            </p>
          </div>

          {result.discoveries.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <h2>Discovered Websites</h2>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Domain</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Discovered Via</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Score</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Features</th>
                  </tr>
                </thead>
                <tbody>
                  {result.discoveries
                    .sort((a, b) => b.score - a.score)
                    .map((discovery, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #dee2e6' }}>
                        <td style={{ padding: '12px' }}>
                          <a
                            href={`https://${discovery.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#007bff', textDecoration: 'none' }}
                          >
                            {discovery.domain}
                          </a>
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                          {discovery.discovered_via}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                          {discovery.score}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            {discovery.has_sitemap && (
                              <span style={{ fontSize: '12px', padding: '2px 6px', backgroundColor: '#28a745', color: '#fff', borderRadius: '3px' }}>
                                Sitemap
                              </span>
                            )}
                            {discovery.has_rss && (
                              <span style={{ fontSize: '12px', padding: '2px 6px', backgroundColor: '#17a2b8', color: '#fff', borderRadius: '3px' }}>
                                RSS
                              </span>
                            )}
                            {discovery.https_enabled && (
                              <span style={{ fontSize: '12px', padding: '2px 6px', backgroundColor: '#6c757d', color: '#fff', borderRadius: '3px' }}>
                                HTTPS
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
              No new sources discovered. Try analyzing a different topic or wait for more articles to be crawled.
            </p>
          )}
        </>
      )}
    </div>
  );
}
