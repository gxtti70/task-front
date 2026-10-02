import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
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
  private toast = inject(ToastService);

  // Estas variables se mapean directo con el [(ngModel)] de tu HTML
  name = '';
  email = '';
  password = '';

  isLoading = signal(false);

  onSubmit(): void {
    // Validación preventiva en el cliente
    if (!this.name.trim() || !this.email.trim() || !this.password.trim()) {
      this.toast.error('Completa tu nombre, correo y contraseña.', 'Faltan datos');
      return;
    }

    if (this.password.length < 6) {
      this.toast.error('La contraseña debe tener al menos 6 caracteres.', 'Contraseña no válida');
      return;
    }

    this.isLoading.set(true);

    // Mapeo exacto apuntando al DTO 'RegisterRequest' de tu Spring Boot
    const registerPayload = {
      fullName: this.name,
      email: this.email,
      password: this.password
    };
    this.authService.register(registerPayload).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toast.success('Tu cuenta quedó creada. Ya puedes iniciar sesión.');
        // Redirección limpia hacia el login
        this.router.navigate(['/auth/login']);
      },
      error: (err) => {
        this.toast.errorFor(err, 'No se pudo crear la cuenta.');
        this.isLoading.set(false);
      }
    });
  }
}
