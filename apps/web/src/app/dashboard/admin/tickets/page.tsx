'use client';

import { useEffect, useState } from 'react';
import { Ticket, Search, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [attachment, setAttachment] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/admin/tickets');
      if (res.ok) {
        const { data } = await res.json();
        setTickets(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTicketDetails = async (id: string) => {
    setSelectedTicket(null); // loading state
    try {
      const res = await fetch(`/api/admin/tickets/${id}`);
      if (res.ok) {
        const { data } = await res.json();
        setSelectedTicket(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const { data } = await res.json();
        setSelectedTicket({ ...selectedTicket, status: data.status });
        // Update list
        setTickets(tickets.map(t => t.id === data.id ? { ...t, status: data.status } : t));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !selectedTicket) return;
    try {
      const res = await fetch(`/api/admin/tickets/${selectedTicket.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply, attachmentUrl: attachment }),
      });
      if (res.ok) {
        setReply('');
        setAttachment('');
        await fetchTicketDetails(selectedTicket.id);
        // Refresh the list to update status if it changed
        fetchTickets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-60px)] flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ticket className="w-6 h-6 text-indigo-600" /> Control de Soporte
          </h1>
          <p className="text-gray-500">Bandeja de entrada administrativa de tickets.</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Lado izquierdo: Lista de tickets */}
        <div className="w-1/3 bg-white border rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700">Cola de Tickets ({tickets.length})</h3>
            <button onClick={fetchTickets} className="text-sm text-indigo-600 hover:underline">Actualizar</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">Cargando...</div>
            ) : tickets.length === 0 ? (
              <div className="p-10 text-center text-gray-400">Bandeja vacía 🎉</div>
            ) : (
              tickets.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => fetchTicketDetails(t.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-indigo-50 transition-colors ${selectedTicket?.id === t.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900 truncate pr-2">{t.subject}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${t.priority === 'URGENT' ? 'bg-red-100 text-red-700' : t.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>{t.priority}</span>
                  </div>
                  <div className="text-sm text-gray-500 flex justify-between items-center">
                    <span className="truncate">{t.createdBy?.email} • WS: {t.workspace?.name}</span>
                  </div>
                  <div className="mt-2 text-xs">
                    <span className={`px-2 py-0.5 rounded ${t.status === 'OPEN' ? 'bg-blue-100 text-blue-700' : t.status === 'WAITING_ON_USER' ? 'bg-purple-100 text-purple-700' : t.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>{t.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lado derecho: Detalles y Chat */}
        <div className="flex-1 bg-white border rounded-xl flex flex-col overflow-hidden shadow-sm">
          {selectedTicket ? (
            <>
              {/* Header */}
              <div className="p-5 border-b bg-gray-50 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedTicket.subject}</h2>
                  <p className="text-sm text-gray-500 mt-1">Reportado por: {selectedTicket.createdBy?.name} ({selectedTicket.createdBy?.email}) — {selectedTicket.category}</p>
                </div>
                <div>
                  <select 
                    value={selectedTicket.status} 
                    onChange={e => handleStatusChange(e.target.value)}
                    className="bg-white border rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="OPEN">🟢 Abierto</option>
                    <option value="IN_PROGRESS">🟡 En Progreso</option>
                    <option value="WAITING_ON_USER">🟣 Esperando Usuario</option>
                    <option value="RESOLVED">✅ Resuelto</option>
                    <option value="CLOSED">🔴 Cerrado</option>
                  </select>
                </div>
              </div>

              {/* Chat */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                {selectedTicket.messages?.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.isAdminReply ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${msg.isAdminReply ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-900'}`}>
                      <div className={`text-xs font-semibold mb-1 ${msg.isAdminReply ? 'text-indigo-200' : 'text-gray-500'}`}>
                        {msg.isAdminReply ? 'Tú (Soporte)' : 'Usuario'} • {new Date(msg.createdAt).toLocaleString()}
                      </div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.attachmentUrl && (
                        <div className="mt-3">
                          <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`text-sm underline ${msg.isAdminReply ? 'text-indigo-100' : 'text-blue-600'}`}>Ver adjunto</a>
                          {msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png)$/) != null && (
                            <img src={msg.attachmentUrl} alt="adjunto" className="mt-2 rounded-lg max-h-32 object-cover border" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Compose Box */}
              <div className="p-4 bg-white border-t shrink-0">
                <form onSubmit={handleReply}>
                  <textarea 
                    value={reply} onChange={e => setReply(e.target.value)}
                    placeholder="Escribe la respuesta remota al usuario... (Se notificará por email)"
                    className="w-full bg-gray-50 border rounded-lg p-3 resize-none outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                  <div className="flex mt-2 justify-between items-center">
                    <input 
                      value={attachment} onChange={e => setAttachment(e.target.value)}
                      placeholder="URL imagen de soporte (opcional)" 
                      className="border rounded px-3 py-1 text-sm w-1/3 outline-none"
                    />
                    <button type="submit" disabled={!reply.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium px-6 py-2 rounded-lg">
                      Enviar Respuesta
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="w-16 h-16 mb-4 text-gray-300" />
              <p>Selecciona un ticket de la lista para leer y responder.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Para usar icono en la vista empty placeholder:
import { MessageCircle } from 'lucide-react';
