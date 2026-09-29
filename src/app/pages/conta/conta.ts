import { Component, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/supabase';

@Component({
  selector: 'app-conta',
  templateUrl: './conta.html',
  styleUrl: './conta.css',
})
export class ContaPage {
  private readonly supabase = inject(SupabaseService);

  readonly titulo = 'Detalhe de conta';
  protected readonly descricao = 'Extrato em timeline da conta.';
  protected readonly slugProjeto = 'ledger';

  protected readonly conectando = signal(false);
  protected readonly conexaoOk = signal<boolean | null>(null);

  /** Health-check contra o projeto Supabase compartilhado. */
  protected async verificar(): Promise<void> {
    this.conectando.set(true);
    this.conexaoOk.set(await this.supabase.verificarConexão());
    this.conectando.set(false);
  }
}
