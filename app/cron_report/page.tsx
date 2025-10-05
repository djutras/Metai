'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CrawlRun {
  id: string;
  workflowName: string;
  runId: string | null;
  startedAt: string;
  metadata: {
    runNumber?: string;
    actor?: string;
    eventName?: string;
    triggeredAt?: string;
  } | null;
}

export default function CronReportPage() {
  const [crawlRuns, setCrawlRuns] = useState<CrawlRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCrawlRuns();
  }, []);

  const fetchCrawlRuns = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-crawl-runs');
      if (response.ok) {
        const data = await response.json();
        setCrawlRuns(data);
      } else {
        setError('Failed to load crawl runs');
      }
    } catch (err) {
      setError('Error loading crawl runs: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '50px auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Cron Report</h1>
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

      {loading && <p>Loading crawl runs...</p>}

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

      {!loading && !error && (
        <>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            Showing last {crawlRuns.length} crawl runs (most recent first)
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>ID</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Workflow</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Started At</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Run #</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Actor</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Event</th>
                </tr>
              </thead>
              <tbody>
                {crawlRuns.map((run) => (
                  <tr key={run.id} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '12px' }}>{run.id}</td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>{run.workflowName}</td>
                    <td style={{ padding: '12px' }}>{formatDate(run.startedAt)}</td>
                    <td style={{ padding: '12px' }}>{run.metadata?.runNumber || '-'}</td>
                    <td style={{ padding: '12px' }}>{run.metadata?.actor || '-'}</td>
                    <td style={{ padding: '12px' }}>{run.metadata?.eventName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {crawlRuns.length === 0 && (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
              No crawl runs recorded yet.
            </p>
          )}
        </>
      )}
    </div>
  );
}
