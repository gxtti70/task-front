import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastViewportComponent } from './shared/toast-viewport.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastViewportComponent],
  template: `<router-outlet></router-outlet><app-toast-viewport></app-toast-viewport>`
})
export class AppComponent {}
