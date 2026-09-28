import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { DEMO_TICKERS, MarketService, normalizarTicker, tickerValido } from '../../../core/services/market.service';
import { environment } from '../../../../environments/environment';
import {
  formatChange,
  formatCompactBRL,
  formatDeltaBRL,
  formatQuotePrice,
  formatVolume,
} from '../../../core/utils/format';

@Component({
  selector: 'app-quotes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quotes-page.html',
  styles: [':host { display: block; }'],
})
export class QuotesPage implements OnInit {
  private readonly market = inject(MarketService);

  protected readonly quotes = this.market.quotes;
  protected readonly carregando = this.market.carregando;
  protected readonly erro = this.market.erro;
  protected readonly algumAoVivo = this.market.algumAoVivo;
  protected readonly ultimaAtualizacao = this.market.ultimaAtualizacao;

  protected readonly preco = formatQuotePrice;
  protected readonly variacao = formatChange;
  protected readonly compacta = formatCompactBRL;
  protected readonly delta = formatDeltaBRL;
  protected readonly volume = formatVolume;

  protected readonly temToken = environment.brapiToken.length > 0;
  protected readonly sugestoes = DEMO_TICKERS;

  protected readonly busca = signal('');
  protected readonly mensagemBusca = signal('');

  /** Fila da tela: a ordem de chegada, não a ordem alfabética. */
  protected readonly lista = computed(() => Object.values(this.quotes()));

  protected readonly emAlta = computed(() =>
    [...this.lista()].sort((a, b) => b.quote.variacaoPercent - a.quote.variacaoPercent).slice(0, 3),
  );

  protected readonly emQueda = computed(() =>
    [...this.lista()].sort((a, b) => a.quote.variacaoPercent - b.quote.variacaoPercent).slice(0, 3),
  );

  ngOnInit(): void {
    // Sem token a BrAPI recusa lote, então a fila serial do serviço já
    // espaça as chamadas. Carregar tudo leva alguns segundos de propósito.
    for (const ticker of DEMO_TICKERS) {
      void this.market.cotacao(ticker);
    }
  }

  protected async buscar(evento: Event, input?: HTMLInputElement): Promise<void> {
    // Submit nativo: sem FormsModule, o form recarregaria a página.
    evento.preventDefault();
    const entrada = this.busca().trim();
    this.mensagemBusca.set('');

    if (!entrada) {
      this.mensagemBusca.set('Digite um código, por exemplo PETR4.');
      return;
    }
    if (!tickerValido(entrada)) {
      this.mensagemBusca.set('Código inválido. Use de 2 a 12 letras ou dígitos, sem ponto.');
      return;
    }

    const simbolo = normalizarTicker(entrada);
    this.limparCampo(input);
    await this.market.cotacao(simbolo, true);
  }

  protected async sugerir(ticker: string, input: HTMLInputElement): Promise<void> {
    this.busca.set(ticker);
    await this.atualizar(ticker);
    this.limparCampo(input);
  }

  /**
   * `busca.set('')` sozinho não limpa o `<input>`: o binding `[value]` só
   * escreve no DOM quando o valor anterior que o Angular conhece muda, e
   * eventos de `input` do usuário não passam pela detecção. Por isso o campo
   * é zerado pela própria referência.
   */
  private limparCampo(input?: HTMLInputElement): void {
    this.busca.set('');
    if (input) input.value = '';
  }

  protected async atualizar(ticker: string): Promise<void> {
    await this.market.cotacao(ticker, true);
  }

  protected limparTudo(): void {
    this.market.limparCache();
  }
}
