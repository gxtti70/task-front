export interface User {
  id?: string;
  email: string;
  name?: string;
  fullName?: string;
  role?: string;
  avatarUrl?: string;
  avatarData?: string | null;
  timezone?: string | null;
  weekStartsOn?: number | null;
  jobTitle?: string | null;
  bio?: string | null;
  accentColor?: string | null;
  presenceStatus?: PresenceStatus;
  lastSeenAt?: string | null;
}

export type PresenceStatus = 'AVAILABLE' | 'BUSY' | 'DO_NOT_DISTURB' | 'BE_RIGHT_BACK' | 'AWAY' | 'OUT_OF_OFFICE' | 'APPEAR_OFFLINE' | 'OFFLINE';

export interface PresenceEntry {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: string | null;
}

export interface ProfileUpdateRequest {
  fullName: string;
  avatarData?: string;
  timezone?: string;
  weekStartsOn?: number;
  jobTitle?: string;
  bio?: string;
  accentColor?: string;
}

export interface AuthResponse {
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenType?: string;
  email: string;
  role: string;
  userId: string;
  fullName?: string;
  user?: User;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'SCRUM' | 'DEVELOPER';

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'IMPEDIMENT' | 'DONE';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number;
  dueDate?: string | null;
  assignee: User;
  assigneeId?: string;
  tags: string[];
  projectId?: string | null;
  createdAt: string;
}

export interface TaskComment {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
}

export type ChannelType = 'TEXT' | 'VOICE';

export interface Channel {
  id: string;
  type: ChannelType;
  /** Nombre visible en salas de proyecto; en DMs el backend lo devuelve null. */
  name: string | null;
  projectId: string | null;
  /** Contraparte del DM (null en salas de proyecto). */
  otherUserId?: string | null;
  otherUserName?: string | null;
  createdAt: string;
}

export interface ChannelRequest {
  projectId: string;
  name: string;
  type?: string;
}

export interface DirectChannelRequest {
  memberId: string;
}

export interface ChatMessage {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
  messageType?: 'TEXT' | 'FILE';
  fileName?: string | null;
  fileContentType?: string | null;
  fileSizeBytes?: number | null;
  downloadUrl?: string | null;
  /** Número de destinatarios que recibieron el mensaje (excluye al autor). */
  deliveredCount?: number;
  /** Número de destinatarios que leyeron el mensaje (excluye al autor). */
  readCount?: number;
  /** Total de destinatarios (miembros del canal menos el autor). */
  recipientCount?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'ARCHIVED';
  tasksCount: number;
  membersCount: number;
  ownerId: string;
  createdAt: string;
  archived?: boolean;
}

export interface FavoriteProject {
  id: string;
  name: string;
  status: Project['status'];
}

export interface ProjectRequest {
  name: string;
  description: string;
  status: Project['status'];
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
}

export interface ProjectMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  targetUrl: string;
  read: boolean;
  createdAt: string;
}

export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'PREMIUM_PLUS';

export interface Plan {
  tier: SubscriptionTier;
  name: string;
  maxProjects: number;
  maxMembersPerProject: number;
  price: number;
  currency: string;
  features: string[];
  capabilities?: Record<string, boolean>;
  maxAttachmentMB?: number;
  maxAttachmentsPerTask?: number;
}

export interface SubscriptionSummary {
  tier: SubscriptionTier;
  status: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  provider?: string;
  usage: { projects: number; maxProjects: number; membersPerProject: number; maxMembersPerProject: number };
  features: string[];
  capabilities?: Record<string, boolean>;
}

export interface TaskAttachment {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadUrl?: string;
  uploadFields?: Record<string, string>;
  downloadUrl: string;
  createdAt: string;
}

export interface Announcement {
  key: string;
  title: string;
  body: string;
}
