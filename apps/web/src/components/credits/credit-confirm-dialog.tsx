'use client';

import { useState } from 'react';

interface CreditConfirmDialogProps {
  open: boolean;
  operation: string;
  cost: number;
  balance: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const OPERATION_LABELS: Record<string, string> = {
  IMAGE_STANDARD: 'Imagen estándar',
  IMAGE_TEXT: 'Imagen con texto overlay',
  IMAGE_HD: 'Imagen HD (multi-modelo)',
  ANIMATION_5S: 'Animación 5 segundos',
  ANIMATION_10S: 'Animación 10 segundos',
  VIDEO_AVATAR_30S: 'Avatar video 30s',
  VIDEO_AVATAR_60S: 'Avatar video 60s',
  VIDEO_COMPOSITE: 'Video compuesto',
  VIDEO_AI_SHORT: 'AI Short completo',
};

export function CreditConfirmDialog({
  open,
  operation,
  cost,
  balance,
  onConfirm,
  onCancel,
}: CreditConfirmDialogProps) {
  const [confirming, setConfirming] = useState(false);
  const hasEnough = balance >= cost;

  if (!open) return null;

  const handleConfirm = async () => {
    setConfirming(true);
    onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: 'linear-gradient(180deg, rgba(20,20,40,0.98), rgba(10,10,25,0.99))',
          border: '1px solid rgba(124,58,237,0.2)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        {/* Icon */}
        <div className="text-center mb-4">
          <div
            className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl"
            style={{
              background: hasEnough
                ? 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.1))'
                : 'rgba(239,68,68,0.1)',
            }}
          >
            {hasEnough ? '💎' : '⚠️'}
          </div>
        </div>

        {/* Title */}
        <h3
          className="text-lg font-bold text-center"
          style={{ color: '#e0d4ff' }}
        >
          {hasEnough ? 'Confirmar uso de créditos' : 'Créditos insuficientes'}
        </h3>

        {/* Details */}
        <div className="mt-4 space-y-3">
          <div
            className="flex justify-between px-4 py-2.5 rounded-xl"
            style={{ background: 'rgba(124,58,237,0.06)' }}
          >
            <span className="text-sm" style={{ color: 'rgba(160,160,192,0.7)' }}>
              Operación
            </span>
            <span className="text-sm font-medium" style={{ color: '#e0d4ff' }}>
              {OPERATION_LABELS[operation] ?? operation}
            </span>
          </div>

          <div
            className="flex justify-between px-4 py-2.5 rounded-xl"
            style={{ background: 'rgba(124,58,237,0.06)' }}
          >
            <span className="text-sm" style={{ color: 'rgba(160,160,192,0.7)' }}>
              Costo
            </span>
            <span className="text-sm font-mono font-bold" style={{ color: '#f87171' }}>
              -{cost} créditos
            </span>
          </div>

          <div
            className="flex justify-between px-4 py-2.5 rounded-xl"
            style={{ background: 'rgba(124,58,237,0.06)' }}
          >
            <span className="text-sm" style={{ color: 'rgba(160,160,192,0.7)' }}>
              Balance actual
            </span>
            <span className="text-sm font-mono font-semibold" style={{ color: '#a78bfa' }}>
              {balance.toLocaleString()}
            </span>
          </div>

          {hasEnough && (
            <div
              className="flex justify-between px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.1)' }}
            >
              <span className="text-sm" style={{ color: 'rgba(160,160,192,0.7)' }}>
                Después
              </span>
              <span className="text-sm font-mono font-semibold" style={{ color: '#34d399' }}>
                {(balance - cost).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: 'rgba(160,160,192,0.08)',
              color: 'rgba(160,160,192,0.7)',
              border: '1px solid rgba(160,160,192,0.1)',
            }}
          >
            Cancelar
          </button>

          {hasEnough ? (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                color: '#fff',
              }}
            >
              {confirming ? 'Procesando...' : 'Confirmar'}
            </button>
          ) : (
            <a
              href="/dashboard/credits"
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-all"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                color: '#fff',
              }}
            >
              Comprar créditos
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
