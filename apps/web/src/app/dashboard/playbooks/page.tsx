'use client';

import { useEffect, useState } from 'react';
import { getApiUrl, getSession } from '@/lib/session';

interface Playbook {
  id: string;
  name: string;
  description?: string;
  rules: Record<string, unknown>;
  formatMix: Array<{ format: string; percentage: number }>;
  preferredCTAs: string[];
  usageCount: number;
  isPublic: boolean;
  createdAt: string;
}

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [publicPlaybooks, setPublicPlaybooks] = useState<Playbook[]>([]);
  const [tab, setTab] = useState<'mine' | 'public'>('mine');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const s = await getSession();
      const apiUrl = getApiUrl();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-workspace-id': s.workspaceId,
        'x-user-id': s.userId,
      };

      const [mineRes, pubRes] = await Promise.all([
        fetch(`${apiUrl}/api/playbooks`, { headers }),
        fetch(`${apiUrl}/api/playbooks/public`, { headers }),
      ]);

      if (mineRes.ok) setPlaybooks(await mineRes.json());
      if (pubRes.ok) setPublicPlaybooks(await pubRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    const s = await getSession();
    const apiUrl = getApiUrl();
    await fetch(`${apiUrl}/api/playbooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': s.workspaceId,
        'x-user-id': s.userId,
      },
      body: JSON.stringify({ name, description, isPublic }),
    });
    setName('');
    setDescription('');
    setShowCreate(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const s = await getSession();
    const apiUrl = getApiUrl();
    await fetch(`${apiUrl}/api/playbooks/${id}`, {
      method: 'DELETE',
      headers: {
        'x-workspace-id': s.workspaceId,
        'x-user-id': s.userId,
      },
    });
    load();
  };

  const togglePublic = async (pb: Playbook) => {
    const s = await getSession();
    const apiUrl = getApiUrl();
    await fetch(`${apiUrl}/api/playbooks/${pb.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-workspace-id': s.workspaceId,
        'x-user-id': s.userId,
      },
      body: JSON.stringify({ isPublic: !pb.isPublic }),
    });
    load();
  };

  const displayed = tab === 'mine' ? playbooks : publicPlaybooks;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Content Playbooks</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          + New Playbook
        </button>
      </div>

      {showCreate && (
        <div className="bg-white border rounded-lg p-4 space-y-3">
          <input
            placeholder="Playbook name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            rows={2}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Make public (share in marketplace)
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded text-sm disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-gray-200 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['mine', 'public'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'mine' ? 'My Playbooks' : 'Public Marketplace'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : displayed.length === 0 ? (
        <p className="text-gray-400 text-sm">No playbooks found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayed.map((pb) => (
            <div key={pb.id} className="border rounded-lg p-4 bg-white space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{pb.name}</h3>
                  {pb.description && (
                    <p className="text-sm text-gray-500 mt-1">{pb.description}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  {pb.isPublic && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Public
                    </span>
                  )}
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    Used {pb.usageCount}×
                  </span>
                </div>
              </div>

              {/* Format mix */}
              {pb.formatMix && pb.formatMix.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Format Mix</p>
                  <div className="flex gap-1 flex-wrap">
                    {pb.formatMix.map((f, i) => (
                      <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                        {f.format} {f.percentage}%
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Rules */}
              {pb.rules && Object.keys(pb.rules).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Rules</p>
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(pb.rules).slice(0, 5).map(([k, v]) => (
                      <span key={k} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
                        {k}: {Array.isArray(v) ? v.join(', ') : String(v)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTAs */}
              {pb.preferredCTAs && pb.preferredCTAs.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">CTAs</p>
                  <div className="flex gap-1 flex-wrap">
                    {pb.preferredCTAs.map((c, i) => (
                      <span key={i} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                {tab === 'mine' && (
                  <>
                    <button
                      onClick={() => togglePublic(pb)}
                      className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
                    >
                      {pb.isPublic ? 'Make Private' : 'Share'}
                    </button>
                    <button
                      onClick={() => handleDelete(pb.id)}
                      className="text-xs px-3 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
