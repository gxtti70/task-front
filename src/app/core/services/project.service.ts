import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project, ProjectMember, ProjectRequest } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/projects`;

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.API_URL);
  }

  createProject(project: ProjectRequest): Observable<Project> {
    return this.http.post<Project>(this.API_URL, project);
  }

  updateProject(id: string, project: ProjectRequest): Observable<Project> {
    return this.http.put<Project>(`${this.API_URL}/${id}`, project);
  }

  getMembers(projectId: string): Observable<ProjectMember[]> {
    return this.http.get<ProjectMember[]>(`${this.API_URL}/${projectId}/members`);
  }

  addMember(projectId: string, userId: string): Observable<ProjectMember> {
    return this.http.post<ProjectMember>(`${this.API_URL}/${projectId}/members`, { userId });
  }

  removeMember(projectId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${projectId}/members/${userId}`);
  }
}
