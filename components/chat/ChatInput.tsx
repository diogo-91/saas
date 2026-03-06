'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Send, Mic, MicOff, StopCircle, Paperclip, Image, FileText,
  Smile, X, Play, Pause, MessageSquare, ChevronRight
} from 'lucide-react';
import { EmojiClickData } from 'emoji-picker-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import dynamic from 'next/dynamic';
import { RecordingStatus, QuickReply } from './types';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface ChatInputProps {
  isInternalNote: boolean;
  setIsInternalNote: (val: boolean) => void;
  newMessage: string;
  setNewMessage: (val: string) => void;
  recordingStatus: RecordingStatus;
  recordingTime: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  onSendText: (e: React.FormEvent) => void;
  onSendAudio: () => void;
  onSendAttachment: (file: File) => void;
  audioUrl: string | null;
  isAudioPlaying: boolean;
  toggleAudioPlayback: () => void;
  audioPlayerRef: React.RefObject<HTMLAudioElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileIconClick: (accept: string) => void;
  onEmojiClick: (data: EmojiClickData) => void;
  quickRepliesOpen: boolean;
  setQuickRepliesOpen: (open: boolean) => void;
  showQuickReplySuggestions: boolean;
  setShowQuickReplySuggestions: (show: boolean) => void;
  filteredQuickReplies: QuickReply[];
}

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function ChatInput({
  isInternalNote,
  setIsInternalNote,
  newMessage,
  setNewMessage,
  recordingStatus,
  recordingTime,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  onSendText,
  onSendAudio,
  onSendAttachment,
  audioUrl,
  isAudioPlaying,
  toggleAudioPlayback,
  audioPlayerRef,
  fileInputRef,
  handleFileIconClick,
  onEmojiClick,
  quickRepliesOpen,
  setQuickRepliesOpen,
  showQuickReplySuggestions,
  setShowQuickReplySuggestions,
  filteredQuickReplies,
}: ChatInputProps) {
  const isSending = recordingStatus === 'sending';

  if (recordingStatus === 'recording') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-destructive/5 border-t">
        <div className="flex items-center gap-2 flex-1">
          <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm font-mono text-destructive font-semibold">
            {formatRecordingTime(recordingTime)}
          </span>
          <span className="text-xs text-muted-foreground">Recording...</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancelRecording} className="text-muted-foreground">
          <X className="h-4 w-4" />
        </Button>
        <Button size="icon" onClick={onStopRecording} className="bg-destructive hover:bg-destructive/90 h-10 w-10 rounded-full">
          <StopCircle className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  if (recordingStatus === 'review' && audioUrl) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 border-t">
        <audio ref={audioPlayerRef} src={audioUrl} className="hidden" />
        <Button variant="ghost" size="icon" onClick={toggleAudioPlayback} className="h-9 w-9">
          {isAudioPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div className="flex-1 h-2 bg-muted rounded-full" />
        <Button variant="ghost" size="icon" onClick={onCancelRecording} className="text-muted-foreground h-9 w-9">
          <X className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          onClick={onSendAudio}
          disabled={isSending}
          className="h-10 w-10 rounded-full"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      {showQuickReplySuggestions && filteredQuickReplies.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 bg-background border rounded-t-lg shadow-lg max-h-48 overflow-y-auto z-10">
          {filteredQuickReplies.map((reply) => (
            <button
              key={reply.id}
              className="w-full text-left px-4 py-3 hover:bg-muted flex items-center justify-between text-sm border-b last:border-0"
              onClick={() => {
                setNewMessage(reply.content);
                setShowQuickReplySuggestions(false);
              }}
            >
              <span className="font-medium text-primary">/{reply.shortcut}</span>
              <span className="text-muted-foreground truncate ml-4">{reply.content}</span>
            </button>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onSendAttachment(file);
            e.target.value = '';
          }
        }}
      />

      <div className="flex items-end gap-2 px-3 py-2">
        <div className={`flex-1 flex flex-col rounded-2xl border ${isInternalNote ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'border-border bg-background'} px-3 py-2`}>
          {isInternalNote && (
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Internal Note</span>
              <button onClick={() => setIsInternalNote(false)} className="ml-auto text-amber-500 hover:text-amber-700">
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <form onSubmit={onSendText} className="flex items-end gap-1">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={isInternalNote ? 'Write an internal note...' : 'Type a message...'}
              className="min-h-[36px] max-h-[120px] border-none shadow-none focus-visible:ring-0 resize-none bg-transparent p-0 text-sm leading-5"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSendText(e as any);
                }
              }}
            />
          </form>
          <div className="flex items-center gap-1 mt-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 border-none shadow-xl" align="start" side="top">
                <EmojiPicker onEmojiClick={onEmojiClick} lazyLoadEmojis />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <Paperclip className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-1" align="start" side="top">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-sm h-8"
                  onClick={() => handleFileIconClick('image/*,video/*')}
                >
                  <Image className="h-4 w-4" /> Image/Video
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-sm h-8"
                  onClick={() => handleFileIconClick('*/*')}
                >
                  <FileText className="h-4 w-4" /> Document
                </Button>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setQuickRepliesOpen(true)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${isInternalNote ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => setIsInternalNote(!isInternalNote)}
              title="Toggle internal note"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {newMessage.trim() ? (
          <Button
            size="icon"
            onClick={onSendText}
            disabled={isSending}
            className="h-10 w-10 rounded-full shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            onClick={onStartRecording}
            disabled={isSending}
            className="h-10 w-10 rounded-full shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Mic className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
