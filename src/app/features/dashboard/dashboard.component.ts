import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="flex h-screen w-screen overflow-hidden bg-background">
      <app-sidebar></app-sidebar>
      <div class="flex-1 flex flex-col min-w-0">
        <app-topbar></app-topbar>
        <main class="flex-1 overflow-y-auto bg-background p-6">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `
})
export class DashboardComponent {}
