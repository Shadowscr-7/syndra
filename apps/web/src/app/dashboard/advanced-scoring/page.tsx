'use client';

import { useState } from 'react';
import { getApiUrl, getSession } from '@/lib/session';

interface AdvancedScoreResult {
  overall: number;
  confidence: number;
  breakdown: Array<{ factor: string; impact: number; detail: string }>;
  channelScores: Record<string, number>;
  industryComparison: { yours: number; industry: number; percentile: string };
  seasonal: { currentEvents: string[]; seasonalBoost: number };
  recommendations: string[];
}

export default function AdvancedScoringPage() {
  const [format, setFormat] = useState('');
  const [tone, setTone] = useState('');
  const [channel, setChannel] = useState('');
  const [hour, setHour] = useState('');
  const [day, setDay] = useState('');
  const [industry, setIndustry] = useState('');
  const [result, setResult] = useState<AdvancedScoreResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runScore = async () => {
    setLoading(true);
    try {
      const s = await getSession();
      const apiUrl = getApiUrl();
      const params = new URLSearchParams({ workspaceId: s.workspaceId });
      if (format) params.set('format', format);
      if (tone) params.set('tone', tone);
      if (channel) params.set('channel', channel);
      if (hour) params.set('hour', hour);
      if (day) params.set('day', day);
      if (industry) params.set('industry', industry);

      const res = await fetch(`${apiUrl}/api/analytics/advanced-score?${params}`, {
        headers: {
          'x-workspace-id': s.workspaceId,
          'x-user-id': s.userId,
        },
      });
      if (res.ok) setResult(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const impactColor = (v: number) =>
    v > 10 ? 'text-green-700 bg-green-50' : v < -10 ? 'text-red-700 bg-red-50' : 'text-gray-700 bg-gray-50';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Advanced Scoring</h1>
      <p className="text-sm text-gray-500">
        Predict engagement with contextual signals, per-channel breakdown, seasonality, and industry benchmarks.
      </p>

      {/* Input form */}
      <div className="bg-white border rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
            <option value="">Any</option>
            {['POST', 'CAROUSEL', 'REEL', 'STORY', 'THREAD', 'ARTICLE', 'VIDEO'].map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Tone</label>
          <select value={tone} onChange={(e) => setTone(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
            <option value="">Any</option>
            {['professional', 'casual', 'humorous', 'educational', 'inspirational'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Channel</label>
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
            <option value="">Any</option>
            {['instagram', 'facebook', 'threads', 'discord', 'twitter', 'linkedin', 'tiktok'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Hour (0-23)</label>
          <input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm" placeholder="e.g. 14" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Day (0=Sun)</label>
          <select value={day} onChange={(e) => setDay(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
            <option value="">Any</option>
            {['0-Sun', '1-Mon', '2-Tue', '3-Wed', '4-Thu', '5-Fri', '6-Sat'].map((d) => (
              <option key={d} value={d.split('-')[0]}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Industry</label>
          <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full border rounded px-2 py-1.5 text-sm">
            <option value="">Default</option>
            {['technology', 'ecommerce', 'education', 'health', 'finance', 'entertainment', 'food', 'travel'].map((i) => (
              <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={runScore}
        disabled={loading}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
      >
        {loading ? 'Calculating...' : 'Calculate Score'}
      </button>

      {result && (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="flex items-center gap-6 bg-white border rounded-lg p-5">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">{result.overall}%</div>
              <div className="text-xs text-gray-400 mt-1">Expected Engagement</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">{Math.round(result.confidence * 100)}%</div>
              <div className="text-xs text-gray-400 mt-1">Confidence</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-semibold ${result.industryComparison.percentile.includes('top') ? 'text-green-600' : result.industryComparison.percentile.includes('below') || result.industryComparison.percentile.includes('bottom') ? 'text-red-600' : 'text-gray-700'}`}>
                {result.industryComparison.percentile}
              </div>
              <div className="text-xs text-gray-400 mt-1">vs Industry ({result.industryComparison.industry}%)</div>
            </div>
          </div>

          {/* Breakdown */}
          {result.breakdown.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Score Breakdown</h3>
              <div className="space-y-2">
                {result.breakdown.map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-20">{b.factor}</span>
                    <span className={`text-sm px-2 py-0.5 rounded ${impactColor(b.impact)}`}>
                      {b.impact > 0 ? '+' : ''}{b.impact}%
                    </span>
                    <span className="text-sm text-gray-500">{b.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Channel Scores */}
          {Object.keys(result.channelScores).length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Per-Channel Scores</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(result.channelScores).sort((a, b) => b[1] - a[1]).map(([ch, val]) => (
                  <div key={ch} className="border rounded p-3 text-center">
                    <div className="text-lg font-bold">{val}%</div>
                    <div className="text-xs text-gray-500 capitalize">{ch}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seasonal */}
          {result.seasonal.currentEvents.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Seasonal Context</h3>
              <p className="text-sm text-yellow-700">
                Active events: <strong>{result.seasonal.currentEvents.join(', ')}</strong> — estimated boost: +{result.seasonal.seasonalBoost}%
              </p>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Recommendations</h3>
              <ul className="space-y-1">
                {result.recommendations.map((r, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">→</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
