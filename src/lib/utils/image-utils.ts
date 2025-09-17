export enum ImageQuality {
	THUMBNAIL = 'thumbnail',
	MEDIUM = 'medium',
	HD = 'hd',
	QHD = 'qhd',
	ORIGINAL = 'original'
}

export function getImageUrl(
	imageDomain: string,
	galleryId: string,
	photoArrayId: string,
	photoUri: string,
	quality: ImageQuality
): string {
	return `${imageDomain}/${galleryId}/${photoArrayId}/${photoUri}/${quality}`;
}

export function getImageSrcSet(
	imageDomain: string,
	galleryId: string,
	photoArrayId: string,
	photoUri: string
): string {
	return [
		`${getImageUrl(imageDomain, galleryId, photoArrayId, photoUri, ImageQuality.MEDIUM)} 800w`,
		`${getImageUrl(imageDomain, galleryId, photoArrayId, photoUri, ImageQuality.HD)} 1920w`,
		`${getImageUrl(imageDomain, galleryId, photoArrayId, photoUri, ImageQuality.QHD)} 2560w`,
		`${getImageUrl(imageDomain, galleryId, photoArrayId, photoUri, ImageQuality.ORIGINAL)} 3840w`
	].join(', ');
}