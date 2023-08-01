import {Extension} from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import suggestion from "$lib/plugin/command/suggest";

export const Command = Extension.create({
    name: 'slash',

    addOptions() {
        return {
            suggestion: {
                char: '/',
                command: ({editor, range, props}) => {
                    props.command({editor, range});
                }
            }
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion
            })
        ];
    }
});

export default Command.configure({
    suggestion
})