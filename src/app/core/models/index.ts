export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  storyPoints: number;
  assignee: User;
  tags: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string;
}
