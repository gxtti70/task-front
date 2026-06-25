import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 🚀 VITAL: Vincula el ngModel del HTML
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-register',
  standalone: true,
  // Asegúrate de que FormsModule esté exactamente aquí listado
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // Estas variables se mapean directo con el [(ngModel)] de tu HTML
  name = '';
  email = '';
  password = '';
  
  errorMessage = signal<string | null>(null);
  isLoading = signal(false);

  onSubmit(): void {
    // Validación preventiva en el cliente
    if (!this.name.trim() || !this.email.trim() || !this.password.trim()) {
      this.errorMessage.set('Completa rigurosamente todos los campos establecidos.');
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Mapeo exacto apuntando al DTO 'RegisterRequest' de tu Spring Boot
    const registerPayload = {
      fullName: this.name,
      email: this.email,
      password: this.password,
      role: 'developer' // Cambiado a minúscula para hacer match exacto con tu backend
    };

    this.authService.register(registerPayload).subscribe({
      next: () => {
        this.isLoading.set(false);
        // Redirección limpia hacia el login
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        // Captura el mensaje de error estructurado del backend si existe
        this.errorMessage.set(err.error || 'Error al procesar el registro.');
        this.isLoading.set(false);
      }
    });
  }
}