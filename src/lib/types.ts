export interface PhotoArray {
	photoGalleryId: string;
	photoArrayId: string;
	photoUris: string[];
	timestamp: string;
	processedCount: number;
	location: string;
}

export interface ThumbnailCoordinates {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface PhotoArrayInput {
	thumbnailCoordinates: ThumbnailCoordinates[];
	timestamp: string;
	location: string;
}

export interface PhotoArrayCreationResponse {
	photoArray: PhotoArray;
	presignedUrls: string[];
}

export interface PhotoArrayUpdate {
	photoUris?: string[];
	processedCount?: number;
	location?: string;
}

export interface IPhotoGalleryService {
	createItem(
		photoGalleryId: string,
		item: PhotoArrayInput,
		beforeRangeKey?: string,
		afterRangeKey?: string
	): Promise<PhotoArrayCreationResponse>;
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
