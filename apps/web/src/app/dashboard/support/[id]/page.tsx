'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [ticket, setTicket] = useState<any>(null);
  const [reply, setReply] = useState('');
  const [attachment, setAttachment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/support/tickets/${id}`);
      if (res.ok) {
        const { data } = await res.json();
        setTicket(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/support/tickets/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply, attachmentUrl: attachment }),
      });
      if (res.ok) {
        setReply('');
        setAttachment('');
        await fetchTicket(); // Recargar chat
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!ticket) return <div className="p-10 text-center text-gray-500 animate-pulse">Cargando ticket...</div>;

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col p-4 sm:p-6 pb-0">
      {/* Header */}
      <div className="bg-white p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 rounded-t-xl border-x border-t">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard/support')} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">{ticket.subject}</h1>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{ticket.priority}</span>
            </div>
            <p className="text-sm text-gray-500">Ticket ID: {ticket.id}</p>
          </div>
        </div>
        <div className="mt-2 sm:mt-0 font-medium text-sm px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full">
          Estado: {ticket.status}
        </div>
      </div>

      {/* Mensajes Chat */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6 space-y-6 border-x shadow-inner">
        {ticket.messages?.map((msg: any) => {
          const isMe = !msg.isAdminReply;
          return (
            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] sm:max-w-md ${isMe ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-800'} rounded-2xl p-4 shadow-sm`}>
                <div className={`text-xs font-semibold mb-1 ${isMe ? 'text-indigo-200' : 'text-gray-500'}`}>
                  {isMe ? 'Tú (Usuario)' : 'Soporte Técnico'} • {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.attachmentUrl && (
                  <div className="mt-3">
                    <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`text-sm underline ${isMe ? 'text-indigo-100' : 'text-blue-600'}`}>Ver archivo adjunto</a>
                    {msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png)$/) != null && (
                      <img src={msg.attachmentUrl} alt="adjunto" className="mt-2 rounded-lg max-h-48 object-cover border" />
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input de respuesta */}
      <div className="bg-white p-4 border rounded-b-xl shadow-lg shrink-0 mb-6">
        {ticket.status === 'CLOSED' || ticket.status === 'RESOLVED' ? (
          <div className="text-center py-4 bg-gray-50 rounded-lg text-gray-500 flex flex-col items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-500 mb-1" />
            Este ticket está cerrado o resuelto. No admite nuevas respuestas.
          </div>
        ) : (
          <form onSubmit={handleReply}>
            <textarea 
              value={reply}
              onChange={e => setReply(e.target.value)}
              className="w-full bg-gray-50 border rounded-lg p-3 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={2}
              placeholder="Escibe una respuesta al equipo de soporte..."
            />
            <div className="flex justify-between items-center mt-2">
              <input 
                type="text"
                value={attachment}
                onChange={e => setAttachment(e.target.value)}
                placeholder="URL adjunto (Opcional)"
                className="text-sm p-2 border rounded outline-none w-1/2"
              />
              <button disabled={isSubmitting || !reply.trim()} className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
                <Send className="w-4 h-4"/>
                {isSubmitting ? 'Enviando...' : 'Responder'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
