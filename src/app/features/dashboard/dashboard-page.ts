import { ChangeDetectionStrategy, Component, ElementRef, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { RouterLink } from '@angular/router';
import { EChartsCoreOption } from '../../core/echarts';

import { AuthService } from '../../core/services/auth.service';
import { LedgerDataService } from '../../core/services/ledger-data.service';
import { ThemeService } from '../../core/services/theme.service';
import { readChartPalette } from '../../core/utils/chart-theme';
import { formatBRL, fromDayKey } from '../../core/utils/format';
import { BalanceCard } from '../../shared/components/balance-card/balance-card';
import { Chart } from '../../shared/components/chart/chart';
import { TransactionList } from '../../shared/components/transaction-list/transaction-list';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, BalanceCard, Chart, TransactionList],
  templateUrl: './dashboard-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly auth = inject(AuthService);
  private readonly data = inject(LedgerDataService);
  private readonly theme = inject(ThemeService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly userName = this.auth.userName;

  readonly accounts = toSignal(this.data.getAccounts(), { initialValue: [] });
  readonly recent = toSignal(
    this.data
      .getTransactions()
      .pipe(
        map((transactions) =>
          [...transactions]
            .sort((a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime())
            .slice(0, 5),
        ),
      ),
    { initialValue: [] },
  );
  readonly cashFlow = toSignal(this.data.getCashFlow(), { initialValue: [] });

  readonly total = computed(() => this.accounts().reduce((sum, account) => sum + account.balance, 0));
  readonly totalLabel = computed(() => formatBRL(this.total()));
  readonly brl = formatBRL;

  readonly chartOption = computed<EChartsCoreOption>(() => {
    const points = this.cashFlow();
    // Lê o signal do tema para o computed reavaliar quando clear/dark alterna.
    this.theme.theme();
    const palette = readChartPalette(this.host.nativeElement);
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: palette.surface,
        borderColor: palette.border,
        textStyle: { color: palette.cream },
        valueFormatter: (value: unknown) => formatBRL(Number(value)),
      },
      grid: { left: 8, right: 8, top: 20, bottom: 0, containLabel: true },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: points.map((point) => shortDate(point.date)),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: palette.mute, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: palette.border } },
        axisLabel: {
          color: palette.mute,
          fontSize: 11,
          formatter: (value: number) => compactBRL(value),
        },
      },
      series: [
        {
          name: 'Fluxo de caixa',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { color: palette.brand, width: 2 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: withAlpha(palette.brand, 0.35) },
                { offset: 1, color: withAlpha(palette.brand, 0.02) },
              ],
            },
          },
          data: points.map((point) => point.value),
        },
      ],
    };
  });
}

/** Converte `#8b5cf6` em `rgba(139, 92, 246, alpha)` — gradiente de área. */
function withAlpha(hex: string, alpha: number): string {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!match) {
    return hex;
  }
  const [, r, g, b] = match;
  return `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${alpha})`;
}

function shortDate(dayKey: string): string {
  const date = fromDayKey(dayKey);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

function compactBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}