import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);

  email = '';
  password = '';
  isLoading = signal(false);

  ngOnInit(): void {
    //Si ya hay una sesión activa, lo redirigimos directo al Kanban
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard/kanban']);
    }
  }

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.toast.error('Ingresa tu correo y contraseña para continuar.', 'Faltan datos');
      return;
    }

    this.isLoading.set(true);
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard/kanban']);
      },
      error: (err) => {
        this.toast.errorFor(err, 'No se pudo iniciar sesión. Revisa tus credenciales.');
        this.isLoading.set(false);
      }
    });
  }
}
