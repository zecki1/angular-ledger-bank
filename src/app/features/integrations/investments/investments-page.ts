import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { Chart } from '../../../shared/components/chart/chart';
import { EChartsCoreOption } from '../../../core/echarts';
import { MarketRange } from '../../../core/models';
import { MarketService } from '../../../core/services/market.service';
import { PortfolioService } from '../../../core/services/portfolio.service';
import {
  formatBRL,
  formatChange,
  formatNumber,
  formatPercent,
  formatQuotePrice,
  formatWeight,
} from '../../../core/utils/format';

const RANGES: { id: MarketRange; label: string }[] = [
  { id: '1d', label: '1 dia' },
  { id: '5d', label: '5 dias' },
  { id: '1mo', label: '1 mês' },
  { id: '3mo', label: '3 meses' },
  { id: '1y', label: '1 ano' },
];

@Component({
  selector: 'app-investments-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Chart],
  templateUrl: './investments-page.html',
  styles: [':host { display: block; }'],
})
export class InvestmentsPage implements OnInit {
  protected readonly portfolio = inject(PortfolioService);
  private readonly market = inject(MarketService);

  protected readonly carregando = this.portfolio.carregando;
  protected readonly erro = this.market.erro;
  protected readonly algumAoVivo = this.market.algumAoVivo;

  protected readonly bRL = formatBRL;
  protected readonly pct = formatPercent;
  protected readonly variacao = formatChange;
  protected readonly preco = formatQuotePrice;
  protected readonly numero = formatNumber;
  protected readonly peso = formatWeight;

  protected readonly ranges = RANGES;
  protected readonly range = signal<MarketRange>('3mo');

  protected readonly maior = this.portfolio.maiorPosicao;
  protected readonly melhor = this.portfolio.melhorPosicao;
  protected readonly pior = this.portfolio.pioresPosicao;

  /** Filtro por classe de ativo — o board tem os dados de todos os lados. */
  protected readonly classeFiltro = signal<string>('');
  protected readonly classes = computed(() => [
    { id: '', label: 'Todas' },
    ...[...new Set(this.portfolio.posicoes().map((p) => p.classe))].map((c) => ({
      id: c,
      label: this.portfolio.classLabels[c] ?? c,
    })),
  ]);

  protected readonly filtradas = computed(() => {
    const filtro = this.classeFiltro();
    const lista = this.portfolio.posicoes();
    return filtro ? lista.filter((p) => p.classe === filtro) : lista;
  });

  protected readonly ordenadas = computed(() =>
    [...this.filtradas()].sort((a, b) => b.valor - a.valor),
  );

  ngOnInit(): void {
    void this.portfolio.carregar();
  }

  protected recarregar(): void {
    void this.portfolio.recarregar();
  }

  protected async trocarRange(range: MarketRange): Promise<void> {
    this.range.set(range);
    const ticker = this.portfolio.posicoes()[0]?.ticker;
    if (!ticker) return;
    await this.market.serie(ticker, range);
  }

  protected readonly serieOption = computed<EChartsCoreOption>(() => {
    const pontos = this.portfolio.series()[this.portfolio.posicoes()[0]?.ticker ?? ''] ?? [];
    return {
      grid: { left: 48, right: 16, top: 16, bottom: 24 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: pontos.map((p) => p.date.slice(5)),
        axisLine: { lineStyle: { color: 'var(--color-border)' } },
        axisLabel: { color: 'var(--color-mute)' },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: 'var(--color-mute)' },
        splitLine: { lineStyle: { color: 'var(--color-border)' } },
      },
      series: [
        {
          name: 'Preço',
          type: 'line',
          smooth: true,
          showSymbol: false,
          areaStyle: { opacity: 0.14 },
          data: pontos.map((p) => p.close),
        },
      ],
    };
  });
}
