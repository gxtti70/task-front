import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task, TaskStatus } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/tasks`;

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.API_URL);
  }

  createTask(task: Partial<Task>): Observable<Task> {
    return this.http.post<Task>(this.API_URL, task);
  }

  updateTaskStatus(taskId: string, status: TaskStatus): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/${taskId}/status`, { status });
  }

  updateTask(taskId: string, task: Partial<Task>): Observable<Task> {
    return this.http.put<Task>(`${this.API_URL}/${taskId}`, task);
  }

  deleteTask(taskId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${taskId}`);
  }
}
