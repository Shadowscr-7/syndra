'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Ticket, Plus, Clock, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';

export default function UserSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [priority, setPriority] = useState('NORMAL');
  const [attachment, setAttachment] = useState(''); // Just a URL for now
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/support/tickets');
      if (res.ok) {
        const { data } = await res.json();
        setTickets(data || []);
      }
    } catch (err) {
      console.error('Error fetching tickets', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, content, category, priority, attachmentUrl: attachment }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setTickets([data, ...tickets]);
        setIsModalOpen(false);
        setSubject('');
        setContent('');
        setAttachment('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN': return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Abierto</span>;
      case 'IN_PROGRESS': return <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-1"><Clock className="w-3 h-3"/> En progreso</span>;
      case 'WAITING_ON_USER': return <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-1"><MessageCircle className="w-3 h-3"/> Requiere tu respuesta</span>;
      case 'RESOLVED': return <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Resuelto</span>;
      case 'CLOSED': return <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded">Cerrado</span>;
      default: return null;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-indigo-600" />
            Soporte y Mesa de Ayuda
          </h1>
          <p className="text-gray-500 mt-1">¿Tienes algún problema? Sube un ticket y lo resolveremos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Abre un Ticket
        </button>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No tienes tickets abiertos</h3>
          <p className="text-gray-500 mt-1">Si encuentras algún bug o tienes una solicitud, crea uno nuevo.</p>
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4 font-medium text-gray-600 text-sm">Asunto</th>
                <th className="p-4 font-medium text-gray-600 text-sm w-32">Estado</th>
                <th className="p-4 font-medium text-gray-600 text-sm w-32">Prioridad</th>
                <th className="p-4 font-medium text-gray-600 text-sm w-48 hidden sm:table-cell">Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr 
                  key={t.id} 
                  onClick={() => router.push(`/dashboard/support/${t.id}`)}
                  className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="p-4 font-medium text-gray-900">{t.subject}</td>
                  <td className="p-4">{getStatusBadge(t.status)}</td>
                  <td className="p-4 text-sm text-gray-500">{t.priority}</td>
                  <td className="p-4 text-sm text-gray-500 hidden sm:table-cell">{new Date(t.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Crear Ticket */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">Abrir un Ticket</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                <input 
                  required
                  value={subject} onChange={e => setSubject(e.target.value)}
                  className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Ej: Problemas añadiendo cuenta de Instagram"
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select 
                    value={category} onChange={e => setCategory(e.target.value)}
                    className="w-full border rounded-lg p-2 outline-none bg-white"
                  >
                    <option value="BUG">Bug Técnico</option>
                    <option value="BILLING">Facturación</option>
                    <option value="FEATURE_REQUEST">Nueva Funcionalidad</option>
                    <option value="GENERAL_INQUIRY">Consulta Común</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <select 
                    value={priority} onChange={e => setPriority(e.target.value)}
                    className="w-full border rounded-lg p-2 outline-none bg-white"
                  >
                    <option value="LOW">Baja (No bloquea uso)</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta (Dificulta uso normal)</option>
                    <option value="URGENT">Urgente (Bloqueo Total)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción Detallada</label>
                <textarea 
                  required
                  value={content} onChange={e => setContent(e.target.value)}
                  className="w-full border rounded-lg p-2 h-32 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Describe exactamente qué ocurrió y cómo reproducirlo..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Archivo Adjunto (Opcional, de Cloudinary u otro)</label>
                <input 
                  value={attachment} onChange={e => setAttachment(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm outline-none"
                  placeholder="https://..."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button disabled={isSubmitting} type="submit" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50">
                  {isSubmitting ? 'Enviando...' : 'Enviar Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
