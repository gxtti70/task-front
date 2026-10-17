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
