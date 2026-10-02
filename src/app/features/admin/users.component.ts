import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminUser, UserRole } from '../../core/models';
import { AdminUserService } from '../../core/services/admin-user.service';
import { ToastService } from '../../core/services/toast.service';
import { roleBadgeClasses } from '../../core/utils/role-style';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.component.html'
})
export class UsersComponent implements OnInit {
  private userService = inject(AdminUserService);
  private toast = inject(ToastService);
  users = signal<AdminUser[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  updatingUserId = signal<string | null>(null);
  roleBadgeClasses = roleBadgeClasses;
  newUser = { fullName: '', email: '', password: '', role: 'DEVELOPER' as UserRole };

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers().subscribe({
      next: users => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.error('No se pudo cargar la lista de usuarios.');
        this.isLoading.set(false);
      }
    });
  }

  createUser(): void {
    this.isSaving.set(true);
    this.userService.createUser({
      ...this.newUser,
      fullName: this.newUser.fullName.trim(),
      email: this.newUser.email.trim()
    }).subscribe({
      next: user => {
        this.users.update(users => [user, ...users]);
        this.newUser = { fullName: '', email: '', password: '', role: 'DEVELOPER' };
        this.toast.success('El usuario se creó correctamente.');
        this.isSaving.set(false);
      },
      error: err => {
        this.toast.errorFor(err, 'No se pudo crear el usuario.');
        this.isSaving.set(false);
      }
    });
  }

  updateUser(user: AdminUser, changes: { role?: UserRole; active?: boolean }): void {
    const request = { role: changes.role ?? user.role, active: changes.active ?? user.active };
    this.updatingUserId.set(user.id);
    this.userService.updateUser(user.id, request).subscribe({
      next: updated => {
        this.users.update(users => users.map(item => item.id === updated.id ? updated : item));
        this.toast.success('Los datos del usuario se actualizaron.');
        this.updatingUserId.set(null);
      },
      error: err => {
        this.toast.errorFor(err, 'No se pudo actualizar el usuario.');
        this.updatingUserId.set(null);
      }
    });
  }
}
