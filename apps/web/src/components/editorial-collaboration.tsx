'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string };
  replies?: Comment[];
}

interface Assignment {
  id: string;
  role: string;
  status: string;
  assignedUser: { id: string; name: string | null; email: string };
}

interface ApprovalStep {
  id: string;
  stepOrder: number;
  status: string;
  comment: string | null;
  decidedAt: string | null;
  approver: { id: string; name: string | null; email: string };
}

export function EditorialCollaboration({ runId, currentUserId }: { runId: string; currentUserId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'comments' | 'team' | 'approval'>('comments');

  const apiBase = typeof window !== 'undefined' ? '' : getApiUrl();

  useEffect(() => {
    loadData();
  }, [runId]);

  async function loadData() {
    try {
      const [commentsRes, assignRes, approvalRes] = await Promise.all([
        fetch(`${apiBase}/api/editorial/run/${runId}/comments`),
        fetch(`${apiBase}/api/editorial/run/${runId}/assignments`),
        fetch(`${apiBase}/api/editorial/run/${runId}/approval-chain`),
      ]);
      if (commentsRes.ok) setComments(await commentsRes.json());
      if (assignRes.ok) setAssignments(await assignRes.json());
      if (approvalRes.ok) setApprovalSteps(await approvalRes.json());
    } catch { /* ignore */ }
  }

  async function handlePostComment(parentId?: string) {
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/editorial/run/${runId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, content: newComment, parentId }),
      });
      if (res.ok) {
        setNewComment('');
        await loadData();
      }
    } finally { setLoading(false); }
  }

  const TABS = [
    { key: 'comments' as const, label: '💬 Comentarios', count: comments.length },
    { key: 'team' as const, label: '👥 Equipo', count: assignments.length },
    { key: 'approval' as const, label: '✅ Aprobación', count: approvalSteps.length },
  ];

  return (
    <div className="bg-white rounded-lg border">
      <div className="flex border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              tab === t.key ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label} {t.count > 0 && <span className="ml-1 text-xs bg-gray-100 rounded-full px-2">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === 'comments' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe un comentario..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
              />
              <button
                onClick={() => handlePostComment()}
                disabled={loading || !newComment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Enviar
              </button>
            </div>

            {comments.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin comentarios aún</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => (
                  <div key={c.id} className="space-y-2">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span className="font-medium text-gray-700">{c.user.name ?? c.user.email}</span>
                        <span>{new Date(c.createdAt).toLocaleString('es-ES')}</span>
                      </div>
                      <p className="text-sm">{c.content}</p>
                    </div>
                    {c.replies && c.replies.length > 0 && (
                      <div className="ml-6 space-y-2">
                        {c.replies.map((r) => (
                          <div key={r.id} className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                              <span className="font-medium text-gray-700">{r.user.name ?? r.user.email}</span>
                              <span>{new Date(r.createdAt).toLocaleString('es-ES')}</span>
                            </div>
                            <p className="text-sm">{r.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'team' && (
          <div className="space-y-3">
            {assignments.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin asignaciones</p>
            ) : (
              assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <span className="text-sm font-medium">{a.assignedUser.name ?? a.assignedUser.email}</span>
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{a.role}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    a.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    a.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{a.status}</span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'approval' && (
          <div className="space-y-3">
            {approvalSteps.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin cadena de aprobación configurada</p>
            ) : (
              approvalSteps.map((s) => (
                <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    s.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    s.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-gray-200 text-gray-500'
                  }`}>{s.stepOrder}</div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{s.approver.name ?? s.approver.email}</span>
                    {s.comment && <p className="text-xs text-gray-500 mt-0.5">{s.comment}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    s.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    s.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{s.status}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
