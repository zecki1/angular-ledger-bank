import { Routes } from '@angular/router';
import login from './pages/login';
import dashboard from './pages/dashboard';
import transacoes from './pages/transacoes';
import conta from './pages/conta';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: login, title: 'Login — Ledger' },
  { path: 'dashboard', component: dashboard, title: 'Dashboard — Ledger' },
  { path: 'transacoes', component: transacoes, title: 'Transacoes — Ledger' },
  { path: 'conta', component: conta, title: 'Detalhe de conta — Ledger' },
  { path: '**', redirectTo: 'login' },
];
