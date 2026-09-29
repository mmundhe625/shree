import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLinkWithHref, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLinkWithHref, RouterLinkActive],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('ShreePrasad');
  protected readonly darkMode = signal(false);
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined') {
      this.darkMode.set(localStorage.getItem('theme') === 'dark');
    }
  }

  protected toggleTheme(): void {
    this.darkMode.update((enabled) => !enabled);
    if (isPlatformBrowser(this.platformId) && typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', this.darkMode() ? 'dark' : 'light');
    }
  }
}
