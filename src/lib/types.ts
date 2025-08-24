export interface PhotoArray {
	photoGalleryId: string;
	photoArrayId: string;
	photoUris: Set<string>;
	timestamp: string;
	processed: boolean;
	location: string;
}

export interface PhotoArrayInput {
	photoUris: Set<string>;
	timestamp: string;
	processed: boolean;
	location: string;
}

export interface PhotoArrayUpdate {
	photoUris?: Set<string>;
	processed?: boolean;
	location?: string;
}
