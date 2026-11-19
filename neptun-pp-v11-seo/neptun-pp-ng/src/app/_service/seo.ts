import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { siteUrl } from '../app.constants';

/**
 * Oldalankénti SEO-adatok: cím, leírás, kanonikus URL, Open Graph, robots.
 * SSR-rel ezek már a szerver által küldött HTML-ben benne vannak.
 */
@Injectable({
  providedIn: 'root',
})
export class Seo {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /** "Hallgatók" → <title>Hallgatók – Neptun++</title> és og:title */
  setTitle(title: string): void {
    const fullTitle = `${title} – Neptun++`;
    this.title.setTitle(fullTitle);
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
  }

  /**
   * @param description a találat alatti leírás
   * @param path az oldal kanonikus útvonala, pl. /student/ABC123 (query paraméterek nélkül!)
   * @param index felvehető-e a keresőbe
   */
  update({ description, path, index = true }: { description: string; path: string; index?: boolean }): void {
    const url = siteUrl + path;
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: index ? 'index, follow' : 'noindex' });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.setCanonical(url);
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = url;
  }
}
