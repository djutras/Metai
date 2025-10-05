'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [message, setMessage] = useState('');

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
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '$$$Hfyj54hfmetai') {
      setAuthenticated(true);
      setMessage('');
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
        body: JSON.stringify(sourceData),
      });

      if (response.ok) {
        setMessage('Source added successfully!');
        setSourceData({
          name: '',
          domain: '',
          type: 'custom_crawler',
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
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Admin Panel</h1>
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
