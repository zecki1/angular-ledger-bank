import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { Shell } from './shared/components/shell/shell';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Login — Ledger',
    loadComponent: () => import('./features/login/login-page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard — Ledger',
        loadComponent: () => import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'transacoes',
        title: 'Transações — Ledger',
        loadComponent: () => import('./features/transactions/transactions-page').then((m) => m.TransactionsPage),
      },
      {
        path: 'investimentos',
        title: 'Investimentos — Ledger',
        loadComponent: () =>
          import('./features/integrations/investments/investments-page').then(
            (m) => m.InvestmentsPage,
          ),
      },
      {
        path: 'cotacoes',
        title: 'Cotações — Ledger',
        loadComponent: () =>
          import('./features/integrations/quotes/quotes-page').then((m) => m.QuotesPage),
      },
      {
        path: 'configuracoes',
        title: 'Configurações — Ledger',
        loadComponent: () =>
          import('./features/integrations/settings/settings-page').then((m) => m.SettingsPage),
      },
      {
        path: 'conta/:id',
        title: 'Detalhe de conta — Ledger',
        loadComponent: () =>
          import('./features/account/account-detail-page').then((m) => m.AccountDetailPage),
      },
      {
        path: 'integracoes',
        title: 'Integrações — Ledger',
        loadComponent: () =>
          import('./features/integrations/integrations-layout').then((m) => m.IntegrationsLayout),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'visao-geral' },
          {
            path: 'visao-geral',
            title: 'Visão geral — Ledger',
            loadComponent: () =>
              import('./features/integrations/overview/overview-page').then((m) => m.OverviewPage),
          },
          {
            path: 'investimentos',
            title: 'Investimentos — Ledger',
            loadComponent: () =>
              import('./features/integrations/investments/investments-page').then(
                (m) => m.InvestmentsPage,
              ),
          },
          {
            path: 'cotacoes',
            title: 'Cotações — Ledger',
            loadComponent: () =>
              import('./features/integrations/quotes/quotes-page').then((m) => m.QuotesPage),
          },
          {
            path: 'conexoes',
            title: 'Conexões — Ledger',
            loadComponent: () =>
              import('./features/integrations/connections/connections-page').then(
                (m) => m.ConnectionsPage,
              ),
          },
          {
            path: 'configuracoes',
            title: 'Configurações — Ledger',
            loadComponent: () =>
              import('./features/integrations/settings/settings-page').then((m) => m.SettingsPage),
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
