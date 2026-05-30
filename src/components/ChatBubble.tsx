import { memo } from 'react';
import type { Message } from '../types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from './ChatBubble.module.css';

interface Props {
  message: Message;
}

export default memo(function ChatBubble({ message }: Props) {
  const isUser = message.role === 'user';
  const activity = message.activity;

  if (!isUser && !message.content && !activity) return null;

  return (
    <div className={`${styles.row} ${isUser ? styles.userRow : styles.botRow}`}>
      {!isUser && <div className={styles.avatar}>&#x2B21;</div>}
      <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.botBubble}`}>
        {!isUser && activity?.type === 'web_search' && (
          <div
            className={`${styles.webSearchActivity} ${activity.status === 'done' ? styles.webSearchDone : styles.webSearchActive}`}
            role="status"
            aria-live="polite"
          >
            <span className={styles.searchGlyph} aria-hidden="true" />
            <span className={styles.searchLabel}>{activity.label}</span>
            <span className={styles.searchDots} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
        {isUser ? (
          message.content
        ) : (
          message.content && (
            <div className={styles.markdown}>
              <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
            </div>
          )
        )}
        <span className={styles.time}>
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {isUser && <div className={`${styles.avatar} ${styles.userAvatar}`}>&#x4F60;</div>}
    </div>
  );
});
