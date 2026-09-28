import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { routes } from '../../app.routes';
import { IntegrationsLayout } from './integrations-layout';

describe('IntegrationsLayout', () => {
  let fixture: ComponentFixture<IntegrationsLayout>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IntegrationsLayout],
      providers: [provideRouter(routes)],
    }).compileComponents();

    fixture = TestBed.createComponent(IntegrationsLayout);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('tem o título e a descrição do hub', () => {
    expect(host.querySelector('h1')?.textContent).toContain('Integrações');
    expect(host.textContent).toContain('Central de integrações');
  });

  it('lista as cinco abas no formato de quadro do monday', () => {
    const abas = [...host.querySelectorAll('nav a')].map((a) => a.textContent?.trim());

    expect(abas).toEqual(['▦ Visão geral', '↗ Investimentos', '◈ Cotações', '⇄ Conexões', '⚙ Configurações']);
  });

  it('cada aba aponta para a rota da sua página', () => {
    const hrefs = [...host.querySelectorAll('nav a')].map((a) => a.getAttribute('href'));

    expect(hrefs).toEqual([
      '/integracoes/visao-geral',
      '/integracoes/investimentos',
      '/integracoes/cotacoes',
      '/integracoes/conexoes',
      '/integracoes/configuracoes',
    ]);
  });

  it('marca a navegação como lista dentro de um nav rotulado', () => {
    const nav = host.querySelector('nav[aria-label="Quadros de integração"]');
    expect(nav).not.toBeNull();
    expect(nav?.querySelectorAll('li').length).toBe(5);
  });

  it('dá um título descritivo a cada aba para leitor de tela', () => {
    for (const a of host.querySelectorAll('nav a')) {
      expect(a.getAttribute('title')).toBeTruthy();
    }
  });

  it('tem um outlet para o quadro ativo', () => {
    expect(host.querySelector('router-outlet')).not.toBeNull();
  });
});
