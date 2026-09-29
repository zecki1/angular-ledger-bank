import { Component, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/supabase';

@Component({
  selector: 'app-transacoes',
  templateUrl: './transacoes.html',
  styleUrl: './transacoes.css',
})
export class TransacoesPage {
  private readonly supabase = inject(SupabaseService);

  readonly titulo = 'Transacoes';
  protected readonly descricao = 'Busca, filtro por categoria/tipo, páginação e export CSV.';
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
