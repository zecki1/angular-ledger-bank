import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login-page.html',
  styles: [
    `
      :host {
        display: block;
        min-height: 100svh;
      }
      .field {
        width: 100%;
        border-radius: 0.75rem;
        border: 1px solid var(--color-border);
        background-color: var(--color-surface);
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        color: var(--color-cream);
        outline: none;
      }
      .field::placeholder {
        color: var(--color-mute);
      }
      .field:focus {
        border-color: var(--color-brand-soft);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  // `takeUntilDestroyed()` sem `DestroyRef` exige contexto de injeção, que o
  // handler de evento do template não garante — daí o `DestroyRef` explícito.
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly demoEmail = environment.demoEmail;

  login(form: NgForm): void {
    if (form.invalid) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth
      .login(form.value['email'], form.value['password'])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: () => {
          this.loading.set(false);
          this.error.set('Não foi possível entrar. Verifique e-mail e senha.');
        },
        complete: () => this.loading.set(false),
      });
  }

  loginDemo(): void {
    this.loading.set(true);
    this.error.set('');
    this.auth
      .loginDemo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: () => {
          this.loading.set(false);
          this.error.set('Não foi possível entrar no modo demo.');
        },
        complete: () => this.loading.set(false),
      });
  }
}