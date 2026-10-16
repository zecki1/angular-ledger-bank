import { Injectable, computed, signal } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AnaliseGastos, analiseVazia } from '../models/analise-gastos.model';

/** Envelope padrão da API Java (`{ success, mensagem, data, count, timestamp }`). */
interface RespostaApi<T> {
  success: boolean;
  mensagem: string;
  data: T | null;
  count?: number;
  timestamp?: string;
}

/**
 * Cliente da análise de gastos, falando **só** com a API Java.
 *
 * Segue o mesmo padrão do {@link MarketService}: `fetch` direto com envelope
 * `{ success, mensagem, data }`. A chamada é um GET único
 * (`/api/transacoes/analise`) — RxJS/tradução de corpo não paga o custo aqui.
 *
 * **Fallback:** qualquer falha (rede, `success:false`, corpo malformado)
 * devolve a estrutura vazia, para a tela sempre renderizar (com os abas vazias
 * e os contadores zerados) em vez de quebrar ou mostrar erro técnico.
 * O motivo da falha fica em {@link erro} para a UI decidir se avisa.
 */
@Injectable({ providedIn: 'root' })
export class AnaliseGastosService {
  private readonly _analise = signal<AnaliseGastos>(analiseVazia());
  private readonly _carregando = signal(false);
  private readonly _erro = signal('');
  private readonly _origem = signal<'api' | 'fallback'>('fallback');

  readonly analise = this._analise.asReadonly();
  readonly carregando = this._carregando.asReadonly();
  readonly erro = this._erro.asReadonly();
  /** `api` quando os dados vieram do backend; `fallback` quando caiu no vazio. */
  readonly origem = this._origem.asReadonly();

  readonly temDados = computed(() => this._analise().transacoesAnalisadas > 0);

  /**
   * Carrega a análise do mês. Pode ser chamada de novo (pull-to-refresh manual)
   * — cada chamada substitui o estado anterior.
   */
  async carregar(): Promise<AnaliseGastos> {
    this._carregando.set(true);
    this._erro.set('');

    try {
      const url = `${this.base()}/api/transacoes/analise`;
      const resposta = await fetch(url, { headers: { Accept: 'application/json' } });

      if (!resposta.ok) {
        throw new Error(`Análise indisponível (${resposta.status})`);
      }

      const corpo = (await resposta.json()) as RespostaApi<AnaliseGastos>;
      if (!corpo.success || !corpo.data) {
        throw new Error(corpo.mensagem || 'A API não retornou a análise');
      }

      this._analise.set(normalizar(corpo.data));
      this._origem.set('api');
    } catch (falha) {
      this._erro.set(falha instanceof Error ? falha.message : 'Falha ao carregar a análise');
      this._analise.set(analiseVazia());
      this._origem.set('fallback');
    } finally {
      this._carregando.set(false);
    }

    return this._analise();
  }

  private base(): string {
    return environment.apiBaseUrl.replace(/\/$/, '');
  }
}

/**
 * Garante que as listas existam mesmo se o backend mandar `null` em algum
 * campo (defesa barata: o template usa `@for` e não pode ver `null`).
 */
export function normalizar(dados: AnaliseGastos): AnaliseGastos {
  return {
    ...dados,
    comparativo: dados.comparativo ?? [],
    recorrentes: dados.recorrentes ?? [],
    sugestoes: dados.sugestoes ?? [],
    entradasMesAtual: dados.entradasMesAtual ?? 0,
    saidasMesAtual: dados.saidasMesAtual ?? 0,
    saldoMesAtual: dados.saldoMesAtual ?? 0,
    transacoesAnalisadas: dados.transacoesAnalisadas ?? 0,
    transacoesAvaliadas: dados.transacoesAvaliadas ?? 0,
  };
}
