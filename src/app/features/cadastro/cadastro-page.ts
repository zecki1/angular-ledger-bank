import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService, MfaEnrollment, biometriaSuportada } from '../../core/services/auth.service';
import {
  IDADE_MINIMA,
  avaliarSenha,
  dataBrParaIso,
  idadeEmAnos,
  mascararCpf,
  mascararData,
  somenteDigitos,
  validarCpf,
} from '../../core/utils/validacao';

type Passo = 'dados' | 'mfa' | 'biometria';

/**
 * Cadastro em três passos, espelhando o que um banco real pede:
 * 1. Dados pessoais (nome, nascimento, CPF) + e-mail e senha forte.
 * 2. Verificação em duas etapas (TOTP).
 * 3. Biometria (WebAuthn), opcional conforme o dispositivo.
 */
@Component({
  selector: 'app-cadastro-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './cadastro-page.html',
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
export class CadastroPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly passo = signal<Passo>('dados');
  readonly loading = signal(false);
  readonly erro = signal('');
  readonly idadeMinima = IDADE_MINIMA;

  readonly passos: readonly { id: Passo; rotulo: string }[] = [
    { id: 'dados', rotulo: 'Dados' },
    { id: 'mfa', rotulo: '2FA' },
    { id: 'biometria', rotulo: 'Biometria' },
  ];
  readonly indicePasso = computed(() => this.passos.findIndex((p) => p.id === this.passo()));

  // Passo 1 — dados
  readonly cpf = signal('');
  readonly nascimento = signal('');
  readonly senha = signal('');
  readonly confirmar = signal('');
  readonly aceite = signal(false);

  // Passo 2 — 2FA
  readonly mfa = signal<MfaEnrollment | null>(null);
  readonly codigo = signal('');

  // Passo 3 — biometria
  readonly biometriaDisponivel = biometriaSuportada();
  readonly erroBiometria = signal('');

  readonly forca = computed(() => avaliarSenha(this.senha()));
  readonly cpfValido = computed(() => validarCpf(this.cpf()));
  readonly nascimentoValido = computed(
    () => idadeEmAnos(dataBrParaIso(this.nascimento())) >= IDADE_MINIMA,
  );
  readonly senhasIguais = computed(
    () => this.senha().length > 0 && this.senha() === this.confirmar(),
  );
  readonly codigoValido = computed(() => /^\d{6}$/.test(this.codigo()));

  aoDigitarCpf(valor: string): void {
    this.cpf.set(mascararCpf(valor));
  }

  aoDigitarNascimento(valor: string): void {
    this.nascimento.set(mascararData(valor));
  }

  cadastrar(form: NgForm): void {
    if (form.invalid || !this.cpfValido() || !this.nascimentoValido() || !this.forca().valida || !this.senhasIguais() || !this.aceite()) {
      return;
    }
    this.loading.set(true);
    this.erro.set('');

    this.auth
      .signup({
        nome: form.value['nome'],
        email: form.value['email'],
        cpf: somenteDigitos(this.cpf()),
        nascimento: dataBrParaIso(this.nascimento()),
        senha: this.senha(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          this.loading.set(false);
          this.passo.set('mfa');
          this.carregarMfa(user.email);
        },
        error: () => {
          this.loading.set(false);
          this.erro.set('Não foi possível criar a conta. Tente novamente.');
        },
      });
  }

  private carregarMfa(email: string): void {
    this.auth
      .inscreverMfa(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (enrollment) => this.mfa.set(enrollment),
        error: () => {
          this.erro.set('Não foi possível iniciar o 2FA.');
        },
      });
  }

  confirmarMfa(): void {
    if (!this.codigoValido()) {
      return;
    }
    this.loading.set(true);
    this.erro.set('');
    this.auth
      .confirmarMfa(this.codigo())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.passo.set('biometria');
        },
        error: () => {
          this.loading.set(false);
          this.erro.set('Código inválido. Verifique o app autenticador.');
        },
      });
  }

  ativarBiometria(): void {
    this.erroBiometria.set('');
    if (!this.biometriaDisponivel || typeof navigator === 'undefined' || !navigator.credentials) {
      this.erroBiometria.set('Este dispositivo não oferece biometria. Você pode continuar sem ela.');
      return;
    }
    const desafio = new Uint8Array(32);
    const idUsuario = new Uint8Array(16);
    crypto.getRandomValues(desafio);
    crypto.getRandomValues(idUsuario);

    navigator.credentials
      .create({
        publicKey: {
          challenge: desafio,
          rp: { name: 'Ledger Bank' },
          user: {
            id: idUsuario,
            name: this.auth.userEmail(),
            displayName: this.auth.userName(),
          },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: { userVerification: 'preferred' },
          timeout: 60_000,
        },
      })
      .then(() => {
        this.auth.definirBiometria(true);
        this.concluir();
      })
      .catch(() => {
        this.erroBiometria.set(
          'Não foi possível ativar a biometria agora. Você pode continuar sem ela.',
        );
      });
  }

  pularBiometria(): void {
    this.concluir();
  }

  private concluir(): void {
    this.router.navigate(['/dashboard']);
  }

  /** Gera a URL do QR code a partir do provisioning URI do autenticador. */
  qrCode(uri: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(uri)}`;
  }
}
