'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { X, Loader2 } from 'lucide-react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import PusherClient from 'pusher-js';
import { toast } from 'sonner';
import { EmojiClickData } from 'emoji-picker-react';
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { Chat } from '@/lib/db/schema';
import { Message, QuickReply, NewMessagePayload, ChatDetails, ContactData, TeamData, RecordingStatus, UserData } from '@/components/chat/types';
import { fetcher, fileToBase64, isSameDay, formatDateSeparator } from '@/components/chat/utils';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { ChatInput } from '@/components/chat/ChatInput';
import { QuickRepliesModal } from '@/components/chat/QuickRepliesModal';
import { DateSeparator } from '@/components/chat/DateSeparator';

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const chatNumber = params.jid as string;
  const instanceIdParam = searchParams.get('instanceId');

  const remoteJid = chatNumber ? `${chatNumber}@s.whatsapp.net` : null;

  const activeChatRef = useRef<Chat | undefined>(undefined);

  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [quotedMessage, setQuotedMessage] = useState<Message | null>(null);

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const [showQuickReplySuggestions, setShowQuickReplySuggestions] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: user } = useSWR<UserData>('/api/user', fetcher);
  const { data: teamData } = useSWR<TeamData>('/api/team', fetcher);
  const teamId = teamData?.id;

  const { data: chats } = useSWR<Chat[]>('/api/chats', fetcher);

  const currentChat = useMemo(() => {
    if (!chats || !remoteJid) return undefined;
    if (instanceIdParam) {
      return chats.find(c => c.remoteJid === remoteJid && c.instanceId === parseInt(instanceIdParam));
    }

    return chats.find(c => c.remoteJid === remoteJid);
  }, [chats, remoteJid, instanceIdParam]);

  const swrKey = useMemo(() => {
    if (!remoteJid) return null;

    if (instanceIdParam) {
      return `/api/messages?jid=${remoteJid}&instanceId=${instanceIdParam}`;
    }
    if (currentChat?.id) {
      return `/api/messages?chatId=${currentChat.id}`;
    }

    return `/api/messages?jid=${remoteJid}`;
  }, [remoteJid, instanceIdParam, currentChat]);

  const { data: messages, error, isLoading, mutate: mutateMessages } = useSWR<Message[]>(swrKey, fetcher, { revalidateOnFocus: true });

  const { data: contact } = useSWR<ContactData | null>(
    remoteJid ? `/api/contacts/by-chat?jid=${remoteJid}` : null,
    fetcher
  );

  useEffect(() => {
    activeChatRef.current = currentChat;
  }, [currentChat]);

  const { data: instances } = useSWR<any[]>('/api/instance/details', fetcher);
  const activeInstance = instances?.find(i => i.dbId === currentChat?.instanceId);
  const { data: quickReplies } = useSWR<QuickReply[]>('/api/quick-replies', fetcher);

  const mediaMessages = useMemo(() => {
    if (!messages) return [];
    return messages.filter(msg => (msg.messageType === 'imageMessage' || msg.messageType === 'videoMessage') && msg.mediaUrl);
  }, [messages]);

  const filteredMessages = useMemo(() => {
    if (!messages) return [];
    if (!searchQuery.trim()) return messages;
    return messages.filter(msg =>
      msg.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.mediaCaption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (msg.messageType === 'documentMessage' && msg.text?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [messages, searchQuery]);

  const slides = useMemo(() => {
    return mediaMessages.map(msg => {
      if (msg.messageType === 'videoMessage' && msg.mediaUrl) {
        return {
          type: "video" as const,
          width: 1280,
          height: 720,
          sources: [{ src: msg.mediaUrl, type: "video/mp4" }]
        };
      }
      return { type: "image" as const, src: msg.mediaUrl! };
    });
  }, [mediaMessages]);

  const filteredQuickReplies = useMemo(() => {
    if (!newMessage.startsWith('/') || !quickReplies) return [];
    const search = newMessage.slice(1).toLowerCase();
    return quickReplies.filter(r => r.shortcut.toLowerCase().startsWith(search));
  }, [newMessage, quickReplies]);

  const handleMediaClick = (messageId: string) => {
    const clickedIndex = mediaMessages.findIndex(msg => msg.id === messageId);
    if (clickedIndex !== -1) { setLightboxIndex(clickedIndex); setLightboxOpen(true); }
  };

  const chatDetails: ChatDetails = {
    remoteJid: remoteJid,
    name: contact?.name || currentChat?.name || currentChat?.pushName || chatNumber || 'Conversa',
    profilePicUrl: currentChat?.profilePicUrl || null,
    lastCustomerInteraction: currentChat?.lastCustomerInteraction ? new Date(currentChat.lastCustomerInteraction).toISOString() : null,
    integration: activeInstance?.integration || 'WHATSAPP-BAILEYS'
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (messages && messages.length > 0 && !searchQuery) {
      const timer = setTimeout(() => scrollToBottom(), 100);
      return () => clearTimeout(timer);
    }
  }, [messages, scrollToBottom, searchQuery]);

  useEffect(() => {
    setShowQuickReplySuggestions(newMessage.startsWith('/') && filteredQuickReplies.length > 0);
  }, [newMessage, filteredQuickReplies]);

  const { cache: swrCache, mutate: globalMutate } = useSWRConfig();

  useEffect(() => {
    if (!teamId || !remoteJid || !process.env.NEXT_PUBLIC_PUSHER_KEY) return;

    const soketiHost = process.env.NEXT_PUBLIC_PUSHER_HOST;
    const pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
      ...(soketiHost
        ? { wsHost: soketiHost, wsPort: 443, wssPort: 443, forceTLS: true, enabledTransports: ['ws', 'wss'] as any, disableStats: true }
        : {}
      ),
    });
    const channelName = `team-${teamId}`;
    const channel = pusherClient.subscribe(channelName);

    channel.bind('new-message', (payload: NewMessagePayload) => {
      const activeChat = activeChatRef.current;
      const instanceMatch = !activeChat?.instanceId || !payload.instanceId || activeChat.instanceId === payload.instanceId;

      if (payload.remoteJid === remoteJid && instanceMatch) {
        mutateMessages((currentMessages = []) => {
          if (currentMessages.some(msg => msg.id === payload.id)) return currentMessages;
          const messageWithStatus = { ...payload, status: payload.status || (payload.fromMe ? 'sent' : null) };
          return [...(currentMessages || []), messageWithStatus as Message];
        }, false);
        setTimeout(() => scrollToBottom(), 150);
      }
    });

    channel.bind('message-status-update', (payload: { messageId: string; status: 'sent' | 'delivered' | 'read' }) => {
      mutateMessages((currentMessages = []) => currentMessages.map(msg => msg.id === payload.messageId ? { ...msg, status: payload.status } : msg), false);
    });

    channel.bind('chat-status-update', (payload: { chatId: number; type: 'ai' | 'automation'; status: string }) => {
      const currentId = activeChatRef.current?.id;

      if (currentId && payload.chatId === currentId) {
        if (payload.type === 'ai') {
          globalMutate(`/api/chats/${payload.chatId}/ai-status`);
        }
        if (payload.type === 'automation') {
          globalMutate(`/api/chats/${payload.chatId}/session`);
        }
      }
    });

    return () => { pusherClient.unsubscribe(channelName); pusherClient.disconnect(); };
  }, [teamId, remoteJid, mutateMessages, scrollToBottom, globalMutate]);

  useEffect(() => {
    if (messages && remoteJid && teamId) {
      if (currentChat && currentChat.unreadCount && currentChat.unreadCount > 0) {
        globalMutate('/api/chats', (currentData: Chat[] | undefined = []) => currentData.map(chat => chat.id === currentChat.id ? { ...chat, unreadCount: 0 } : chat), false);
        fetch('/api/chats/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId: currentChat.id }), }).catch(err => console.error(err));
      }
    }
  }, [messages, remoteJid, teamId, globalMutate, swrCache, currentChat]);

  const startRecording = async () => {
    if (recordingStatus !== 'idle') return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      const audioChunks: Blob[] = [];
      recorder.ondataavailable = (event) => audioChunks.push(event.data);
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: recorder.mimeType });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob); setAudioUrl(audioUrl);
        setRecordingStatus('review');
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setRecordingStatus('recording');
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      toast.error("Não foi possível iniciar a gravação.");
    }
  };

  const stopRecording = () => {
    if (recordingStatus !== 'recording' || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
  };

  const cancelRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null); setAudioUrl(null);
    setRecordingStatus('idle'); setRecordingTime(0);
    setIsAudioPlaying(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop();
  };

  const toggleAudioPlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isAudioPlaying) audioPlayerRef.current.pause(); else audioPlayerRef.current.play();
    setIsAudioPlaying(!isAudioPlaying);
  };

  useEffect(() => {
    const audio = audioPlayerRef.current;
    if (audio) {
      const onEnded = () => setIsAudioPlaying(false);
      audio.addEventListener('ended', onEnded);
      return () => audio.removeEventListener('ended', onEnded);
    }
  }, [audioPlayerRef.current]);

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !remoteJid) return;
    setRecordingStatus('sending');
    let textToSend = newMessage;

    const messageToQuote = quotedMessage;
    setNewMessage(''); setQuotedMessage(null); setShowQuickReplySuggestions(false);

    let quotedData: any = null;
    if (messageToQuote) {
      quotedData = { id: messageToQuote.id, text: messageToQuote.text || messageToQuote.mediaCaption, messageType: messageToQuote.messageType, mediaUrl: messageToQuote.mediaUrl, mediaMimetype: messageToQuote.mediaMimetype, };
    }
    const tempId = `temp_text_${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId, chatId: currentChat?.id || 0, fromMe: true, messageType: 'conversation', text: textToSend, timestamp: new Date().toISOString(),
      mediaUrl: null, mediaMimetype: null, mediaCaption: null, status: 'sent',
      quotedMessageId: messageToQuote?.id, quotedMessageText: quotedData ? JSON.stringify(quotedData) : null,
      isInternal: isInternalNote,
      isAi: false, isAutomation: false
    };
    mutateMessages((currentMessages = []) => [...currentMessages, optimisticMessage], false);
    const timer = setTimeout(() => scrollToBottom(), 100);
    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientJid: remoteJid,
          text: textToSend,
          quotedMessageData: quotedData,
          isInternal: isInternalNote,
          instanceId: currentChat?.instanceId
        }),
      });
      const sentMessageData: Message = await response.json();
      if (!response.ok) throw new Error((sentMessageData as any).error || 'Failed to send message.');
      mutateMessages((currentMessages = []) => currentMessages.map(msg => msg.id === tempId ? { ...sentMessageData, timestamp: new Date(sentMessageData.timestamp).toISOString() } : msg), false);
      globalMutate('/api/chats');
    } catch (sendError: any) {
      mutateMessages((currentMessages = []) => currentMessages.filter(msg => msg.id !== tempId), false);
      setNewMessage(textToSend); setQuotedMessage(messageToQuote);
      toast.error(`Erro ao enviar mensagem: ${sendError.message}`);
    } finally { clearTimeout(timer); setRecordingStatus('idle'); }
  };

  const handleSendAudio = async () => {
    if (!audioBlob || !remoteJid || recordingStatus !== 'review') return;
    setRecordingStatus('sending');
    const messageToQuote = quotedMessage; setQuotedMessage(null);
    const tempId = `temp_audio_${Date.now()}`;
    const audioMimeType = audioBlob.type;
    const tempAudioUrl = audioUrl;
    let quotedData: any = null;
    if (messageToQuote) { quotedData = { id: messageToQuote.id, text: messageToQuote.text || messageToQuote.mediaCaption, messageType: messageToQuote.messageType, mediaUrl: messageToQuote.mediaUrl, mediaMimetype: messageToQuote.mediaMimetype, }; }
    const optimisticMessage: Message = { id: tempId, chatId: currentChat?.id || 0, fromMe: true, messageType: 'audioMessage', text: null, timestamp: new Date().toISOString(), mediaUrl: tempAudioUrl, mediaMimetype: audioMimeType, mediaCaption: null, status: 'sent', quotedMessageId: messageToQuote?.id, quotedMessageText: quotedData ? JSON.stringify(quotedData) : null, isAi: false, isAutomation: false };
    mutateMessages((currentMessages = []) => [...currentMessages, optimisticMessage], false);
    const timer = setTimeout(() => scrollToBottom(), 100);
    try {
      const audioBase64 = await fileToBase64(audioBlob);
      const response = await fetch('/api/messages/sendAudio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientJid: remoteJid,
          audioBase64,
          audioMimeType,
          quotedMessageData: quotedData,
          instanceId: currentChat?.instanceId
        }),
      });
      const sentMessageData: Message = await response.json();
      if (!response.ok) throw new Error((sentMessageData as any).error || 'Failed to send audio.');
      mutateMessages((currentMessages = []) => currentMessages.map(msg => msg.id === tempId ? { ...sentMessageData, timestamp: new Date(sentMessageData.timestamp).toISOString() } : msg), false);
      globalMutate('/api/chats');
    } catch (sendError: any) {
      mutateMessages((currentMessages = []) => currentMessages.filter(msg => msg.id !== tempId), false);
      setQuotedMessage(messageToQuote);
      toast.error(`Erro ao enviar áudio: ${sendError.message}`);
    } finally { clearTimeout(timer); cancelRecording(); if (tempAudioUrl) URL.revokeObjectURL(tempAudioUrl); }
  };

  const handleSendAttachment = async (file: File) => {
    if (!remoteJid) return;
    const tempMediaUrl = URL.createObjectURL(file);
    const messageToQuote = quotedMessage;
    setQuotedMessage(null);

    const tempId = `temp_media_${Date.now()}`;
    const mimeType = file.type;
    const fileName = file.name;
    const messageType = mimeType.startsWith('image/') || mimeType.startsWith('video/') ? 'imageMessage' : 'documentMessage';

    let quotedData: any = null;
    if (messageToQuote) {
      quotedData = {
        id: messageToQuote.id,
        text: messageToQuote.text || messageToQuote.mediaCaption,
        messageType: messageToQuote.messageType,
        mediaUrl: messageToQuote.mediaUrl,
        mediaMimetype: messageToQuote.mediaMimetype
      };
    }

    const optimisticMessage: Message = {
      id: tempId,
      chatId: currentChat?.id || 0,
      fromMe: true,
      messageType: messageType,
      text: messageType === 'documentMessage' ? fileName : null,
      timestamp: new Date().toISOString(),
      mediaUrl: tempMediaUrl,
      mediaMimetype: mimeType,
      mediaCaption: null,
      status: 'sent',
      quotedMessageId: messageToQuote?.id,
      quotedMessageText: quotedData ? JSON.stringify(quotedData) : null,
      isAi: false,
      isAutomation: false
    };

    mutateMessages((currentMessages = []) => [...currentMessages, optimisticMessage], false);
    const timer = setTimeout(() => scrollToBottom(), 100);

    try {
      const fileBase64 = await fileToBase64(file);
      const response = await fetch('/api/messages/sendMedia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientJid: remoteJid,
          fileBase64,
          mimeType,
          fileName,
          quotedMessageData: quotedData,
          instanceId: currentChat?.instanceId
        }),
      });

      const sentMessageData: Message = await response.json();
      if (!response.ok) throw new Error((sentMessageData as any).error || 'Failed to send media.');

      mutateMessages((currentMessages = []) => currentMessages.map(msg => msg.id === tempId ? { ...sentMessageData, timestamp: new Date(sentMessageData.timestamp).toISOString() } : msg), false);
      globalMutate('/api/chats');
    } catch (sendError: any) {
      mutateMessages((currentMessages = []) => currentMessages.filter(msg => msg.id !== tempId), false);
      setQuotedMessage(messageToQuote);
      toast.error(`Erro ao enviar arquivo: ${sendError.message}`);
    } finally {
      clearTimeout(timer);
      URL.revokeObjectURL(tempMediaUrl);
    }
  };

  const handleFileIconClick = (acceptType: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = acceptType;
      fileInputRef.current.click();
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => { setNewMessage(prev => prev + emojiData.emoji); };

  const handleCloseChat = async () => {
    if (!currentChat?.id) return;
    try {
      const res = await fetch(`/api/chats/${currentChat.id}/close`, { method: 'POST' });
      if (!res.ok) throw new Error('Falha ao finalizar conversa');
      toast.success('Conversa finalizada');
      globalMutate('/api/chats');
      mutateMessages();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao finalizar conversa');
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    // Optimistic removal
    mutateMessages((current = []) => current.filter(m => m.id !== msgId), false);
    try {
      const res = await fetch('/api/messages/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: msgId }),
      });
      if (!res.ok) throw new Error('Falha ao apagar mensagem');
      toast.success('Mensagem apagada');
    } catch (e: any) {
      mutateMessages(); // revert on error
      toast.error(e.message || 'Erro ao apagar mensagem');
    }
  };

  const handleMarkUnread = () => {
    if (!currentChat?.id) return;
    // Optimistic local update (visual indicator until next message arrives)
    globalMutate('/api/chats', (currentData: Chat[] | undefined = []) =>
      currentData.map(chat => chat.id === currentChat.id ? { ...chat, unreadCount: 1 } : chat), false
    );
    toast.success('Marcada como não lida');
  };

  const handleDownloadChat = () => {
    if (!messages || messages.length === 0) {
      toast.error('Nenhuma mensagem para exportar');
      return;
    }

    const contactName = chatDetails.name;
    const contactJid = chatDetails.remoteJid;
    const exportDate = new Date().toLocaleString();
    const agentName = user?.name || user?.email || 'Atendente';

    const rows = messages.map(msg => {
      const time = new Date(msg.timestamp).toLocaleString();
      const sender = msg.fromMe ? agentName : contactName;
      const content = msg.text || (msg.mediaUrl ? `[Mídia: ${msg.messageType}]` : '[Mensagem não suportada]');
      const type = msg.isInternal ? 'Nota Interna' : (msg.fromMe ? 'Enviada' : 'Recebida');
      const rowColor = msg.isInternal ? '#FEF3C7' : (msg.fromMe ? '#EEF2FF' : '#FFFFFF');
      return `<tr style="background:${rowColor}">
        <td>${time}</td>
        <td>${sender}</td>
        <td><span style="font-size:11px;font-weight:600;color:${msg.isInternal ? '#D97706' : msg.fromMe ? '#4F46E5' : '#6B7280'}">${type}</span></td>
        <td>${content}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Conversa - ${contactName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 18px; margin-bottom: 4px; color: #1E1B4B; }
    .meta { font-size: 12px; color: #6B7280; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #4F46E5; color: white; }
    th { padding: 8px 10px; text-align: left; }
    td { padding: 7px 10px; border-bottom: 1px solid #E5E7EB; vertical-align: top; word-break: break-word; }
    td:first-child { white-space: nowrap; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>Relatório de Conversa</h1>
  <p class="meta">Contato: <strong>${contactName}</strong> &nbsp;|&nbsp; ${contactJid}<br>Exportado em: ${exportDate}</p>
  <table>
    <thead><tr><th>Data/Hora</th><th>Remetente</th><th>Tipo</th><th>Mensagem</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Pop-up bloqueado pelo navegador. Libere pop-ups e tente novamente.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
    toast.success('Preparando PDF para download...');
  };

  const renderReplyPreview = () => {
    if (!quotedMessage) return null;
    return (
      <div className="relative p-2 px-4 border-t bg-accent">
        <div className="p-2 rounded-md bg-muted border-l-4 border-primary">
          <p className="text-sm font-medium text-primary">Respondendo...</p>
          <p className="text-sm text-muted-foreground truncate">{quotedMessage.text || 'Mídia'}</p>
        </div>
        <Button variant="ghost" size="icon" className="absolute top-1 right-2 h-7 w-7 rounded-full" onClick={() => setQuotedMessage(null)}><X className="h-4 w-4 text-muted-foreground" /></Button>
      </div>
    );
  };

  const renderMessages = () => {
    if (isLoading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    if (error) return <div className="p-4 text-center text-destructive">Erro ao carregar mensagens.</div>;
    if (!filteredMessages || filteredMessages.length === 0) {
      if (searchQuery) return <div className="p-4 text-center text-muted-foreground">Nenhuma mensagem encontrada para "{searchQuery}".</div>;
      return <div className="p-4 text-center text-muted-foreground">Nenhuma mensagem nesta conversa ainda.</div>;
    }

    return filteredMessages.map((msg, index) => {
      const currentDate = new Date(msg.timestamp);
      let showSeparator = false;
      let dateLabel = '';

      if (index === 0) {
        showSeparator = true;
        dateLabel = formatDateSeparator(currentDate);
      } else {
        const prevMsg = filteredMessages[index - 1];
        const prevDate = new Date(prevMsg.timestamp);
        if (!isSameDay(currentDate, prevDate)) {
          showSeparator = true;
          dateLabel = formatDateSeparator(currentDate);
        }
      }

      return (
        <React.Fragment key={msg.id}>
          {showSeparator && <DateSeparator date={currentDate} label={dateLabel} />}
          <MessageBubble
            msg={msg}
            onMediaClick={handleMediaClick}
            onReply={setQuotedMessage}
            onDeleteMessage={handleDeleteMessage}
            searchQuery={searchQuery}
          />
        </React.Fragment>
      );
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex flex-col flex-1 h-screen">

        <ChatHeader
          chatDetails={chatDetails}
          chatId={currentChat?.id}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onCloseChat={currentChat ? handleCloseChat : undefined}
          onMarkUnread={currentChat ? handleMarkUnread : undefined}
          onDownloadChat={messages && messages.length > 0 ? handleDownloadChat : undefined}
        />

        <main className="flex-1 overflow-y-auto p-4 space-y-1 bg-white dark:bg-background">
          {renderMessages()}
          <div ref={messagesEndRef} />
        </main>

        {renderReplyPreview()}

        <footer className="flex flex-col border-t bg-background shrink-0">
          <ChatInput
            isInternalNote={isInternalNote}
            setIsInternalNote={setIsInternalNote}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            recordingStatus={recordingStatus}
            recordingTime={recordingTime}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onCancelRecording={cancelRecording}
            onSendText={handleSendText}
            onSendAudio={handleSendAudio}
            onSendAttachment={handleSendAttachment}
            audioUrl={audioUrl}
            isAudioPlaying={isAudioPlaying}
            toggleAudioPlayback={toggleAudioPlayback}
            audioPlayerRef={audioPlayerRef as React.RefObject<HTMLAudioElement>}
            fileInputRef={fileInputRef as unknown as React.RefObject<HTMLInputElement>}
            handleFileIconClick={handleFileIconClick}
            onEmojiClick={onEmojiClick}
            quickRepliesOpen={quickRepliesOpen}
            setQuickRepliesOpen={setQuickRepliesOpen}
            showQuickReplySuggestions={showQuickReplySuggestions}
            setShowQuickReplySuggestions={setShowQuickReplySuggestions}
            filteredQuickReplies={filteredQuickReplies}
          />
        </footer>
      </div>

      <ChatSidebar
        chatDetails={chatDetails}
        contactData={contact}
        onContactUpdate={() => globalMutate(remoteJid ? `/api/contacts/by-chat?jid=${remoteJid}` : null)}
      />

      <QuickRepliesModal open={quickRepliesOpen} onOpenChange={setQuickRepliesOpen} />

      <Lightbox open={lightboxOpen} close={() => setLightboxOpen(false)} slides={slides} index={lightboxIndex} plugins={[Zoom, Video]} zoom={{ maxZoomPixelRatio: 3, doubleTapDelay: 300 }} />
    </div>
  );
}