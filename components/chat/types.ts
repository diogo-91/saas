export type RecordingStatus = 'idle' | 'recording' | 'review' | 'sending';

export interface Message {
  id: string;
  chatId: number;
  fromMe: boolean;
  messageType: string | null;
  text: string | null;
  mediaUrl: string | null;
  mediaMimetype: string | null;
  mediaCaption: string | null;
  mediaFileLength?: string | null;
  mediaSeconds?: number | null;
  mediaIsPtt?: boolean | null;
  contactName?: string | null;
  locationLatitude?: string | null;
  locationLongitude?: string | null;
  locationName?: string | null;
  status: string | null;
  isAi: boolean | null;
  isAutomation: boolean | null;
  isInternal?: boolean | null;
  quotedMessageId?: string | null;
  quotedMessageText?: string | null;
  timestamp: string;
}

export interface QuickReply {
  id: number;
  teamId: number;
  shortcut: string;
  content: string;
  createdAt?: Date | string;
}

export interface NewMessagePayload extends Message {
  remoteJid: string;
  instanceId?: number;
}

export interface ChatDetails {
  remoteJid: string | null;
  name: string;
  profilePicUrl: string | null;
  lastCustomerInteraction: string | null;
  integration: string;
}

export interface Tag {
  id: number;
  teamId: number;
  name: string;
  color: string | null;
  createdAt: string;
}

export interface FunnelStage {
  id: number;
  name: string;
  emoji: string | null;
  order: number;
}

export interface ContactData {
  id?: number;
  name: string;
  notes?: string | null;
  tags?: Tag[];
  assignedUser?: Pick<UserData, 'id' | 'name' | 'email'> | null;
  funnelStage?: FunnelStage | null;
}

export interface TeamData {
  id: number;
  name?: string;
}

export interface UserData {
  id: number;
  name: string | null;
  email: string;
  role: string;
}
