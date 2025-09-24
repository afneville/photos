import { SvelteSet } from 'svelte/reactivity';

export class ImagePreloader {
	private prefetchedImages = new SvelteSet<string>();

	prefetchImage(srcset: string, sizes?: string) {
		if (!this.prefetchedImages.has(srcset)) {
			const img = new Image();
			img.srcset = srcset;
			if (sizes) {
				img.sizes = sizes;
			}
			this.prefetchedImages.add(srcset);
		}
	}

	async ensureImageReady(srcset: string, sizes?: string): Promise<void> {
		return new Promise((resolve) => {
			const img = new Image();
			img.onload = async () => {
				try {
					await img.decode();
					resolve();
				} catch {
					resolve();
				}
			};
			img.onerror = () => resolve();
			img.srcset = srcset;
			if (sizes) {
				img.sizes = sizes;
			}
		});
	}

	get cache() {
		return this.prefetchedImages;
	}
}
