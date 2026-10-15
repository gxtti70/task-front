import { Component, HostListener, inject, OnInit } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs';
import { ToastViewportComponent } from './shared/toast-viewport.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastViewportComponent],
  template: `<router-outlet></router-outlet><app-toast-viewport></app-toast-viewport>
    @if (!isOnline) { <div class="fixed bottom-4 left-1/2 z-[110] -translate-x-1/2 rounded-full border border-amber-800/70 bg-zinc-950 px-4 py-2 text-xs text-amber-200 shadow-xl" role="status">Sin conexión a Internet</div> }`
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  private title = inject(Title);
  isOnline = navigator.onLine;

  ngOnInit(): void {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe(() => {
      let route = this.router.routerState.snapshot.root;
      while (route.firstChild) route = route.firstChild;
      this.title.setTitle(route.data['title'] ?? 'TaskManager');
    });
  }

  @HostListener('window:online') onOnline(): void { this.isOnline = true; }
  @HostListener('window:offline') onOffline(): void { this.isOnline = false; }
}
