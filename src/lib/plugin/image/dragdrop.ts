import { Plugin } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';
import { insertUploadSkeleton } from '$lib/plugin/upload/skeleton';

export type UploadFn = (image: File) => Promise<string>;
export const fallbackUpload = async (image: File) => URL.createObjectURL(image);

const OBJECT_URL_PREFIX = 'blob:';
const OBJECT_URL_REVOKE_TIMEOUT_MS = 30_000;

const isObjectUrl = (src: string) => src.startsWith(OBJECT_URL_PREFIX);

const revokeObjectUrl = (src: string) => {
	try {
		URL.revokeObjectURL(src);
	} catch {
		// no-op
	}
};

export const releaseObjectUrlOnImageSettled = (view: EditorView, src: string) => {
	if (!isObjectUrl(src)) return;

	let released = false;
	const cleanups: Array<() => void> = [];

	const release = () => {
		if (released) return;
		released = true;
		cleanups.forEach((cleanup) => cleanup());
		cleanups.length = 0;
		revokeObjectUrl(src);
	};

	const timer = setTimeout(release, OBJECT_URL_REVOKE_TIMEOUT_MS);
	cleanups.push(() => clearTimeout(timer));

	const bind = () => {
		const images = Array.from(view.dom.querySelectorAll('img')).filter(
			(image) => image.getAttribute('src') === src
		);

		if (!images.length) return false;

		let pending = 0;

		images.forEach((image) => {
			if (image.complete) return;

			pending += 1;
			const settle = () => {
				image.removeEventListener('load', settle);
				image.removeEventListener('error', settle);
				pending -= 1;
				if (pending <= 0) release();
			};

			image.addEventListener('load', settle);
			image.addEventListener('error', settle);
			cleanups.push(() => {
				image.removeEventListener('load', settle);
				image.removeEventListener('error', settle);
			});
		});

		if (pending <= 0) release();
		return true;
	};

	queueMicrotask(() => {
		if (bind()) return;
		requestAnimationFrame(() => {
			bind();
		});
	});
};

export const dropImagePlugin = () => {
	return new Plugin({
		props: {
			handleDOMEvents: {
				paste(view, event) {
					const upload: UploadFn = (<any>window).__image_uploader || fallbackUpload;
					const items = Array.from(event.clipboardData?.items || []);
					const { schema } = view.state;

					items.forEach((item) => {
						const image = item.getAsFile();

						if (item.type.indexOf('image') === 0) {
							event.preventDefault();
							const skeleton = insertUploadSkeleton(
								{
									state: view.state,
									view
								},
								{
									kind: 'image',
									height: 220
								}
							);

							if (upload && image) {
								upload(image)
									.then((src) => {
										if (skeleton) {
											skeleton.replaceWith({
												type: 'image',
												attrs: { src }
											});
										} else {
											const node = schema.nodes.image.create({ src });
											const transaction = view.state.tr.replaceSelectionWith(node);
											view.dispatch(transaction);
										}
										releaseObjectUrlOnImageSettled(view, src);
									})
									.catch(() => {
										skeleton?.remove();
									});
							}
						} else {
							const reader = new FileReader();
							reader.onload = (readerEvent) => {
								const node = schema.nodes.image.create({
									src: readerEvent.target?.result
								});
								const transaction = view.state.tr.replaceSelectionWith(node);
								view.dispatch(transaction);
							};
							if (!image) return;
							reader.readAsDataURL(image);
						}
					});

					return false;
				},
				drop: (view, event) => {
					const upload: UploadFn = (<any>window).__image_uploader || fallbackUpload;
					const hasFiles =
						event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files.length;

					if (!hasFiles) {
						return false;
					}

					const images = Array.from(event.dataTransfer?.files ?? []).filter((file) =>
						/image/i.test(file.type)
					);

					if (images.length === 0) {
						return false;
					}

					event.preventDefault();

					const { schema } = view.state;
					const coordinates = view.posAtCoords({
						left: event.clientX,
						top: event.clientY
					});
					if (!coordinates) return false;

					images.forEach(async (image) => {
						const reader = new FileReader();
						const skeleton = insertUploadSkeleton(
							{
								state: view.state,
								view
							},
							{
								kind: 'image',
								height: 220,
								at: coordinates.pos
							}
						);

						if (upload) {
							try {
								const src = await upload(image);
								if (skeleton) {
									skeleton.replaceWith({
										type: 'image',
										attrs: { src }
									});
								} else {
									const node = schema.nodes.image.create({ src });
									const transaction = view.state.tr.insert(coordinates.pos, node);
									view.dispatch(transaction);
								}
								releaseObjectUrlOnImageSettled(view, src);
							} catch {
								skeleton?.remove();
							}
						} else {
							reader.onload = (readerEvent) => {
								const src = readerEvent.target?.result;
								if (typeof src !== 'string') {
									skeleton?.remove();
									return;
								}
								if (skeleton) {
									skeleton.replaceWith({
										type: 'image',
										attrs: { src }
									});
									return;
								}
								const node = schema.nodes.image.create({ src });
								const transaction = view.state.tr.insert(coordinates.pos, node);
								view.dispatch(transaction);
							};
							reader.readAsDataURL(image);
						}
					});

					return true;
				}
			}
		}
	});
};
