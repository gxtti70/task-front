import { Component, DestroyRef, NgZone, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Channel, ChatMessage, Project, User } from '../../core/models';
import { ChatService } from '../../core/services/chat.service';
import { TypingIndicatorComponent } from './typing-indicator.component';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { UserDirectoryService } from '../../core/services/user-directory.service';
import { ToastService } from '../../core/services/toast.service';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FocusTrapDirective, SkeletonComponent, TypingIndicatorComponent],
  templateUrl: './chat.component.html'
})
export class ChatComponent implements OnInit {
  readonly chat = inject(ChatService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly zone = inject(NgZone);
  private readonly projectService = inject(ProjectService);
  private readonly userDirectory = inject(UserDirectoryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rooms = computed(() => this.chat.channels().filter(channel => channel.projectId !== null));
  readonly directs = computed(() => this.chat.channels().filter(channel => channel.projectId === null));
  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? '');

  readonly projectList = signal<Project[]>([]);
  readonly userList = signal<User[]>([]);
  readonly creatableProjects = computed(() => {
    const self = this.currentUserId();
    return this.auth.isAdmin() ? this.projectList() : this.projectList().filter(p => p.ownerId === self);
  });

  readonly dialogOpen = signal(false);
  readonly dialogTab = signal<'room' | 'dm'>('room');
  readonly roomName = signal('');
  readonly roomProjectId = signal('');
  readonly dmSearch = signal('');
  readonly creating = signal(false);
  readonly draft = signal('');
  readonly sidebarOpen = signal(false);
  readonly selectedFile = signal<File | null>(null);

  readonly filteredUsers = computed(() => {
    const query = this.dmSearch().trim().toLowerCase();
    const self = this.currentUserId();
    return this.userList().filter(user => user.id && user.id !== self
      && (!query || `${user.fullName ?? ''} ${user.email}`.toLowerCase().includes(query)));
  });

  private readonly scroller = viewChild<HTMLElement>('messagesScroller');
  private lastScrolledMessageId = '';
  private typingTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const element = this.scroller();
      const lastId = this.chat.messages().at(-1)?.id ?? '';
      if (!element || !lastId || lastId === this.lastScrolledMessageId) return;
      this.lastScrolledMessageId = lastId;
      queueMicrotask(() => { element.scrollTop = element.scrollHeight; });
    });
  }

  ngOnInit(): void {
    this.chat.pollWhenVisible();
    this.projectService.getProjects().subscribe({ next: list => this.projectList.set(list) });
    this.userDirectory.getActiveUsers().subscribe({ next: list => this.userList.set(list) });
    // Sondeo cada 4 s solo mientras la pestaña esté visible, fuera de la zona para no saturar el detector de cambios.
    this.zone.runOutsideAngular(() => {
      const poller = setInterval(() => {
        if (document.visibilityState === 'visible') this.zone.run(() => this.chat.pollWhenVisible());
      }, this.chat.pollIntervalMs);
      this.destroyRef.onDestroy(() => clearInterval(poller));
    });
  }

  channelLabel(channel: Channel | null): string {
    if (!channel) return '';
    return channel.otherUserName || channel.name || 'Conversación';
  }

  initialsOf(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    return words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : words[0].slice(0, 2).toUpperCase();
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    if (element.scrollTop < 80) this.chat.loadOlderMessages();
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    this.submitDraft();
  }

  onSendClick(): void {
    this.submitDraft();
  }

  private submitDraft(): void {
    const text = this.draft();
    this.chat.send(text);
    if (text.trim()) this.draft.set('');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    input.value = ''; // reset para poder seleccionar el mismo archivo de nuevo
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
  }

  getFileIcon(contentType: string | null | undefined): string {
    if (!contentType) return 'paperclip';
    if (contentType.startsWith('audio/')) return 'headphones';
    if (contentType.startsWith('image/')) return 'image';
    if (contentType.startsWith('video/')) return 'film';
    if (contentType.includes('pdf')) return 'file-text';
    if (contentType.includes('word') || contentType.includes('document')) return 'file-text';
    if (contentType.includes('excel') || contentType.includes('spreadsheet')) return 'file';
    if (contentType.includes('zip') || contentType.includes('compressed')) return 'file';
    return 'paperclip';
  }

  formatFileSize(bytes: number | null | undefined): string {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  onSendFile(): void {
    const file = this.selectedFile();
    const channelId = this.chat.activeChannelId();
    if (!file || !channelId) return;
    this.chat.sendFile(channelId, file, this.draft());
    this.draft.set('');
    this.selectedFile.set(null);
  }

  onDownloadFile(message: ChatMessage): void {
    if (message.downloadUrl) {
      this.chat.downloadFile(this.chat.activeChannelId()!, message.id);
    }
  }

  onDeleteFile(message: ChatMessage): void {
    if (!confirm('¿Eliminar este archivo?')) return;
    const channelId = this.chat.activeChannelId();
    if (!channelId) return;
    this.chat.deleteFile(channelId, message.id);
  }

  onTyping(): void {
    const selfId = this.currentUserId();
    const selfName = this.auth.currentUser()?.fullName || this.auth.currentUser()?.email || 'Tú';
    if (!selfId) return;

    // Marca al usuario actual como escribiendo.
    this.chat.typingUsers.update(map => {
      const next = new Map(map);
      next.set(selfId, selfName);
      return next;
    });

    // Reinicia el temporizador para dejar de mostrar "escribiendo" tras 2s sin teclas.
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.chat.typingUsers.update(map => {
        const next = new Map(map);
        next.delete(selfId);
        return next;
      });
      this.typingTimeout = null;
    }, 2000);
  }

  openDialog(tab: 'room' | 'dm'): void {
    this.dialogTab.set(tab);
    this.dialogOpen.set(true);
    this.roomName.set('');
    this.dmSearch.set('');
    if (tab === 'room') this.roomProjectId.set(this.creatableProjects().at(0)?.id ?? '');
  }

  switchDialogTab(tab: 'room' | 'dm'): void {
    this.openDialog(tab);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  openChannelAndCloseSidebar(channelId: string): void {
    this.chat.openChannel(channelId);
    if (this.sidebarOpen()) this.toggleSidebar();
  }

  submitRoom(): void {
    const projectId = this.roomProjectId();
    const name = this.roomName().trim();
    if (!projectId || !name || this.creating()) return;
    this.creating.set(true);
    this.chat.createChannel({ projectId, name, type: 'TEXT' }).subscribe({
      next: channel => {
        this.creating.set(false);
        this.toast.success('Sala creada');
        this.chat.openChannel(channel.id);
        this.closeDialog();
      },
      error: error => {
        this.creating.set(false);
        this.toast.errorFor(error, 'No se pudo crear la sala.');
      }
    });
  }

  openDirectDiscussion(user: User): void {
    if (!user.id || this.creating()) return;
    this.creating.set(true);
    this.chat.openDirectChannel(user.id).subscribe({
      next: () => {
        this.creating.set(false);
        this.closeDialog();
      },
      error: error => {
        this.creating.set(false);
        this.toast.errorFor(error, 'No se pudo abrir la conversación.');
      }
    });
  }
}
