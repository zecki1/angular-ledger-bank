import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    <nav class="flex items-center justify-center gap-2" aria-label="Paginação">
      <button
        type="button"
        class="btn-secondary h-10 px-3"
        (click)="go(page() - 1)"
        [disabled]="page() <= 1"
        aria-label="Página anterior"
      >
        ←
      </button>

      @for (p of window(); track p) {
        <button
          type="button"
          class="h-10 min-w-10 rounded-lg transition-colors"
          [class.btn-primary]="p === page()"
          [class.btn-secondary]="p !== page()"
          [attr.aria-current]="p === page() ? 'page' : null"
          (click)="go(p)"
        >
          {{ p }}
        </button>
      }

      <button
        type="button"
        class="btn-secondary h-10 px-3"
        (click)="go(page() + 1)"
        [disabled]="page() >= totalPages()"
        aria-label="Próxima página"
      >
        →
      </button>
    </nav>
  `,
  styles: [':host { display: block; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();

  readonly pageChange = output<number>();

  readonly window = computed<number[]>(() => {
    const current = this.page();
    const total = Math.max(1, this.totalPages());
    if (total <= 5) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    let start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  go(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.page()) {
      return;
    }
    this.pageChange.emit(page);
  }
}