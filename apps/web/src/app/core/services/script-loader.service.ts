import { Injectable, Renderer2, RendererFactory2, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Script Loader Service
 *
 * Provides utilities for dynamically loading external scripts on demand,
 * reducing initial bundle size by deferring non-critical JavaScript.
 *
 * Features:
 * - Deferred script loading (loads scripts only when needed)
 * - Duplicate prevention (tracks loaded scripts to avoid re-loading)
 * - Promise-based API for easy async/await usage
 * - Platform-aware (only loads scripts in browser environment)
 * - Support for defer and async attributes
 *
 * Usage:
 * ```typescript
 * constructor(private scriptLoader: ScriptLoaderService) {}
 *
 * async loadAnalytics() {
 *   await this.scriptLoader.loadScript('https://example.com/analytics.js', true);
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class ScriptLoaderService {
  private renderer: Renderer2;
  private loadedScripts = new Set<string>();
  private loadingScripts = new Map<string, Promise<void>>();
  private platformId = inject(PLATFORM_ID);

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  /**
   * Loads an external script dynamically
   *
   * @param src - The URL of the script to load
   * @param defer - Whether to use the defer attribute (default: true)
   * @param async - Whether to use the async attribute (default: false)
   * @returns Promise that resolves when script is loaded
   */
  loadScript(src: string, defer = true, async = false): Promise<void> {
    // Only load scripts in browser environment
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }

    // Return existing promise if script is currently loading
    if (this.loadingScripts.has(src)) {
      return this.loadingScripts.get(src)!;
    }

    // Return resolved promise if script is already loaded
    if (this.loadedScripts.has(src)) {
      return Promise.resolve();
    }

    const promise = new Promise<void>((resolve, reject) => {
      const script = this.renderer.createElement('script');
      script.src = src;
      script.type = 'text/javascript';

      if (defer) {
        script.defer = true;
      }

      if (async) {
        script.async = true;
      }

      script.onload = () => {
        this.loadedScripts.add(src);
        this.loadingScripts.delete(src);
        resolve();
      };

      script.onerror = (error: Event) => {
        this.loadingScripts.delete(src);
        reject(new Error(`Failed to load script: ${src}`));
      };

      this.renderer.appendChild(document.head, script);
    });

    this.loadingScripts.set(src, promise);
    return promise;
  }

  /**
   * Loads multiple scripts in parallel
   *
   * @param scripts - Array of script URLs to load
   * @param defer - Whether to use the defer attribute (default: true)
   * @returns Promise that resolves when all scripts are loaded
   */
  loadScripts(scripts: string[], defer = true): Promise<void[]> {
    return Promise.all(scripts.map((src) => this.loadScript(src, defer)));
  }

  /**
   * Checks if a script is already loaded
   *
   * @param src - The URL of the script to check
   * @returns True if script is loaded
   */
  isScriptLoaded(src: string): boolean {
    return this.loadedScripts.has(src);
  }

  /**
   * Removes a loaded script from the DOM and tracking
   *
   * @param src - The URL of the script to remove
   */
  removeScript(src: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const scripts = document.querySelectorAll(`script[src="${src}"]`);
    scripts.forEach((script) => {
      this.renderer.removeChild(document.head, script);
    });

    this.loadedScripts.delete(src);
    this.loadingScripts.delete(src);
  }
}
