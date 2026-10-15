import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, map } from 'rxjs';
import { Task, TaskAttachment, TaskComment, TaskStatus } from '../models';
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

  getComments(taskId: string): Observable<TaskComment[]> {
    return this.http.get<TaskComment[]>(`${this.API_URL}/${taskId}/comments`);
  }

  addComment(taskId: string, body: string): Observable<TaskComment> {
    return this.http.post<TaskComment>(`${this.API_URL}/${taskId}/comments`, { body });
  }

  getAttachments(taskId: string): Observable<TaskAttachment[]> {
    return this.http.get<TaskAttachment[]>(`${this.API_URL}/${taskId}/attachments`);
  }

  prepareAttachment(taskId: string, file: File): Observable<TaskAttachment> {
    return this.http.post<TaskAttachment>(`${this.API_URL}/${taskId}/attachments`, {
      filename: file.name, contentType: file.type || 'application/octet-stream', sizeBytes: file.size
    });
  }

  uploadAttachment(_taskId: string, attachment: TaskAttachment, file: File): Observable<void> {
    const url = attachment.uploadUrl!;
    if (url.startsWith('/')) {
      return this.http.put<void>(url, file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } });
    }
    const form = new FormData();
    for (const [name, value] of Object.entries(attachment.uploadFields ?? {})) form.append(name, value);
    form.append('file', file);
    return from(fetch(url, { method: 'POST', body: form }).then(response => {
      if (!response.ok) throw new Error(`La carga a S3 falló (${response.status}).`);
    })).pipe(map(() => undefined));
  }

  completeAttachmentUpload(taskId: string, attachmentId: string): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${taskId}/attachments/${attachmentId}/complete`, {});
  }

  deleteAttachment(taskId: string, attachmentId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${taskId}/attachments/${attachmentId}`);
  }

  downloadLocalAttachment(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }
}
