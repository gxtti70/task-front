import { Component, signal, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './topbar.component.html'
})
export class TopbarComponent {
  isSearchOpen = signal(false);
  hasNotifications = signal(true);

  toggleSearch() {
    this.isSearchOpen.update(v => !v);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.toggleSearch();
    }
    if (event.key === 'Escape' && this.isSearchOpen()) {
      this.isSearchOpen.set(false);
    }
  }
}
