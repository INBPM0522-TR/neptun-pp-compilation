import { inject, Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { Seo } from './seo';

/** A route-ok title-jéből: "Hallgatók" → "Hallgatók – Neptun++" (és og:title) */
@Injectable({
  providedIn: 'root',
})
export class PageTitleStrategy extends TitleStrategy {
  private readonly seo = inject(Seo);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    if (title) {
      this.seo.setTitle(title);
    }
  }
}
