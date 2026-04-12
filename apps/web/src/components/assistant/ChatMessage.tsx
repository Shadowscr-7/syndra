'use client';

import { clsx } from 'clsx';
import type { ChatMessage as ChatMessageType } from './useAssistant';

interface ChatMessageProps {
  message: ChatMessageType;
}

/** Renders markdown-like formatting: **bold**, bullet points, links */
function renderContent(text: string) {
  // Split by newlines and render each line
  return text.split('\n').map((line, i) => {
    // Empty lines become spacing
    if (!line.trim()) return <div key={i} className="h-2" />;

    // Bold: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const rendered = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={j} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={j}>{part}</span>;
    });

    // Bullet points
    if (line.trimStart().startsWith('- ') || line.trimStart().startsWith('• ')) {
      return (
        <div key={i} className="flex gap-1.5 items-start">
          <span className="mt-0.5 text-zinc-500 shrink-0">•</span>
          <span>{rendered}</span>
        </div>
      );
    }

    // Numbered list
    if (/^\d+\.\s/.test(line.trimStart())) {
      return (
        <div key={i} className="flex gap-1.5 items-start">
          <span className="shrink-0 text-zinc-500">{line.match(/^\d+/)?.[0]}.</span>
          <span>{rendered}</span>
        </div>
      );
    }

    return <div key={i}>{rendered}</div>;
  });
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={clsx('flex gap-2 max-w-full', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-white">A</span>
        </div>
      )}

      {/* Bubble */}
      <div
        className={clsx(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-violet-600 text-white rounded-tr-sm'
            : 'bg-zinc-800 text-zinc-200 rounded-tl-sm',
        )}
      >
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <div className="space-y-0.5">{renderContent(message.content)}</div>
        )}
      </div>
    </div>
  );
}

/** Animated typing indicator for when assistant is loading */
export function TypingIndicator() {
  return (
    <div className="flex gap-2 max-w-full flex-row">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-xs font-bold text-white">A</span>
      </div>
      <div className="bg-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
        <span
          className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}
