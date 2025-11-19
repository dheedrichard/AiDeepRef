import { Directive, ElementRef, Renderer2, OnInit, Input, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Image Optimization Directive
 *
 * Automatically optimizes images for performance by:
 * - Adding lazy loading attribute
 * - Adding async decoding attribute
 * - Supporting responsive images with srcset
 * - Adding loading placeholder
 *
 * Usage:
 * ```html
 * <img appOptimizeImage src="image.jpg" alt="Description">
 * <img appOptimizeImage src="image.jpg" [srcset]="'image-2x.jpg 2x'" alt="Description">
 * ```
 */
@Directive({
  selector: 'img[appOptimizeImage]',
  standalone: true,
})
export class OptimizeImageDirective implements OnInit {
  /**
   * Optional srcset for responsive images
   */
  @Input() srcset?: string;

  /**
   * Loading strategy: 'lazy' (default) or 'eager'
   */
  @Input() loading: 'lazy' | 'eager' = 'lazy';

  /**
   * Decoding strategy: 'async' (default), 'sync', or 'auto'
   */
  @Input() decoding: 'async' | 'sync' | 'auto' = 'async';

  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const imgElement = this.el.nativeElement as HTMLImageElement;

    // Set loading attribute for lazy loading
    this.renderer.setAttribute(imgElement, 'loading', this.loading);

    // Set decoding attribute for async decoding
    this.renderer.setAttribute(imgElement, 'decoding', this.decoding);

    // Add srcset if provided
    if (this.srcset) {
      this.renderer.setAttribute(imgElement, 'srcset', this.srcset);
    }

    // Add width and height if not present (to prevent layout shift)
    if (!imgElement.hasAttribute('width') && !imgElement.hasAttribute('height')) {
      // If image is already loaded, get natural dimensions
      if (imgElement.complete && imgElement.naturalWidth) {
        this.renderer.setAttribute(imgElement, 'width', imgElement.naturalWidth.toString());
        this.renderer.setAttribute(imgElement, 'height', imgElement.naturalHeight.toString());
      } else {
        // Add load event listener to set dimensions
        imgElement.addEventListener('load', () => {
          if (!imgElement.hasAttribute('width')) {
            this.renderer.setAttribute(imgElement, 'width', imgElement.naturalWidth.toString());
          }
          if (!imgElement.hasAttribute('height')) {
            this.renderer.setAttribute(imgElement, 'height', imgElement.naturalHeight.toString());
          }
        });
      }
    }

    // Add error handling
    imgElement.addEventListener('error', () => {
      // Set a placeholder or fallback image
      console.warn(`Failed to load image: ${imgElement.src}`);
      // Optionally set a fallback image
      // this.renderer.setAttribute(imgElement, 'src', '/assets/images/placeholder.png');
    });
  }
}
