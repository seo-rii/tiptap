import {slashVisible, slashItems, slashLocaltion, slashProps, slashDetail} from './stores';
import {PluginKey} from "prosemirror-state";
import Suggestion from "@tiptap/suggestion";
import type {Editor} from "@tiptap/core";

//@ts-ignore
import emojis from 'emojis-list'
//@ts-ignore
import tags from 'emojis-keywords'

const max = 10;

function fixRange(editor: Editor, range: any, split = '/') {
    const {state} = editor.view, {selection, doc} = state
    if (selection.$to.nodeBefore?.text?.includes?.(split)) {
        range.from = range.to
        while (range.from > 0 && doc.textBetween(range.from - 1, range.from) !== split) {
            try {
                range.from -= 1
            } catch (e) {
                range.from += 2
                break
            }
        }
        range.from -= 1
    }
    while (range.to < selection.to && doc.textBetween(range.to, range.to + 1) !== ' ') {
        try {
            range.to += 1
        } catch (e) {
            range.to -= 1
            break
        }
    }
    return range
}

export const emoji = {
    pluginKey: new PluginKey('slash-emoji'),
    char: ':',
    items: ({query}) => {
        query = ':' + query.toLowerCase()
        const filtered = []
        for (let i = 0; i < emojis.length; i++) {
            if (tags[i]?.includes?.(query)) filtered.push({
                title: emojis[i] + ' ' + tags[i],
                command: ({editor, range}) => {
                    editor.chain().deleteRange(fixRange(editor, range, ':')).insertContent(emojis[i]).run();
                }
            });
            if (filtered.length >= max) break;
        }
        return filtered;
    },

    render: () => {
        return {
            onStart: (props) => {
                let editor = props.editor;
                let range = props.range;
                let location = props.clientRect();
                slashProps.set({editor, range});
                slashVisible.set(true);
                slashLocaltion.set({x: location.x, y: location.y, height: location.height});
                slashItems.set(props.items);
                slashDetail.set('emoji');
            },

            onUpdate(props) {
                slashItems.set(props.items);
            },

            onKeyDown(props) {
                if (props.event.key === 'Escape') {
                    slashVisible.set(false);
                    return true;
                }
            },

            onExit() {
                slashVisible.set(false);
            }
        };
    }
};

export default (editor: Editor) => Suggestion({...emoji, editor})