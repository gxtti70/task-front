import { Component, DestroyRef, HostListener, NgZone, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideAngularModule } from 'lucide-angular';
import { Channel, ChatMessage, Project, User } from '../../core/models';
import { ChatService } from '../../core/services/chat.service';
import { PushNotificationService } from '../../core/services/push-notification.service';
import { TypingIndicatorComponent } from './typing-indicator.component';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { UserDirectoryService } from '../../core/services/user-directory.service';
import { ToastService } from '../../core/services/toast.service';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

type ChatDisplayItem =
  | { type: 'message'; id: string; message: ChatMessage }
  | { type: 'image-grid'; id: string; messages: ChatMessage[] };

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FocusTrapDirective, SkeletonComponent, TypingIndicatorComponent],
  templateUrl: './chat.component.html'
})
export class ChatComponent implements OnInit {
  readonly chat = inject(ChatService);
  private readonly route = inject(ActivatedRoute);
  readonly push = inject(PushNotificationService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly zone = inject(NgZone);
  private readonly projectService = inject(ProjectService);
  private readonly userDirectory = inject(UserDirectoryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rooms = computed(() => this.chat.channels().filter(channel => channel.projectId !== null));
  readonly directs = computed(() => this.chat.channels().filter(channel => channel.projectId === null));
  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? '');
  readonly pushStatusLabel = computed(() => {
    if (!this.push.isSupported()) return 'No disp.';
    if (!this.push.isReady()) return 'Revisando';
    if (this.push.permission() === 'denied') return 'Bloqueadas';
    return this.push.isSubscribed() ? 'Activas' : 'Inactivas';
  });
  readonly pushStatusTitle = computed(() => {
    if (!this.push.isSupported()) return 'Push no disponibles en este navegador';
    if (!this.push.isReady()) return 'Comprobando estado de notificaciones push';
    if (this.push.permission() === 'denied') return 'Notificaciones push bloqueadas por el navegador';
    return this.push.isSubscribed() ? 'Notificaciones push activadas' : 'Notificaciones push desactivadas';
  });
  readonly imageMessages = computed(() => this.chat.messages().filter(message => this.isImageMessage(message)));
  readonly lightboxIndex = signal(-1);
  readonly lightboxImage = computed(() => this.imageMessages()[this.lightboxIndex()] ?? null);
  readonly displayItems = computed<ChatDisplayItem[]>(() => {
    const messages = this.chat.messages();
    const items: ChatDisplayItem[] = [];
    for (let index = 0; index < messages.length;) {
      const message = messages[index];
      if (this.isImageMessage(message)) {
        const group = [message];
        let next = index + 1;
        while (next < messages.length && group.length < 4
          && this.isImageMessage(messages[next])
          && messages[next].authorId === message.authorId) {
          group.push(messages[next++]);
        }
        if (group.length > 1) items.push({ type: 'image-grid', id: message.id, messages: group });
        else items.push({ type: 'message', id: message.id, message });
        index = next;
        continue;
      }
      items.push({ type: 'message', id: message.id, message });
      index++;
    }
    return items;
  });

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
  private readonly composer = viewChild<HTMLTextAreaElement>('composer');
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
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const channelId = params.get('channelId');
      const focusReply = params.get('reply') === 'true';
      if (!channelId) return;
      if (this.chat.activeChannelId() === channelId) {
        if (focusReply) setTimeout(() => this.composer()?.focus());
        return;
      }
      this.chat.loadChannels().subscribe({
        next: channels => {
          if (!channels.some(channel => channel.id === channelId)) return;
          this.chat.openChannel(channelId);
          this.chat.markAsRead(channelId);
          if (focusReply) setTimeout(() => this.composer()?.focus());
        }
      });
    });
    this.projectService.getProjects().subscribe({ next: list => this.projectList.set(list) });
    this.userDirectory.getActiveUsers().subscribe({ next: list => this.userList.set(list) });
    // Sondeo cada 4 s solo mientras la pestaña esté visible, fuera de la zona para no saturar el detector de cambios.
    this.zone.runOutsideAngular(() => {
      const poller = setInterval(() => {
        if (document.visibilityState === 'visible') {
          this.zone.run(() => {
            this.chat.pollWhenVisible();
          });
        }
      }, this.chat.pollIntervalMs);
      this.destroyRef.onDestroy(() => clearInterval(poller));
    });
  }

  async subscribePush(): Promise<void> {
    if (this.push.isSubscribed()) {
      await this.push.unsubscribe();
      this.toast.info?.('Notificaciones push desactivadas');
    } else {
      const ok = await this.push.subscribe();
      if (ok) this.toast.success?.('Notificaciones push activadas');
      else this.toast.error?.('No se pudo activar las notificaciones push');
    }
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

  isImageMessage(message: ChatMessage): boolean {
    return message.messageType === 'FILE' && !!message.fileContentType?.startsWith('image/') && !!message.downloadUrl;
  }

  openImage(message: ChatMessage): void {
    const index = this.imageMessages().findIndex(image => image.id === message.id);
    if (index >= 0) this.lightboxIndex.set(index);
  }

  closeLightbox(): void {
    this.lightboxIndex.set(-1);
  }

  moveLightbox(step: number): void {
    const total = this.imageMessages().length;
    if (total < 2) return;
    this.lightboxIndex.update(index => (index + step + total) % total);
  }

  @HostListener('document:keydown', ['$event'])
  onLightboxKeydown(event: KeyboardEvent): void {
    if (this.lightboxIndex() < 0) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.moveLightbox(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.moveLightbox(1);
    }
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
    this.chat.markAsRead(channelId);
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
