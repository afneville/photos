export interface PhotoArray {
	photoGalleryId: string;
	photoArrayId: string;
	photoUris: Set<string>;
	thumbnailUri: string;
	timestamp: string;
	processed: boolean;
	location: string;
}

export interface PhotoArrayInput {
	photoUris: Set<string>;
	thumbnailUri: string;
	timestamp: string;
	processed: boolean;
	location: string;
}

export interface PhotoArrayUpdate {
	photoUris?: Set<string>;
	thumbnailUri?: string;
	processed?: boolean;
	location?: string;
}

export interface IPhotoGalleryService {
	createItem(
		photoGalleryId: string,
		item: PhotoArrayInput,
		beforeRangeKey?: string,
		afterRangeKey?: string
	): Promise<PhotoArray>;
	getItem(photoGalleryId: string, photoArrayId: string): Promise<PhotoArray>;
	updateItem(
		photoGalleryId: string,
		photoArrayId: string,
		updates: PhotoArrayUpdate
	): Promise<PhotoArray>;
	deleteItem(photoGalleryId: string, photoArrayId: string): Promise<void>;
	getAllItems(photoGalleryId: string): Promise<PhotoArray[]>;
	moveItem(
		photoGalleryId: string,
		photoArrayId: string,
		beforeRangeKey?: string,
		afterRangeKey?: string
	): Promise<PhotoArray>;
}
