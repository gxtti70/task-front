export interface User {
  id?: string;
  email: string;
  name?: string;
  fullName?: string;
  role?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  email: string;
  role: string;
  userId: string;
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
  assignee: User;
  assigneeId?: string;
  tags: string[];
  projectId?: string | null;
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
