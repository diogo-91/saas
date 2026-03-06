'use client';

import { useState } from 'react';
import { Message } from './types';
import { formatTime } from './utils';
import { Check, CheckCheck, Clock, Image as ImageIcon, FileText, Mic, Reply, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomAudioPlayer } from '@/components/ui/custom-audio-player';

interface MessageBubbleProps {
  msg: Message;
  onMediaClick: (id: string) => void;
  onReply: (msg: Message) => void;
  searchQuery: string;
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function StatusIcon({ status }: { status: string | null }) {
  if (status === 'read') return <CheckCheck className="h-3 w-3 text-blue-400" />;
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
  if (status === 'sent') return <Check className="h-3 w-3 text-muted-foreground" />;
  return <Clock className="h-3 w-3 text-muted-foreground" />;
}

export function MessageBubble({ msg, onMediaClick, onReply, searchQuery }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const isFromMe = msg.fromMe;

  const bubbleClass = isFromMe
    ? 'bg-primary text-primary-foreground ml-auto rounded-tl-2xl rounded-bl-2xl rounded-tr-sm'
    : msg.isInternal
    ? 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-foreground rounded-tr-2xl rounded-br-2xl rounded-tl-sm'
    : 'bg-background border text-foreground rounded-tr-2xl rounded-br-2xl rounded-tl-sm';

  const renderQuotedMessage = () => {
    if (!msg.quotedMessageText) return null;
    let quotedData: any = {};
    try {
      quotedData = JSON.parse(msg.quotedMessageText);
    } catch {
      quotedData = { text: msg.quotedMessageText };
    }
    return (
      <div className={`mb-2 p-2 rounded-md border-l-4 border-primary/60 ${isFromMe ? 'bg-primary-foreground/10' : 'bg-muted'}`}>
        <p className="text-xs font-medium text-primary/80 mb-0.5">Quoted</p>
        <p className="text-xs opacity-75 truncate">{quotedData.text || 'Media'}</p>
      </div>
    );
  };

  const renderContent = () => {
    const type = msg.messageType;

    if (type === 'imageMessage' && msg.mediaUrl) {
      return (
        <div>
          <img
            src={msg.mediaUrl}
            alt="Image"
            className="rounded-lg max-w-[240px] cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onMediaClick(msg.id)}
          />
          {msg.mediaCaption && (
            <p className="text-sm mt-1">
              <HighlightText text={msg.mediaCaption} query={searchQuery} />
            </p>
          )}
        </div>
      );
    }

    if (type === 'videoMessage' && msg.mediaUrl) {
      return (
        <div
          className="relative cursor-pointer rounded-lg overflow-hidden max-w-[240px]"
          onClick={() => onMediaClick(msg.id)}
        >
          <video src={msg.mediaUrl} className="w-full rounded-lg" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Video className="h-10 w-10 text-white" />
          </div>
        </div>
      );
    }

    if (type === 'audioMessage') {
      return (
        <div className="min-w-[220px]">
          {msg.mediaUrl ? (
            <CustomAudioPlayer src={msg.mediaUrl} isMe={isFromMe} />
          ) : (
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 shrink-0" />
              <span className="text-xs opacity-70">Audio message</span>
            </div>
          )}
        </div>
      );
    }

    if (type === 'documentMessage') {
      return (
        <a
          href={msg.mediaUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <FileText className="h-5 w-5 shrink-0" />
          <span className="text-sm underline truncate max-w-[200px]">
            {msg.text || 'Document'}
          </span>
        </a>
      );
    }

    if (msg.text) {
      return (
        <p className="text-sm whitespace-pre-wrap break-words">
          <HighlightText text={msg.text} query={searchQuery} />
        </p>
      );
    }

    return <p className="text-sm italic opacity-60">[Unsupported message]</p>;
  };

  return (
    <div
      className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} group mb-1`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-end gap-1 max-w-[75%]">
        {!isFromMe && (
          <div className={`transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full mb-1"
              onClick={() => onReply(msg)}
            >
              <Reply className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className={`px-3 py-2 rounded-2xl shadow-sm ${bubbleClass}`} style={{ maxWidth: '100%' }}>
          {msg.isAi && (
            <p className="text-[10px] font-medium opacity-60 mb-1 uppercase tracking-wide">AI Agent</p>
          )}
          {msg.isAutomation && (
            <p className="text-[10px] font-medium opacity-60 mb-1 uppercase tracking-wide">Automation</p>
          )}
          {msg.isInternal && (
            <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mb-1 uppercase tracking-wide">Internal Note</p>
          )}
          {renderQuotedMessage()}
          {renderContent()}
          <div className={`flex items-center gap-1 mt-1 ${isFromMe ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] opacity-60">{formatTime(msg.timestamp)}</span>
            {isFromMe && <StatusIcon status={msg.status} />}
          </div>
        </div>

        {isFromMe && (
          <div className={`transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full mb-1"
              onClick={() => onReply(msg)}
            >
              <Reply className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
