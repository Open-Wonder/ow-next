'use client';

import { useEffect, useRef } from 'react';
import cn from 'classnames';
import Image from 'next/image';
import { useBrand } from '@/lib/brand-context';
import { ChatMessage } from '@/lib/chat-context';
import styles from './ChatMessages.module.css';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isGenerating?: boolean;
}

export default function ChatMessages({ messages, isGenerating }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { activeBrand } = useBrand();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className={styles.container}>
      <div className={styles.messages}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(styles.message, msg.role === 'user' ? styles.user : styles.assistant)}
          >
            {msg.role === 'assistant' && (
              <div className={styles.avatar}>
                {activeBrand.logoUrl ? (
                  <div className={styles.brandAvatar}>
                    <Image
                      src={activeBrand.logoUrl}
                      alt={activeBrand.name}
                      width={28}
                      height={28}
                      className={styles.brandLogo}
                    />
                  </div>
                ) : (
                  <div className={styles.botAvatar}>
                    <span className={styles.brandInitials}>{activeBrand.initials}</span>
                  </div>
                )}
              </div>
            )}
            <div className={styles.bubble}>
              {msg.role === 'assistant' && (
                <span className={styles.sender}>{activeBrand.name}</span>
              )}
              <div className={styles.content}>
                {msg.content}
                {msg.tags && msg.tags.length > 0 && (
                  <span className={styles.tags}>
                    {msg.tags.map((tag) => (
                      <span key={tag.id} className={styles.tag}>
                        {tag.name}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {isGenerating && (
          <div className={cn(styles.message, styles.assistant)}>
            <div className={styles.avatar}>
              {activeBrand.logoUrl ? (
                <div className={styles.brandAvatar}>
                  <Image
                    src={activeBrand.logoUrl}
                    alt={activeBrand.name}
                    width={28}
                    height={28}
                    className={styles.brandLogo}
                  />
                </div>
              ) : (
                <div className={styles.botAvatar}>
                  <span className={styles.brandInitials}>{activeBrand.initials}</span>
                </div>
              )}
            </div>
            <div className={styles.bubble}>
              <span className={styles.sender}>{activeBrand.name}</span>
              <div className={styles.typing}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
