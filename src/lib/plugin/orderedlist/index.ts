import { wrappingInputRule } from '@tiptap/core';
import OrderedListBase from '@tiptap/extension-ordered-list';
import toggleList from './toggleList';

import './korean.scss';

export default OrderedListBase.extend({
	priority: 20,
	addAttributes() {
		return {
			start: {
				default: 1,
				parseHTML: (element: Element) => {
					return element.hasAttribute('start')
						? parseInt(element.getAttribute('start') || '', 10)
						: 1;
				}
			},
			type: {
				default: '1'
			}
		};
	},
	addInputRules() {
		return [
			wrappingInputRule({
				find: /^(\d+)\.\s$/,
				type: this.type,
				getAttributes: (match) => ({ start: +match[1], type: '1' }),
				joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1]
			}),
			wrappingInputRule({
				find: /^([i])\.\s$/,
				type: this.type,
				getAttributes: (match) => ({ start: 1, type: 'i' }),
				joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1]
			}),
			wrappingInputRule({
				find: /^([I])\.\s$/,
				type: this.type,
				getAttributes: (match) => ({ start: 1, type: 'I' }),
				joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1]
			}),
			wrappingInputRule({
				find: /^([A-Z])\.\s$/,
				type: this.type,
				getAttributes: (match) => ({ start: match[1].charCodeAt(0) - 64, type: 'A' }),
				joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1]
			}),
			wrappingInputRule({
				find: /^([a-z])\.\s$/,
				type: this.type,
				getAttributes: (match) => ({ start: match[1].charCodeAt(0) - 96, type: 'a' }),
				joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1]
			}),
			wrappingInputRule({
				find: /^([ㄱ-ㅎ])\.\s$/,
				type: this.type,
				getAttributes: (match) => ({
					start:
						1 +
						[
							'ㄱ',
							'ㄴ',
							'ㄷ',
							'ㄹ',
							'ㅁ',
							'ㅂ',
							'ㅅ',
							'ㅇ',
							'ㅈ',
							'ㅊ',
							'ㅋ',
							'ㅌ',
							'ㅍ',
							'ㅎ'
						].indexOf(match[1]),
					type: 'kors'
				}),
				joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1]
			}),
			wrappingInputRule({
				find: /^([가-하])\.\s$/,
				type: this.type,
				getAttributes: (match) => ({
					start:
						1 +
						[
							'가',
							'나',
							'다',
							'라',
							'마',
							'바',
							'사',
							'아',
							'자',
							'차',
							'카',
							'타',
							'파',
							'하'
						].indexOf(match[1]),
					type: 'korc'
				}),
				joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1]
			})
		];
	},
	addCommands() {
		return {
			toggleOrderedList: (option: any) => (context: any) => {
				return toggleList(this.name, this.options.itemTypeName, option)(context);
			}
		} as any;
	}
});
