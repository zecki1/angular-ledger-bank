import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Chart } from '../../../shared/components/chart/chart';
import { EChartsCoreOption } from '../../../core/echarts';
import { IntegrationsService } from '../../../core/services/integrations.service';
import { MarketService } from '../../../core/services/market.service';
import { PortfolioService } from '../../../core/services/portfolio.service';
import {
  formatBRL,
  formatChange,
  formatCompactBRL,
  formatPercent,
  formatQuotePrice,
  formatWeight,
} from '../../../core/utils/format';

interface Quadro {
  id: string;
  titulo: string;
  descricao: string;
  icon: string;
  rota: string;
  destaque: string;
}

@Component({
  selector: 'app-overview-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Chart],
  templateUrl: './overview-page.html',
  styles: [':host { display: block; }'],
})
export class OverviewPage implements OnInit {
  protected readonly portfolio = inject(PortfolioService);
  private readonly market = inject(MarketService);
  readonly integrations = inject(IntegrationsService);

  protected readonly carregando = this.portfolio.carregando;
  protected readonly erro = this.market.erro;
  protected readonly algumAoVivo = this.market.algumAoVivo;

  protected readonly valorTotal = this.portfolio.valorTotal;
  protected readonly resultado = this.portfolio.resultadoAbsoluto;
  protected readonly resultadoPercent = this.portfolio.resultadoPercent;
  protected readonly variacaoDiaPercent = this.portfolio.variacaoDiaPercent;
  protected readonly alocacao = this.portfolio.alocacao;
  protected readonly posicoes = this.portfolio.posicoes;
  protected readonly conectadasCount = this.integrations.conectadasCount;
  protected readonly totalEmPosicoes = this.portfolio.totalEmPosicoes;

  protected readonly topPosicoes = computed(() =>
    [...this.posicoes()].sort((a, b) => b.valor - a.valor).slice(0, 4),
  );

  protected readonly bRL = formatBRL;
  protected readonly compacta = formatCompactBRL;
  protected readonly pct = formatPercent;
  protected readonly variacao = formatChange;
  protected readonly preco = formatQuotePrice;
  protected readonly peso = formatWeight;

  protected readonly quadros: Quadro[] = [
    {
      id: 'investimentos',
      titulo: 'Investimentos',
      descricao: 'Carteira, alocação por classe e resultado acumulado.',
      icon: '↗',
      rota: '/integracoes/investimentos',
      destaque: 'posições',
    },
    {
      id: 'cotacoes',
      titulo: 'Cotações',
      descricao: 'Preço, variação do dia e série histórica dos ativos.',
      icon: '◈',
      rota: '/integracoes/cotacoes',
      destaque: 'ativo por vez',
    },
    {
      id: 'conexoes',
      titulo: 'Conexões',
      descricao: 'Bancos, corretoras e APIs ligadas a este app.',
      icon: '⇄',
      rota: '/integracoes/conexoes',
      destaque: 'conectadas',
    },
    {
      id: 'configuracoes',
      titulo: 'Configurações',
      descricao: 'Tema, formato, dados locais e atalhos de teclado.',
      icon: '⚙',
      rota: '/integracoes/configuracoes',
      destaque: 'preferências',
    },
  ];

  ngOnInit(): void {
    void this.portfolio.carregar();
  }

  protected readonly alocacaoOption = computed<EChartsCoreOption>(() => ({
    tooltip: {
      trigger: 'item',
      formatter: (p: unknown) => {
        const item = p as { name: string; value: number; percent: number };
        return `${item.name}<br/>${formatBRL(item.value)} (${item.percent}%)`;
      },
    },
    series: [
      {
        type: 'pie',
        radius: ['58%', '82%'],
        center: ['50%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: 'transparent', borderWidth: 2 },
        label: { show: false },
        data: this.alocacao().map((fatia) => ({
          name: this.portfolio.classLabels[fatia.classe] ?? fatia.classe,
          value: Number(fatia.valor.toFixed(2)),
          itemStyle: { color: this.portfolio.classColors[fatia.classe] },
        })),
      },
    ],
  }));

  protected readonly performanceOption = computed<EChartsCoreOption>(() => {
    const pontos = this.portfolio.performance();
    return {
      grid: { left: 44, right: 16, top: 16, bottom: 24 },
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
        axisLabel: { color: 'var(--color-mute)' },
        splitLine: { lineStyle: { color: 'var(--color-border)' } },
      },
      series: [
        {
          name: 'Carteira',
          type: 'line',
          smooth: true,
          showSymbol: false,
          areaStyle: { opacity: 0.12 },
          data: pontos.map((p) => p.close),
        },
      ],
    };
  });
}
