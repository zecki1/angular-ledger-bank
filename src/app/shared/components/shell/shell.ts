import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { LedgerDataService } from '../../../core/services/ledger-data.service';
import { ThemeService } from '../../../core/services/theme.service';
import { formatBRL } from '../../../core/utils/format';

@Component({
  selector: 'app-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './shell.html',
  styles: [
    `
      :host {
        display: block;
      }
      .nav-link {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        border-radius: var(--radius-lg);
        padding: 0.625rem 0.875rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-mute);
        transition: color 0.15s ease, background-color 0.15s ease;
      }
      .nav-link:hover {
        color: var(--color-cream);
        background-color: var(--color-surface-2);
      }
      .nav-link[aria-current='page'] {
        color: var(--color-brand-soft);
        background-color: color-mix(in srgb, var(--color-brand) 12%, transparent);
        font-weight: 600;
      }
      .sidebar {
        background: var(--color-surface);
        border-right: 1px solid var(--color-border);
      }
      .sidebar-header {
        border-bottom: 1px solid var(--color-border);
      }
      .sidebar-footer {
        border-top: 1px solid var(--color-border);
      }
      .user-info {
        background: var(--color-surface-2);
        border-radius: var(--radius-lg);
        padding: 0.75rem;
      }
      .theme-btn,
      .logout-btn,
      .menu-btn {
        border-radius: var(--radius-md);
        transition: all 0.15s ease;
      }
      .menu-btn {
        border: 1px solid var(--color-border);
        color: var(--color-mute);
        padding: 0.5rem 0.75rem;
        line-height: 1;
        font-size: 1rem;
      }
      .menu-btn:hover {
        border-color: var(--color-brand-soft);
        color: var(--color-brand-soft);
      }
      .theme-btn:hover {
        border-color: var(--color-brand-soft);
        color: var(--color-brand-soft);
      }
      .logout-btn:hover {
        border-color: var(--color-down);
        color: var(--color-down);
      }

      /*
       * Marca em duas bolinhas (vermelho + amarelo) para repetir a identidade
       * do Bradesco sem depender de um asset de imagem. O box-shadow usa a
       * cor da superfície para separar as duas, funcionando nos dois temas.
       */
      .marca {
        display: inline-flex;
        align-items: center;
      }
      .marca-bola {
        display: inline-block;
        width: 0.75rem;
        height: 0.75rem;
        border-radius: 9999px;
      }
      .marca-bola + .marca-bola {
        margin-left: -0.25rem;
        box-shadow: 0 0 0 2px var(--color-surface);
      }

      /*
       * Gaveta do mobile. Ajuste fino na curva para parecer "líquido": sai
       * rápido e termina devagar. prefers-reduced-motion zera a duração
       * pelo bloco global em styles.css.
       */
      .menu-fundo,
      .menu-gaveta {
        transition:
          opacity 0.28s ease,
          transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .menu-fundo {
        opacity: 0;
        pointer-events: none;
      }
      .menu-fundo.aberto {
        opacity: 1;
        pointer-events: auto;
      }
      .menu-gaveta {
        transform: translateX(100%);
      }
      .menu-gaveta.aberto {
        transform: translateX(0);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly data = inject(LedgerDataService);
  private readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly userName = this.auth.userName;
  readonly userEmail = this.auth.userEmail;

  readonly total = toSignal(this.data.getTotalAccounts(), { initialValue: 0 });
  readonly totalLabel = computed(() => formatBRL(this.total()));

  readonly isDark = computed(() => this.theme.theme() === 'dark');
  readonly themeLabel = computed(() => (this.isDark() ? 'Ativar tema claro' : 'Ativar tema escuro'));

  /** Gaveta do mobile aberta. Sinal, porque só o menu reage ao valor. */
  readonly menuAberto = signal(false);
  readonly menuLabel = computed(() => (this.menuAberto() ? 'Fechar menu' : 'Abrir menu'));

  readonly nav = [
    { label: 'Dashboard', href: '/dashboard', icon: '▦' },
    { label: 'Transações', href: '/transacoes', icon: '☰' },
    { label: 'Investimentos', href: '/investimentos', icon: '↗' },
    { label: 'Cotações', href: '/cotacoes', icon: '◈' },
    { label: 'Configurações', href: '/configuracoes', icon: '⚙' },
  ] as const;

  /**
   * A barra de rolagem do desktop é o conteúdo, não o documento (ver o
   * `lg:overflow-y-auto` no template). Por isso o `scrollPositionRestoration:
   * 'top'` do router — que rola o `document` — não dá conta: sem isto aqui,
   * abrir `Transações` partindo de uma página longa deixaria o usuário no
   * meio da nova tela.
   *
   * Só rola quando o **caminho** muda: trocar um filtro via query string não
   * pode jogar a lista de volta pro topo.
   */
  private readonly conteudo = viewChild<ElementRef<HTMLElement>>('conteudo');
  private caminhoAnterior = '';

  private readonly navegacao = this.router.events
    .pipe(filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd))
    .subscribe((evento) => {
      this.fecharMenu();
      this.rolarAoTopo(evento.urlAfterRedirects);
    });

  private rolarAoTopo(url: string): void {
    const caminho = url.split('?')[0];
    if (caminho === this.caminhoAnterior) {
      return;
    }
    this.caminhoAnterior = caminho;

    const elemento = this.conteudo()?.nativeElement;
    if (elemento && elemento.scrollTop > 0) {
      elemento.scrollTop = 0;
    }
  }

  toggleMenu(): void {
    this.menuAberto.update((aberto) => !aberto);
    this.travarCorpo(this.menuAberto());
  }

  fecharMenu(): void {
    if (!this.menuAberto()) {
      return;
    }
    this.menuAberto.set(false);
    this.travarCorpo(false);
  }

  /**
   * `Escape` fecha o menu de qualquer lugar. Fica aqui como listener do
   * documento em vez de binding no elemento da gaveta: é uma preocupação
   * global do menu, e no elemento o lint exigiria `tabindex` sem motivo.
   */
  @HostListener('document:keydown.escape')
  fecharMenuPorEscape(): void {
    this.fecharMenu();
  }

  /** Com o menu aberto o fundo não pode rolar junto. */
  private travarCorpo(travado: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.body.classList.toggle('overflow-hidden', travado);
  }

  ngOnDestroy(): void {
    this.navegacao.unsubscribe();
    this.travarCorpo(false);
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
