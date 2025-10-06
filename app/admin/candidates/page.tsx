'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CandidateDomain {
  id: number;
  domain: string;
  discovered_via: string;
  score: number;
  robots_state: string | null;
  first_seen_at: string;
  last_seen_at: string;
  notes: string | null;
}

interface Topic {
  id: number;
  name: string;
  slug: string;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateDomain[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<{ [key: number]: string }>({});
  const [promoting, setPromoting] = useState<{ [key: number]: boolean }>({});
  const [bulkTopic, setBulkTopic] = useState('');
  const [bulkPromoting, setBulkPromoting] = useState(false);

  useEffect(() => {
    loadCandidates();
    loadTopics();
  }, []);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/.netlify/functions/get-candidate-domains');

      if (response.ok) {
        const data = await response.json();
        setCandidates(data);
      } else {
        setError('Failed to load candidate domains');
      }
    } catch (error) {
      setError('Error loading candidates: ' + error);
    } finally {
      setLoading(false);
    }
  };

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

  const handlePromote = async (candidateId: number) => {
    const topicId = selectedTopics[candidateId];

    if (!topicId) {
      setMessage('Please select a topic first');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setPromoting({ ...promoting, [candidateId]: true });
    setMessage('');

    try {
      const response = await fetch('/.netlify/functions/promote-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId, topicId: parseInt(topicId) })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`Successfully promoted ${data.domain} to sources!`);

        // Remove candidate from list
        setCandidates(candidates.filter(c => c.id !== candidateId));

        setTimeout(() => setMessage(''), 5000);
      } else {
        const errorData = await response.text();
        setMessage(`Failed to promote: ${errorData}`);
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    } finally {
      setPromoting({ ...promoting, [candidateId]: false });
    }
  };

  const handleBulkPromote = async () => {
    if (!bulkTopic) {
      setMessage('Please select a topic for bulk promotion');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    setBulkPromoting(true);
    setMessage('');

    let promoted = 0;
    let failed = 0;

    for (const candidate of candidates) {
      try {
        const response = await fetch('/.netlify/functions/promote-candidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId: candidate.id, topicId: parseInt(bulkTopic) })
        });

        if (response.ok) {
          promoted++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    setBulkPromoting(false);
    setMessage(`Successfully promoted ${promoted} candidates! ${failed > 0 ? `(${failed} failed)` : ''}`);

    // Reload candidates list
    await loadCandidates();

    setTimeout(() => setMessage(''), 5000);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '50px auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Candidate Domains</h1>
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
        <p style={{ margin: 0, color: '#666' }}>
          These are domains discovered by analyzing outbound links from your articles.
          Review them and add promising ones as new sources.
        </p>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Loading candidates...
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
        }}>
          {error}
        </div>
      )}

      {message && (
        <div style={{
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: message.includes('Success') ? '#d4edda' : '#f8d7da',
          color: message.includes('Success') ? '#155724' : '#721c24',
          borderRadius: '4px',
        }}>
          {message}
        </div>
      )}

      {!loading && !error && candidates.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No candidate domains found yet.</p>
          <p style={{ fontSize: '14px', marginTop: '10px' }}>
            Use the <Link href="/admin/discover-sources" style={{ color: '#007bff' }}>Discover Sources</Link> tool to find new domains.
          </p>
        </div>
      )}

      {!loading && !error && candidates.length > 0 && (
        <>
          <div style={{
            marginBottom: '30px',
            padding: '20px',
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ marginBottom: '15px', fontWeight: 'bold', fontSize: '16px' }}>
              Bulk Add All Candidates
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <select
                value={bulkTopic}
                onChange={(e) => setBulkTopic(e.target.value)}
                disabled={bulkPromoting}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '16px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              >
                <option value="">Select topic to add all {candidates.length} candidates...</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name} ({topic.slug})
                  </option>
                ))}
              </select>
              <button
                onClick={handleBulkPromote}
                disabled={bulkPromoting || !bulkTopic}
                style={{
                  padding: '10px 30px',
                  backgroundColor: bulkPromoting ? '#6c757d' : '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: bulkPromoting || !bulkTopic ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap'
                }}
              >
                {bulkPromoting ? 'Adding All...' : 'Add All'}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '20px', color: '#666' }}>
            <strong>{candidates.length}</strong> candidate domain{candidates.length !== 1 ? 's' : ''} found
          </div>

          <div style={{ overflowX: 'auto' }}>
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
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>First Seen</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Last Seen</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Add to Topic</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <tr key={candidate.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>
                      <a
                        href={`https://${candidate.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#007bff', textDecoration: 'none', wordBreak: 'break-all' }}
                      >
                        {candidate.domain}
                      </a>
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                      {candidate.discovered_via || 'N/A'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                      {candidate.score || 0}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                      {formatDate(candidate.first_seen_at)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                      {formatDate(candidate.last_seen_at)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          value={selectedTopics[candidate.id] || ''}
                          onChange={(e) => setSelectedTopics({ ...selectedTopics, [candidate.id]: e.target.value })}
                          disabled={promoting[candidate.id]}
                          style={{
                            padding: '6px 10px',
                            fontSize: '14px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            flex: 1
                          }}
                        >
                          <option value="">Select topic...</option>
                          {topics.map((topic) => (
                            <option key={topic.id} value={topic.id}>
                              {topic.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handlePromote(candidate.id)}
                          disabled={promoting[candidate.id] || !selectedTopics[candidate.id]}
                          style={{
                            padding: '6px 16px',
                            backgroundColor: promoting[candidate.id] ? '#6c757d' : '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: promoting[candidate.id] || !selectedTopics[candidate.id] ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {promoting[candidate.id] ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
