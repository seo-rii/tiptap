import { Extension } from '@tiptap/core';
import { Fragment, Slice, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export default Extension.create({
	name: 'mathPaste',

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('mathPaste'),
				props: {
					transformPasted: (slice, view) => {
						const { schema } = view.state;
						const mathInline = schema.nodes.math_inline;
						const mathDisplay = schema.nodes.math_display;
						if (!mathInline && !mathDisplay) return slice;

						let changed = false;
						let blockChanged = false;

						const transformFragment = (fragment: Fragment, parent: ProseMirrorNode | null) => {
							const nodes: ProseMirrorNode[] = [];

							for (let index = 0; index < fragment.childCount; index++) {
								const node = fragment.child(index);
								if (
									parent?.type.spec.code ||
									node.type.spec.code ||
									node.type.name.startsWith('math_')
								) {
									nodes.push(node);
									continue;
								}

								if (mathDisplay && node.isTextblock && node.textContent.trim() === '$$') {
									const source: string[] = [];
									let endIndex = -1;

									for (let offset = index + 1; offset < fragment.childCount; offset++) {
										const candidate = fragment.child(offset);
										if (
											candidate.type.spec.code ||
											candidate.type.name.startsWith('math_') ||
											!candidate.isTextblock
										) {
											break;
										}

										const text = candidate.textContent;
										if (text.trim() === '$$') {
											endIndex = offset;
											break;
										}
										source.push(text);
									}

									const text = source.join('\n').trim();
									if (endIndex > -1 && text.length) {
										nodes.push(mathDisplay.create(null, schema.text(text)));
										index = endIndex;
										changed = true;
										blockChanged = true;
										continue;
									}
								}

								if (mathDisplay && node.isTextblock) {
									const match = /^\s*\$\$([\s\S]*?)\$\$\s*$/.exec(node.textContent);
									const text = match?.[1]?.trim();
									if (text) {
										nodes.push(mathDisplay.create(null, schema.text(text)));
										changed = true;
										blockChanged = true;
										continue;
									}
								}

								if (node.isText) {
									if (!mathInline || node.marks.some((mark) => mark.type.spec.code)) {
										nodes.push(node);
										continue;
									}

									const text = node.text || '';
									const inlineNodes: ProseMirrorNode[] = [];
									let cursor = 0;
									let searchFrom = 0;

									while (searchFrom < text.length) {
										const open = text.indexOf('$', searchFrom);
										if (open === -1) break;

										const beforeOpen = text[open - 1];
										const afterOpen = text[open + 1];
										if (
											beforeOpen === '\\' ||
											beforeOpen === '$' ||
											afterOpen === '$' ||
											!afterOpen ||
											/\s/.test(afterOpen)
										) {
											searchFrom = open + 1;
											continue;
										}

										let close = open + 1;
										while (close < text.length) {
											close = text.indexOf('$', close);
											if (close === -1) break;

											const beforeClose = text[close - 1];
											const afterClose = text[close + 1];
											if (
												beforeClose === '\\' ||
												beforeClose === '$' ||
												afterClose === '$' ||
												/\s/.test(beforeClose)
											) {
												close++;
												continue;
											}
											break;
										}
										if (close === -1) break;

										const source = text.slice(open + 1, close);
										if (!source.trim()) {
											searchFrom = close + 1;
											continue;
										}

										if (open > cursor)
											inlineNodes.push(schema.text(text.slice(cursor, open), node.marks));
										inlineNodes.push(mathInline.create(null, schema.text(source), node.marks));
										cursor = close + 1;
										searchFrom = cursor;
									}

									if (!inlineNodes.length) {
										nodes.push(node);
										continue;
									}
									if (cursor < text.length)
										inlineNodes.push(schema.text(text.slice(cursor), node.marks));
									nodes.push(...inlineNodes);
									changed = true;
									continue;
								}

								if (!node.content.size) {
									nodes.push(node);
									continue;
								}

								const content = transformFragment(node.content, node);
								nodes.push(content.eq(node.content) ? node : node.copy(content));
							}

							return Fragment.fromArray(nodes);
						};

						const content = transformFragment(slice.content, null);
						if (!changed) return slice;
						return blockChanged
							? new Slice(content, 0, 0)
							: new Slice(content, slice.openStart, slice.openEnd);
					}
				}
			})
		];
	}
});
