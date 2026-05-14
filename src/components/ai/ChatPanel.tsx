import { useState, useCallback, useEffect } from 'react';
import { ChatBot } from '@/components/ui/ChatBot';
import { coordinationDocumentsApi, chatApi } from '@/services/api';
import type { ChatMessage } from '@/types';

type EntityType = 'coordination-document' | 'lesson-plan' | 'resource' | 'general';

interface ChatPanelProps {
  entityType: EntityType;
  entityId?: number;
  onEntityUpdated?: () => void;
  placeholder?: string;
  welcomeMessage?: { title: string; content: string };
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isGenerating?: boolean;
}

export function ChatPanel({
  entityType,
  entityId,
  onEntityUpdated,
  placeholder = 'Escribi tu mensaje para Alizia...',
  welcomeMessage = {
    title: 'Chat con Alizia',
    content: 'Preguntame lo que necesites. Puedo ayudarte a mejorar el contenido.',
  },
  isCollapsed = false,
  onToggleCollapse,
  isGenerating = false,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (entityType !== 'coordination-document' || !entityId) return;
    coordinationDocumentsApi.getChatHistory(entityId, { limit: 50 }).then((history) => {
      if (history.messages.length > 0) {
        setMessages(
          history.messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        );
      }
    }).catch(() => {});
  }, [entityType, entityId]);

  const sendMessage = useCallback(
    async (content: string) => {
      const userMsg: ChatMessage = { role: 'user', content: content.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setIsSending(true);

      try {
        const result = await routeChat(entityType, entityId, content.trim(), []);

        setMessages((prev) => [...prev, { role: 'assistant', content: result.content }]);

        if (result.entityUpdated && onEntityUpdated) {
          onEntityUpdated();
        }
      } catch {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error. Intenta de nuevo.' }]);
      } finally {
        setIsSending(false);
      }
    },
    [entityType, entityId, onEntityUpdated],
  );

  return (
    <ChatBot
      messages={messages}
      onSendMessage={sendMessage}
      isGenerating={isGenerating || isSending}
      placeholder={placeholder}
      welcomeMessage={welcomeMessage}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
    />
  );
}

async function routeChat(
  entityType: EntityType,
  entityId: number | undefined,
  message: string,
  history: ChatMessage[],
): Promise<{ content: string; entityUpdated: boolean }> {
  switch (entityType) {
    case 'coordination-document': {
      if (!entityId) throw new Error('entityId required for coordination-document chat');
      const result = await coordinationDocumentsApi.chat(entityId, { message });
      const hasUpdates = result.actions.some((a) => a.success);
      return { content: result.message, entityUpdated: hasUpdates };
    }
    case 'lesson-plan':
    case 'resource':
    case 'general':
    default: {
      const result = await chatApi.send({ message, history });
      return { content: result.content, entityUpdated: result.document_updated };
    }
  }
}
