'use client';

import { useState } from 'react';
import { Message } from './types';
import { formatTime } from './utils';
import {
  Check, CheckCheck, Clock, Image as ImageIcon, FileText, Mic, Reply,
  Video, Lock, Trash2, MapPin, User, Download, Eye, BarChart2,
  Phone, AlertCircle, PhoneMissed, PhoneIncoming, PhoneOutgoing,
  List, Users, Navigation,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomAudioPlayer } from '@/components/ui/custom-audio-player';

interface MessageBubbleProps {
  msg: Message;
  onMediaClick: (id: string) => void;
  onReply: (msg: Message) => void;
  onDeleteMessage?: (msgId: string) => void;
  searchQuery: string;
}

// ─── WhatsApp text formatter ─────────────────────────────────────────────────
function parseWhatsAppText(text: string, query: string): React.ReactNode[] {
  // Tokenise by bold, italic, strikethrough, monospace, and URLs
  const PATTERN = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|```[\s\S]+?```|`[^`\n]+`|https?:\/\/[^\s]+)/g;

  const nodes: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  const highlight = (str: string, key: string | number): React.ReactNode => {
    if (!query.trim()) return <span key={key}>{str}</span>;
    const parts = str.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span key={key}>
        {parts.map((p, i) =>
          p.toLowerCase() === query.toLowerCase()
            ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">{p}</mark>
            : p
        )}
      </span>
    );
  };

  while ((match = PATTERN.exec(text)) !== null) {
    const [token] = match;
    const start = match.index;

    // plain text before this token
    if (start > last) {
      nodes.push(highlight(text.slice(last, start), `t${last}`));
    }

    if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(<strong key={start}>{highlight(token.slice(1, -1), `b${start}`)}</strong>);
    } else if (token.startsWith('_') && token.endsWith('_')) {
      nodes.push(<em key={start}>{highlight(token.slice(1, -1), `i${start}`)}</em>);
    } else if (token.startsWith('~') && token.endsWith('~')) {
      nodes.push(<s key={start}>{highlight(token.slice(1, -1), `s${start}`)}</s>);
    } else if (token.startsWith('```') && token.endsWith('```')) {
      const code = token.slice(3, -3).trim();
      nodes.push(
        <code key={start} className="block font-mono text-xs bg-black/10 dark:bg-white/10 rounded px-1.5 py-0.5 my-0.5 whitespace-pre-wrap">
          {highlight(code, `c${start}`)}
        </code>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        <code key={start} className="font-mono text-xs bg-black/10 dark:bg-white/10 rounded px-1 py-0.5">
          {highlight(token.slice(1, -1), `ic${start}`)}
        </code>
      );
    } else if (token.startsWith('http')) {
      nodes.push(
        <a
          key={start}
          href={token}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 opacity-90 hover:opacity-100 break-all"
        >
          {token}
        </a>
      );
    }

    last = start + token.length;
  }

  if (last < text.length) {
    nodes.push(highlight(text.slice(last), `t${last}`));
  }

  return nodes;
}

function FormattedText({ text, query }: { text: string; query: string }) {
  return <span className="whitespace-pre-wrap break-words">{parseWhatsAppText(text, query)}</span>;
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

function formatFileSize(bytes: string | null | undefined): string {
  if (!bytes) return '';
  const n = parseInt(bytes, 10);
  if (isNaN(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Quoted message icon helpers ─────────────────────────────────────────────
function quotedTypeLabel(data: any): string {
  const t = data?.messageType as string | undefined;
  if (!t) return 'Mensagem';
  const map: Record<string, string> = {
    imageMessage: '📷 Imagem',
    videoMessage: '🎬 Vídeo',
    audioMessage: '🎤 Áudio',
    stickerMessage: '🎭 Figurinha',
    documentMessage: '📄 Documento',
    locationMessage: '📍 Localização',
    contactMessage: '👤 Contato',
    viewOnceMessage: '👁 Visualização única',
    pollCreationMessage: '📊 Enquete',
  };
  return map[t] || 'Mensagem';
}

export function MessageBubble({ msg, onMediaClick, onReply, onDeleteMessage, searchQuery }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const isFromMe = msg.fromMe;

  const bubbleClass = msg.isInternal
    ? 'bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 rounded-2xl'
    : isFromMe
      ? 'bg-primary text-primary-foreground ml-auto rounded-tl-2xl rounded-bl-2xl rounded-tr-sm'
      : 'bg-background border text-foreground rounded-tr-2xl rounded-br-2xl rounded-tl-sm';

  const renderQuotedMessage = () => {
    if (!msg.quotedMessageText) return null;
    let quotedData: any = {};
    try {
      quotedData = JSON.parse(msg.quotedMessageText);
    } catch {
      quotedData = { text: msg.quotedMessageText };
    }

    const hasThumb = quotedData.mediaUrl && quotedData.messageType === 'imageMessage';
    const label = quotedTypeLabel(quotedData);
    const snippet = quotedData.text || quotedData.mediaCaption;

    return (
      <div className={`mb-2 p-2 rounded-md border-l-4 border-primary/60 flex gap-2 ${isFromMe ? 'bg-primary-foreground/10' : 'bg-muted'}`}>
        {hasThumb && (
          <img src={quotedData.mediaUrl} alt="" className="h-10 w-10 object-cover rounded shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium text-primary/80 mb-0.5">Citado</p>
          <p className="text-xs opacity-75 truncate">
            {snippet || label}
          </p>
          {!snippet && <p className="text-xs opacity-50">{label}</p>}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const type = msg.messageType;

    // ─── DELETED ─────────────────────────────────────────────────────────────
    if (type === 'protocolMessage') {
      return (
        <div className="flex items-center gap-1.5 opacity-50 italic">
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          <p className="text-xs">Esta mensagem foi apagada</p>
        </div>
      );
    }

    // ─── CALL LOG ─────────────────────────────────────────────────────────────
    if (type === 'callLogMessage' || type === 'callLogMessageV2') {
      let callData: any = {};
      try { callData = JSON.parse(msg.text || '{}'); } catch { /* ignore */ }

      const isMissed = callData.callOutcome === 'missed' || callData.isMissed;
      const isVideo = callData.isVideo;
      const duration = callData.duration ? formatDuration(callData.duration) : null;
      const Icon = isMissed ? PhoneMissed : isFromMe ? PhoneOutgoing : PhoneIncoming;
      const label = isMissed
        ? (isVideo ? 'Chamada de vídeo perdida' : 'Chamada perdida')
        : isFromMe
          ? (isVideo ? 'Chamada de vídeo efetuada' : 'Chamada efetuada')
          : (isVideo ? 'Chamada de vídeo recebida' : 'Chamada recebida');

      return (
        <div className="flex items-center gap-2 min-w-[160px]">
          <Icon className={`h-5 w-5 shrink-0 ${isMissed ? 'text-red-400' : 'text-green-400'}`} />
          <div>
            <p className="text-sm font-medium">{label}</p>
            {duration && <p className="text-xs opacity-60">{duration}</p>}
          </div>
        </div>
      );
    }

    // ─── IMAGE ───────────────────────────────────────────────────────────────
    if (type === 'imageMessage') {
      // Always use proxy URL — it serves the file via fs.readFile, which works
      // even for runtime-created files that Next.js static serving may not expose.
      const src = `/api/media?msgId=${msg.id}`;
      return (
        <div>
          <img
            src={src}
            alt="Imagem"
            className="rounded-lg max-w-[240px] cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onMediaClick(msg.id)}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = 'none';
              img.insertAdjacentHTML('afterend', '<span class="text-xs opacity-50 italic flex items-center gap-1">📷 Imagem indisponível</span>');
            }}
          />
          {msg.mediaCaption && (
            <p className="text-sm mt-1">
              <FormattedText text={msg.mediaCaption} query={searchQuery} />
            </p>
          )}
        </div>
      );
    }

    // ─── STICKER ─────────────────────────────────────────────────────────────
    if (type === 'stickerMessage') {
      const src = `/api/media?msgId=${msg.id}`;
      return (
        <img
          src={src}
          alt="Figurinha"
          className="max-w-[160px] max-h-[160px] object-contain"
          style={{ background: 'transparent' }}
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.style.opacity = '0.3';
          }}
        />
      );
    }

    // ─── VIDEO ────────────────────────────────────────────────────────────────
    if (type === 'videoMessage') {
      const src = `/api/media?msgId=${msg.id}`;
      return (
        <div>
          <div
            className="relative cursor-pointer rounded-lg overflow-hidden max-w-[240px]"
            onClick={() => onMediaClick(msg.id)}
          >
            <video src={src} className="w-full rounded-lg" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Video className="h-10 w-10 text-white" />
            </div>
            {msg.mediaSeconds != null && (
              <span className="absolute bottom-2 right-2 text-xs text-white bg-black/50 rounded px-1">
                {formatDuration(msg.mediaSeconds)}
              </span>
            )}
          </div>
          {msg.mediaCaption && (
            <p className="text-sm mt-1 px-1">
              <FormattedText text={msg.mediaCaption} query={searchQuery} />
            </p>
          )}
        </div>
      );
    }

    // ─── AUDIO / PTT ─────────────────────────────────────────────────────────
    if (type === 'audioMessage') {
      const src = `/api/media?msgId=${msg.id}`;
      return (
        <div className="min-w-[220px]">
          <CustomAudioPlayer src={src} isMe={isFromMe} />
        </div>
      );
    }

    // ─── DOCUMENT ────────────────────────────────────────────────────────────
    if (type === 'documentMessage') {
      const filename = msg.text || msg.mediaCaption || 'Documento';
      const size = formatFileSize(msg.mediaFileLength);
      return (
        <a
          href={`/api/media?msgId=${msg.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-[180px]"
        >
          <div className={`p-2 rounded-lg ${isFromMe ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
            <FileText className="h-6 w-6 shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate max-w-[180px]">{filename}</p>
            {size && <p className="text-xs opacity-60">{size}</p>}
          </div>
          <Download className="h-4 w-4 shrink-0 opacity-60" />
        </a>
      );
    }

    // ─── LOCATION ────────────────────────────────────────────────────────────
    if (type === 'locationMessage') {
      const lat = msg.locationLatitude;
      const lng = msg.locationLongitude;
      const name = msg.locationName;
      const address = msg.locationAddress;
      const mapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;

      return (
        <a
          href={mapsUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:opacity-90 transition-opacity"
        >
          {lat && lng && (
            <div className="rounded-lg overflow-hidden max-w-[240px] mb-2 relative bg-muted">
              <img
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=240x120&markers=${lat},${lng}&key=`}
                alt="Mapa"
                className="w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <div className="flex items-center justify-center h-20 gap-2">
                <MapPin className="h-8 w-8 text-red-500" />
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 min-w-[160px]">
            <MapPin className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
            <div>
              {name && <p className="text-sm font-medium">{name}</p>}
              {address && <p className="text-xs opacity-70">{address}</p>}
              {!name && !address && lat && lng && (
                <p className="text-xs opacity-70">{parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}</p>
              )}
              <p className="text-xs opacity-50 mt-0.5">Toque para abrir no Maps</p>
            </div>
          </div>
        </a>
      );
    }

    // ─── LIVE LOCATION ───────────────────────────────────────────────────────
    if (type === 'liveLocationMessage') {
      const lat = msg.locationLatitude;
      const lng = msg.locationLongitude;
      const mapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;
      return (
        <a
          href={mapsUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 hover:opacity-90 transition-opacity min-w-[180px]"
        >
          <Navigation className="h-5 w-5 shrink-0 text-green-500" />
          <div>
            <p className="text-sm font-medium">Localização em tempo real</p>
            {lat && lng && (
              <p className="text-xs opacity-60">{parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}</p>
            )}
          </div>
        </a>
      );
    }

    // ─── CONTACT ─────────────────────────────────────────────────────────────
    if (type === 'contactMessage' || type === 'contactsArrayMessage') {
      const name = msg.contactName || 'Contato';
      const vcard = msg.contactVcard;
      const vcardDataUri = vcard ? `data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}` : null;
      const phoneMatch = vcard?.match(/TEL[^:]*:([^\r\n]+)/);
      const phone = phoneMatch ? phoneMatch[1].trim() : null;

      return (
        <div className="flex items-center gap-3 min-w-[200px]">
          <div className={`p-2 rounded-full ${isFromMe ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
            <User className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{name}</p>
            {phone && <p className="text-xs opacity-60 flex items-center gap-1"><Phone className="h-3 w-3" />{phone}</p>}
          </div>
          {vcardDataUri && (
            <a href={vcardDataUri} download={`${name}.vcf`} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity" title="Salvar contato">
              <Download className="h-4 w-4" />
            </a>
          )}
        </div>
      );
    }

    // ─── VIEW ONCE ───────────────────────────────────────────────────────────
    if (type === 'viewOnceMessage' || type === 'viewOnceMessageV2') {
      const src = `/api/media?msgId=${msg.id}`;
      const isImage = msg.mediaMimetype?.startsWith('image/') ?? true;
      const isVideo = msg.mediaMimetype?.startsWith('video/');
      if (isVideo) {
        return (
          <div
            className="relative cursor-pointer rounded-lg overflow-hidden max-w-[240px]"
            onClick={() => onMediaClick(msg.id)}
          >
            <video src={src} className="w-full rounded-lg" />
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 gap-1">
              <Eye className="h-8 w-8 text-white" />
              <span className="text-xs text-white">Visualização única</span>
            </div>
          </div>
        );
      }
      return (
        <div>
          <img
            src={src}
            alt="Visualização única"
            className="rounded-lg max-w-[240px] cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onMediaClick(msg.id)}
          />
          <p className="text-xs opacity-60 mt-1 flex items-center gap-1">
            <Eye className="h-3 w-3" /> Visualização única
          </p>
        </div>
      );
    }

    // ─── REACTION ────────────────────────────────────────────────────────────
    if (type === 'reactionMessage') {
      const emoji = msg.text || '👍';
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-2xl">{emoji}</span>
          <span className="text-xs opacity-60">Reação</span>
        </div>
      );
    }

    // ─── POLL ────────────────────────────────────────────────────────────────
    if (type === 'pollCreationMessage' || type === 'pollCreationMessageV2' || type === 'pollCreationMessageV3') {
      let pollData: any = {};
      try { pollData = JSON.parse(msg.text || '{}'); } catch { /* ignore */ }
      const question = pollData.name || msg.text || 'Enquete';
      const options: string[] = pollData.options || [];

      return (
        <div className="min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="h-4 w-4 shrink-0 opacity-70" />
            <p className="text-sm font-semibold">{question}</p>
          </div>
          {options.length > 0 && (
            <div className="flex flex-col gap-1">
              {options.map((opt: string, i: number) => (
                <div
                  key={i}
                  className={`text-xs px-3 py-1.5 rounded-full border ${isFromMe ? 'border-primary-foreground/30' : 'border-border'}`}
                >
                  {opt}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    // ─── LIST MESSAGE ─────────────────────────────────────────────────────────
    if (type === 'listMessage') {
      let listData: any = {};
      try { listData = JSON.parse(msg.text || '{}'); } catch { /* ignore */ }
      const title = listData.title || listData.buttonText || msg.text || 'Lista';
      const description = listData.description;
      const sections: any[] = listData.sections || [];

      return (
        <div className="min-w-[220px]">
          <div className="flex items-center gap-2 mb-1">
            <List className="h-4 w-4 shrink-0 opacity-70" />
            <p className="text-sm font-semibold">{title}</p>
          </div>
          {description && <p className="text-xs opacity-70 mb-2">{description}</p>}
          {sections.map((section: any, si: number) => (
            <div key={si} className="mb-2">
              {section.title && <p className="text-xs font-semibold opacity-60 uppercase tracking-wide mb-1">{section.title}</p>}
              {(section.rows || []).map((row: any, ri: number) => (
                <div
                  key={ri}
                  className={`text-xs px-3 py-1.5 rounded-lg border mb-1 ${isFromMe ? 'border-primary-foreground/30' : 'border-border'}`}
                >
                  <p className="font-medium">{row.title}</p>
                  {row.description && <p className="opacity-60">{row.description}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      );
    }

    // ─── GROUP INVITE ─────────────────────────────────────────────────────────
    if (type === 'groupInviteMessage') {
      let inviteData: any = {};
      try { inviteData = JSON.parse(msg.text || '{}'); } catch { /* ignore */ }
      const groupName = inviteData.groupName || inviteData.subject || msg.text || 'Grupo';
      const inviteCode = inviteData.inviteCode;
      const inviteUrl = inviteCode ? `https://chat.whatsapp.com/${inviteCode}` : null;

      return (
        <a
          href={inviteUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-[200px]"
        >
          <div className={`p-2 rounded-full ${isFromMe ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
            <Users className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs opacity-60 mb-0.5">Convite para grupo</p>
            <p className="text-sm font-semibold truncate">{groupName}</p>
            <p className="text-xs opacity-50">Toque para entrar</p>
          </div>
        </a>
      );
    }

    // ─── BUTTONS / TEMPLATE ──────────────────────────────────────────────────
    if (type === 'buttonsMessage' || type === 'templateMessage' || type === 'interactiveMessage') {
      if (msg.text) {
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            <FormattedText text={msg.text} query={searchQuery} />
          </p>
        );
      }
    }

    // ─── BUTTONS RESPONSE ────────────────────────────────────────────────────
    if (type === 'buttonsResponseMessage' || type === 'templateButtonReplyMessage' || type === 'listResponseMessage') {
      const label = msg.text || 'Respondeu a um botão';
      return (
        <div className="flex items-center gap-2">
          <div className={`text-xs px-3 py-1.5 rounded-full border font-medium ${isFromMe ? 'border-primary-foreground/40' : 'border-primary/40 text-primary'}`}>
            {label}
          </div>
        </div>
      );
    }

    // ─── PLAIN TEXT ──────────────────────────────────────────────────────────
    if (msg.text) {
      return (
        <p className="text-sm">
          <FormattedText text={msg.text} query={searchQuery} />
        </p>
      );
    }

    // ─── FALLBACK ────────────────────────────────────────────────────────────
    return (
      <div className="flex items-center gap-1.5 opacity-50">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
        <p className="text-xs italic">Mensagem não suportada</p>
      </div>
    );
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
            <p className="text-[10px] font-medium opacity-60 mb-1 uppercase tracking-wide">Agente IA</p>
          )}
          {msg.isAutomation && (
            <p className="text-[10px] font-medium opacity-60 mb-1 uppercase tracking-wide">Automação</p>
          )}
          {msg.isInternal && (
            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1.5 uppercase tracking-widest flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" /> Nota Interna
            </p>
          )}
          {isFromMe && msg.senderName && !msg.isAi && !msg.isAutomation && (
            <p className="text-[10px] font-medium opacity-70 mb-1">{msg.senderName}</p>
          )}
          {renderQuotedMessage()}
          {renderContent()}
          <div className={`flex items-center gap-1 mt-1 ${isFromMe ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] opacity-60">{formatTime(msg.timestamp)}</span>
            {isFromMe && <StatusIcon status={msg.status} />}
          </div>
        </div>

        {isFromMe && (
          <div className={`flex flex-col gap-0.5 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={() => onReply(msg)}
            >
              <Reply className="h-3 w-3" />
            </Button>
            {onDeleteMessage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDeleteMessage(msg.id)}
                title="Apagar mensagem"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
