'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Crawl {
  id: string;
  topic_id: number;
  topic_name: string;
  started_at: string;
  finished_at: string | null;
  ok_bool: boolean | null;
  stats_json: {
    kept?: number;
    skippedDuplicates?: number;
    skippedQuality?: number;
    errors?: number;
  } | null;
}

interface Article {
  id: string;
  title: string;
  url: string;
  published_at: string;
  added_at: string;
}

interface SourceResult {
  source_id: number | null;
  source_name: string;
  source_domain: string;
  consecutive_failures: number;
  last_failure_at: string | null;
  last_success_at: string | null;
  failure_reason: string | null;
  articles: Article[];
}

interface CrawlReport {
  crawl: Crawl;
  sources: SourceResult[];
  total_articles: number;
}

export default function CrawlReportPage() {
  const [crawls, setCrawls] = useState<Crawl[]>([]);
  const [selectedCrawlId, setSelectedCrawlId] = useState<string>('');
  const [report, setReport] = useState<CrawlReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCrawls();
  }, []);

  useEffect(() => {
    if (selectedCrawlId) {
      fetchCrawlReport(selectedCrawlId);
    }
  }, [selectedCrawlId]);

  const fetchCrawls = async () => {
    try {
      const response = await fetch('/.netlify/functions/get-crawl-report');
      if (response.ok) {
        const data = await response.json();
        setCrawls(data);
        if (data.length > 0) {
          setSelectedCrawlId(data[0].id);
        }
      } else {
        setError('Failed to load crawls');
      }
    } catch (err) {
      setError('Error loading crawls: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCrawlReport = async (crawlId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/.netlify/functions/get-crawl-report?crawlId=${crawlId}`);
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      } else {
        setError('Failed to load crawl report');
      }
    } catch (err) {
      setError('Error loading crawl report: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '50px auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Crawl Report</h1>
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

      {/* Crawl Selector */}
      <div style={{ marginBottom: '30px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Select Crawl (Last 48 hours):
        </label>
        <select
          value={selectedCrawlId}
          onChange={(e) => setSelectedCrawlId(e.target.value)}
          style={{
            padding: '10px',
            fontSize: '16px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            minWidth: '400px',
          }}
        >
          {crawls.map((crawl) => (
            <option key={crawl.id} value={crawl.id}>
              #{crawl.id} - {crawl.topic_name} - {formatDate(crawl.started_at)}
              {crawl.stats_json && ` (${crawl.stats_json.kept || 0} articles)`}
            </option>
          ))}
        </select>
      </div>

      {loading && <p>Loading report...</p>}

      {!loading && report && (
        <>
          {/* Crawl Summary */}
          <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h2 style={{ marginTop: 0 }}>Crawl Summary</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div>
                <strong>Topic:</strong> {report.crawl.topic_name}
              </div>
              <div>
                <strong>Started:</strong> {formatDate(report.crawl.started_at)}
              </div>
              <div>
                <strong>Finished:</strong> {report.crawl.finished_at ? formatDate(report.crawl.finished_at) : 'In progress'}
              </div>
              <div>
                <strong>Status:</strong> {report.crawl.ok_bool ? '✅ Success' : report.crawl.ok_bool === false ? '❌ Failed' : '⏳ Running'}
              </div>
              {report.crawl.stats_json && (
                <>
                  <div>
                    <strong>Kept:</strong> {report.crawl.stats_json.kept || 0}
                  </div>
                  <div>
                    <strong>Duplicates:</strong> {report.crawl.stats_json.skippedDuplicates || 0}
                  </div>
                  <div>
                    <strong>Quality Filtered:</strong> {report.crawl.stats_json.skippedQuality || 0}
                  </div>
                  <div>
                    <strong>Errors:</strong> {report.crawl.stats_json.errors || 0}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sources and Articles Table */}
          <h2>Articles by Source ({report.total_articles} total)</h2>
          {report.sources.length === 0 ? (
            <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>
              No articles found for this crawl.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', width: '200px' }}>Source</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Article Title</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', width: '140px' }}>Published</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold', width: '140px' }}>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sources.map((source) => {
                    // Helper function to render failure badge
                    const renderFailureBadge = (failures: number, reason: string | null) => {
                      if (failures === 0) return null;
                      const color = failures >= 15 ? '#dc3545' : failures >= 5 ? '#ffc107' : '#6c757d';
                      return (
                        <div style={{ fontSize: '11px', color, marginTop: '4px' }}>
                          ⚠️ {failures} failures {reason && `(${reason})`}
                        </div>
                      );
                    };

                    // Handle sources with no articles
                    if (source.articles.length === 0) {
                      return (
                        <tr key={`${source.source_id}-no-articles`} style={{ borderBottom: '1px solid #dee2e6' }}>
                          <td
                            style={{
                              padding: '12px',
                              fontWeight: 'bold',
                              backgroundColor: '#f8f9fa',
                              verticalAlign: 'top',
                              borderRight: '2px solid #dee2e6',
                            }}
                          >
                            <div>{source.source_name}</div>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                              {source.source_domain}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                              (0 articles)
                            </div>
                            {renderFailureBadge(source.consecutive_failures, source.failure_reason)}
                          </td>
                          <td colSpan={3} style={{ padding: '12px', color: '#999', fontStyle: 'italic' }}>
                            No articles found
                          </td>
                        </tr>
                      );
                    }

                    // Handle sources with articles (existing logic)
                    return source.articles.map((article, articleIndex) => (
                      <tr key={`${source.source_id}-${article.id}`} style={{ borderBottom: '1px solid #dee2e6' }}>
                        {articleIndex === 0 ? (
                          <td
                            rowSpan={source.articles.length}
                            style={{
                              padding: '12px',
                              fontWeight: 'bold',
                              backgroundColor: '#f8f9fa',
                              verticalAlign: 'top',
                              borderRight: '2px solid #dee2e6',
                            }}
                          >
                            <div>{source.source_name}</div>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                              {source.source_domain}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                              ({source.articles.length} articles)
                            </div>
                            {renderFailureBadge(source.consecutive_failures, source.failure_reason)}
                          </td>
                        ) : null}
                        <td style={{ padding: '12px' }}>
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#007bff', textDecoration: 'none' }}
                          >
                            {article.title}
                          </a>
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                          {formatDate(article.published_at)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#666' }}>
                          {formatDate(article.added_at)}
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {!loading && crawls.length === 0 && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
          No crawls found in the last 48 hours.
        </p>
      )}
    </div>
  );
}
