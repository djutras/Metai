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

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCandidates();
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
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', width: '25%' }}>Domain</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', width: '20%' }}>Discovered Via</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', width: '10%' }}>Score</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', width: '15%' }}>First Seen</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', width: '15%' }}>Last Seen</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', width: '15%' }}>Notes</th>
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
                    <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                      {candidate.notes || '-'}
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
