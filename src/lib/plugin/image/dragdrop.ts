import { Plugin, PluginKey } from 'prosemirror-state';

export type UploadFn = (image: File) => Promise<string>;
export const fallbackUpload = async (image: File) => URL.createObjectURL(image);

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

							if (upload && image) {
								upload(image).then((src) => {
									const node = schema.nodes.image.create({
										src: src
									});
									const transaction = view.state.tr.replaceSelectionWith(node);
									view.dispatch(transaction);
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

						if (upload) {
							const node = schema.nodes.image.create({
								src: await upload(image)
							});
							const transaction = view.state.tr.insert(coordinates.pos, node);
							view.dispatch(transaction);
						} else {
							reader.onload = (readerEvent) => {
								const node = schema.nodes.image.create({
									src: readerEvent.target?.result
								});
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
