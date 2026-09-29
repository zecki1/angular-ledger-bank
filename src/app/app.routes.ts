import { Routes } from '@angular/router';
import { LoginPage } from './pages/login/login';
import { DashboardPage } from './pages/dashboard/dashboard';
import { TransacoesPage } from './pages/transacoes/transacoes';
import { ContaPage } from './pages/conta/conta';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginPage, title: 'Login — Ledger' },
  { path: 'dashboard', component: DashboardPage, title: 'Dashboard — Ledger' },
  { path: 'transacoes', component: TransacoesPage, title: 'Transacoes — Ledger' },
  { path: 'conta', component: ContaPage, title: 'Detalhe de conta — Ledger' },
  { path: '**', redirectTo: 'login' },
];
