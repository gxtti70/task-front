import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  onSubmit(): void {
    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor completa todos los campos requisitados.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/dashboard/kanban']);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Error de credenciales. Intenta de nuevo.');
        this.isLoading.set(false);
      }
    });
  }
}
