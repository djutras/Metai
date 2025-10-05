'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Topic {
  id: number;
  name: string;
  slug: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [message, setMessage] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);

  // Check for existing session on mount
  useEffect(() => {
    const authExpiry = localStorage.getItem('adminAuthExpiry');
    if (authExpiry) {
      const expiryTime = parseInt(authExpiry);
      if (Date.now() < expiryTime) {
        setAuthenticated(true);
      } else {
        localStorage.removeItem('adminAuthExpiry');
      }
    }
  }, []);

  // Load topics when authenticated
  useEffect(() => {
    if (authenticated) {
      loadTopics();
    }
  }, [authenticated]);

  const loadTopics = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-topics');
      if (response.ok) {
        const data = await response.json();
        setTopics(data);
      }
    } catch (error) {
      console.error('Failed to load topics:', error);
    }
  };

  // Topic form state
  const [topicData, setTopicData] = useState({
    slug: '',
    name: '',
    query: '',
    includes: '',
    excludes: '',
    lang: 'en',
    freshnessHours: 72,
    maxItems: 30,
  });

  // Source form state
  const [sourceData, setSourceData] = useState({
    name: '',
    domain: '',
    type: 'custom_crawler',
    topicId: '',
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '$$$Hfyj54hfmetai') {
      setAuthenticated(true);
      setMessage('');
      // Set expiry time to 1 hour from now
      const expiryTime = Date.now() + (60 * 60 * 1000); // 1 hour in milliseconds
      localStorage.setItem('adminAuthExpiry', expiryTime.toString());
    } else {
      setMessage('Invalid password');
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/.netlify/functions/add-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...topicData,
          includes: topicData.includes ? topicData.includes.split(',').map(s => s.trim()) : [],
          excludes: topicData.excludes ? topicData.excludes.split(',').map(s => s.trim()) : [],
          lang: [topicData.lang],
        }),
      });

      if (response.ok) {
        setMessage('Topic added successfully!');
        setTopicData({
          slug: '',
          name: '',
          query: '',
          includes: '',
          excludes: '',
          lang: 'en',
          freshnessHours: 72,
          maxItems: 30,
        });
        // Reload topics to update the dropdown
        loadTopics();
      } else {
        const error = await response.text();
        setMessage('Failed to add topic: ' + error);
      }
    } catch (error) {
      setMessage('Error: ' + error);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/.netlify/functions/add-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...sourceData,
          topicId: sourceData.topicId ? parseInt(sourceData.topicId) : null,
        }),
      });

      if (response.ok) {
        setMessage('Source added successfully!');
        setSourceData({
          name: '',
          domain: '',
          type: 'custom_crawler',
          topicId: '',
        });
      } else {
        const error = await response.text();
        setMessage('Failed to add source: ' + error);
      }
    } catch (error) {
      setMessage('Error: ' + error);
    }
  };

  if (!authenticated) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
        <h1 style={{ marginBottom: '20px' }}>Admin Login</h1>
        <form onSubmit={handleLogin}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
            }}
          />
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Login
          </button>
          {message && <p style={{ color: 'red', marginTop: '10px' }}>{message}</p>}
        </form>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '50px auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '20px' }}>Admin Panel</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/cron_report"
            style={{
              padding: '10px 20px',
              backgroundColor: '#000',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '4px',
            }}
          >
            Cron Report
          </Link>
          <Link
            href="/search_configured"
            style={{
              padding: '10px 20px',
              backgroundColor: '#000',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '4px',
            }}
          >
            Search Configured
          </Link>
        </div>
      </div>

      {message && (
        <div
          style={{
            padding: '10px',
            marginBottom: '20px',
            backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
            color: message.includes('success') ? '#155724' : '#721c24',
            borderRadius: '4px',
          }}
        >
          {message}
        </div>
      )}

      <div style={{ marginBottom: '50px' }}>
        <h2 style={{ marginBottom: '20px' }}>Add Topic</h2>
        <form onSubmit={handleAddTopic}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Slug (URL-friendly):</label>
            <input
              type="text"
              value={topicData.slug}
              onChange={(e) => setTopicData({ ...topicData, slug: e.target.value })}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
            <input
              type="text"
              value={topicData.name}
              onChange={(e) => setTopicData({ ...topicData, name: e.target.value })}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Query (keywords):</label>
            <input
              type="text"
              value={topicData.query}
              onChange={(e) => setTopicData({ ...topicData, query: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Includes (comma-separated):</label>
            <input
              type="text"
              value={topicData.includes}
              onChange={(e) => setTopicData({ ...topicData, includes: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Excludes (comma-separated):</label>
            <input
              type="text"
              value={topicData.excludes}
              onChange={(e) => setTopicData({ ...topicData, excludes: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Language:</label>
            <select
              value={topicData.lang}
              onChange={(e) => setTopicData({ ...topicData, lang: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="de">German</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Freshness Hours:</label>
            <input
              type="number"
              value={topicData.freshnessHours}
              onChange={(e) => setTopicData({ ...topicData, freshnessHours: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Max Items:</label>
            <input
              type="number"
              value={topicData.maxItems}
              onChange={(e) => setTopicData({ ...topicData, maxItems: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Add Topic
          </button>
        </form>
      </div>

      <div>
        <h2 style={{ marginBottom: '20px' }}>Add Source</h2>
        <form onSubmit={handleAddSource}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Name:</label>
            <input
              type="text"
              value={sourceData.name}
              onChange={(e) => setSourceData({ ...sourceData, name: e.target.value })}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Domain:</label>
            <input
              type="text"
              value={sourceData.domain}
              onChange={(e) => setSourceData({ ...sourceData, domain: e.target.value })}
              required
              placeholder="example.com"
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Type:</label>
            <select
              value={sourceData.type}
              onChange={(e) => setSourceData({ ...sourceData, type: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="custom_crawler">Custom Crawler</option>
            </select>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Topic (required):</label>
            <select
              value={sourceData.topicId}
              onChange={(e) => setSourceData({ ...sourceData, topicId: e.target.value })}
              required
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">Select a topic...</option>
              {topics.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {topic.name} ({topic.slug})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Add Source
          </button>
        </form>
      </div>
    </div>
  );
}
