import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LegalService, LegalVersions } from '../../core/services/legal.service';
import { ToastService } from '../../core/services/toast.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {
  private authService = inject(AuthService);
  private legalService = inject(LegalService);
  private router = inject(Router);
  private toast = inject(ToastService);

  name = '';
  email = '';
  password = '';

  // Autorización previa, expresa e informada (Ley 1581 de 2012, art. 9).
  acceptTerms = false;
  acceptPrivacy = false;

  private legalVersions: LegalVersions | null = null;

  isLoading = signal(false);

  ngOnInit(): void {
    this.legalService.getVersions().subscribe({
      next: versions => (this.legalVersions = versions),
      error: () => (this.legalVersions = null)
    });
  }

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

    if (!this.acceptTerms || !this.acceptPrivacy) {
      this.toast.error('Debes aceptar los Términos y Condiciones y la Política de Tratamiento de Datos Personales.', 'Aceptación requerida');
      return;
    }

    if (!this.legalVersions) {
      this.toast.error('No pudimos cargar los documentos legales. Recarga la página e inténtalo de nuevo.', 'Documentos no disponibles');
      return;
    }

    this.isLoading.set(true);

    const registerPayload = {
      fullName: this.name.trim(),
      email: this.email,
      password: this.password,
      acceptTerms: true,
      acceptPrivacy: true,
      termsVersion: this.legalVersions.termsVersion,
      privacyVersion: this.legalVersions.privacyVersion
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

  onGoogleRegister(): void {
    if (!this.acceptTerms || !this.acceptPrivacy) {
      this.toast.error('Debes aceptar los Términos y Condiciones y la Política de Tratamiento de Datos Personales.', 'Aceptación requerida');
      return;
    }
    if (!this.legalVersions) {
      this.toast.error('No pudimos cargar los documentos legales. Recarga la página e inténtalo de nuevo.', 'Documentos no disponibles');
      return;
    }
    this.isLoading.set(true);
    this.authService.prepareGoogleRegistration({
      acceptTerms: true,
      acceptPrivacy: true,
      termsVersion: this.legalVersions.termsVersion,
      privacyVersion: this.legalVersions.privacyVersion
    }).subscribe({
      next: () => this.authService.loginWithGoogle(),
      error: err => {
        this.isLoading.set(false);
        this.toast.errorFor(err, 'No se pudo iniciar el registro con Google.');
      }
    });
  }
}
