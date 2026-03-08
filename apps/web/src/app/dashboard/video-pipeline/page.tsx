'use client';

import { useEffect, useState } from 'react';
import { getApiUrl, getSession } from '@/lib/session';

interface Credits {
  totalCredits: number;
  usedCredits: number;
  remainingCredits: number;
  period: string;
}

interface RenderJob {
  id: string;
  tier: string;
  provider: string;
  inputType: string;
  status: string;
  outputUrl?: string;
  renderTimeMs?: number;
  costCredits?: number;
  createdAt: string;
}

interface ProviderInfo {
  provider: string;
  available: boolean;
  tier: string;
}

export default function VideoDashboardPage() {
  const [credits, setCredits] = useState<Credits | null>(null);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Render form
  const [script, setScript] = useState('');
  const [tier, setTier] = useState('MVP');
  const [provider, setProvider] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const headers = async () => {
    const s = await getSession();
    return {
      'Content-Type': 'application/json',
      'x-workspace-id': s.workspaceId,
      'x-user-id': s.userId,
    };
  };

  const load = async () => {
    setLoading(true);
    try {
      const s = await getSession();
      const apiUrl = getApiUrl();
      const h = await headers();

      const [credRes, jobRes, provRes] = await Promise.all([
        fetch(`${apiUrl}/api/videos/credits?workspaceId=${s.workspaceId}`, { headers: h }),
        fetch(`${apiUrl}/api/videos/render?workspaceId=${s.workspaceId}`, { headers: h }),
        fetch(`${apiUrl}/api/videos/providers`, { headers: h }),
      ]);

      if (credRes.ok) setCredits(await credRes.json());
      if (jobRes.ok) setJobs(await jobRes.json());
      if (provRes.ok) setProviders(await provRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submitRender = async () => {
    setSubmitting(true);
    try {
      const s = await getSession();
      const apiUrl = getApiUrl();
      await fetch(`${apiUrl}/api/videos/render`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({
          workspaceId: s.workspaceId,
          tier,
          provider: provider || undefined,
          script,
          inputType: 'SCRIPT',
          duration: 15,
        }),
      });
      setScript('');
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor: Record<string, string> = {
    QUEUED: 'bg-yellow-100 text-yellow-700',
    RENDERING: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
  };

  const tierColor: Record<string, string> = {
    MVP: 'bg-indigo-100 text-indigo-700',
    SELFHOST: 'bg-orange-100 text-orange-700',
    PREMIUM: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Video Pipeline</h1>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <>
          {/* Credits overview */}
          {credits && (
            <div className="grid grid-cols-3 gap-4">
              <div className="border rounded-lg p-4 bg-white text-center">
                <div className="text-3xl font-bold text-blue-600">{credits.remainingCredits}</div>
                <div className="text-xs text-gray-500 mt-1">Remaining Credits</div>
              </div>
              <div className="border rounded-lg p-4 bg-white text-center">
                <div className="text-3xl font-bold">{credits.usedCredits}</div>
                <div className="text-xs text-gray-500 mt-1">Used This Period</div>
              </div>
              <div className="border rounded-lg p-4 bg-white text-center">
                <div className="text-3xl font-bold">{credits.totalCredits}</div>
                <div className="text-xs text-gray-500 mt-1">Total ({credits.period})</div>
              </div>
            </div>
          )}

          {/* Available providers */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Available Providers</h3>
            <div className="flex gap-2 flex-wrap">
              {providers.map((p) => (
                <span key={p.provider} className={`text-xs px-3 py-1 rounded ${tierColor[p.tier] ?? 'bg-gray-100'}`}>
                  {p.provider} ({p.tier})
                </span>
              ))}
            </div>
          </div>

          {/* New render form */}
          <div className="bg-white border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Create Video Render</h3>
            <textarea
              placeholder="Enter video script..."
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              rows={3}
            />
            <div className="flex gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Tier</label>
                <select value={tier} onChange={(e) => setTier(e.target.value)} className="block border rounded px-2 py-1.5 text-sm">
                  <option value="MVP">MVP (1 credit)</option>
                  <option value="SELFHOST">Self-hosted (free)</option>
                  <option value="PREMIUM">Premium (5 credits)</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Provider (optional)</label>
                <select value={provider} onChange={(e) => setProvider(e.target.value)} className="block border rounded px-2 py-1.5 text-sm">
                  <option value="">Auto</option>
                  {providers.map((p) => (
                    <option key={p.provider} value={p.provider}>{p.provider}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={submitRender}
              disabled={!script.trim() || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Start Render'}
            </button>
          </div>

          {/* Render jobs */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Render Jobs</h3>
            {jobs.length === 0 ? (
              <p className="text-sm text-gray-400">No render jobs yet.</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {jobs.map((j) => (
                  <div key={j.id} className="flex items-center justify-between border rounded p-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${tierColor[j.tier] ?? 'bg-gray-100'}`}>
                        {j.tier}
                      </span>
                      <span className="text-xs text-gray-500">{j.provider}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColor[j.status] ?? 'bg-gray-100'}`}>
                        {j.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {j.renderTimeMs && <span>{(j.renderTimeMs / 1000).toFixed(1)}s</span>}
                      <span>{new Date(j.createdAt).toLocaleString()}</span>
                      {j.outputUrl && (
                        <a href={j.outputUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                          View
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
