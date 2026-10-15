import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { FavoriteProject, Project, ProjectMember, ProjectRequest } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/projects`;
  readonly favoriteProjects = signal<FavoriteProject[]>([]);

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(this.API_URL);
  }

  loadFavoriteProjects(): Observable<FavoriteProject[]> {
    return this.http.get<FavoriteProject[]>(`${environment.apiUrl}/users/me/favorites`)
      .pipe(tap(favorites => this.favoriteProjects.set(favorites)));
  }

  isFavorite(projectId: string): boolean {
    return this.favoriteProjects().some(project => project.id === projectId);
  }

  setFavorite(project: Pick<Project, 'id' | 'name' | 'status'>, favorite: boolean): Observable<void> {
    const url = `${this.API_URL}/${project.id}/favorite`;
    const request = favorite ? this.http.post<void>(url, {}) : this.http.delete<void>(url);
    return request.pipe(tap(() => this.favoriteProjects.update(items => favorite
      ? items.some(item => item.id === project.id) ? items : [{ ...project }, ...items]
      : items.filter(item => item.id !== project.id))));
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
