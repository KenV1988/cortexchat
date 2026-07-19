import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import type { ClientMessage } from '../lib/client/types';
import { RoutingBadge } from './RoutingBadge';

interface Props {
  message: ClientMessage;
  reasoning?: string[] | undefined;
}

export function MessageBubble({ message, reasoning }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-3xl ${isUser ? 'w-fit' : 'w-full'}`}>
        <div
          className={
            isUser
              ? 'rounded-2xl bg-[var(--accent)] px-4 py-2 text-white'
              : 'prose-chat rounded-2xl px-1 py-1 text-[var(--text)]'
          }
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
            {message.content || (isUser ? '' : '…')}
          </ReactMarkdown>
        </div>
        {!isUser && message.model && (
          <RoutingBadge
            model={message.model}
            provider={message.provider ?? 'unknown'}
            category={message.category}
            tier={message.tier}
            escalated={message.escalated}
            reasoning={reasoning}
          />
        )}
      </div>
    </div>
  );
}
