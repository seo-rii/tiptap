import {Editor, mergeAttributes} from "@tiptap/core";
import {CodeBlockLowlight} from "@tiptap/extension-code-block-lowlight";
import Code from "@tiptap/extension-code";
import Image from "$lib/plugin/image";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import DropCursor from "@tiptap/extension-dropcursor";
import orderedlist from "$lib/plugin/orderedlist";
import table from "$lib/plugin/table";
import tableHeader from "$lib/plugin/table/tableHeader";
import tableRow from "$lib/plugin/table/tableRow";
import tableCell from "$lib/plugin/table/tableCell";
import Superscript from '@tiptap/extension-superscript'
import Subscript from "@tiptap/extension-subscript"
import {Indent} from "$lib/plugin/indent";
import {Color} from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Iframe from "$lib/plugin/iframe";
import Embed from "$lib/plugin/embed";
// @ts-ignore
import {MathInline, MathBlock} from "@seorii/prosemirror-math/tiptap";
import Youtube from "$lib/plugin/youtube";
import Placeholder from "@tiptap/extension-placeholder";

import command from "$lib/plugin/command/suggest";
import emoji from "$lib/plugin/command/emoji";
import i18n from "$lib/i18n";

import js from 'highlight.js/lib/languages/javascript'
import ts from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import cpp from 'highlight.js/lib/languages/cpp'
import java from 'highlight.js/lib/languages/java'
import kotlin from 'highlight.js/lib/languages/kotlin'
import go from 'highlight.js/lib/languages/go'
import csharp from 'highlight.js/lib/languages/csharp'
import rust from 'highlight.js/lib/languages/rust'
import { CodeBlockShiki } from '$lib/plugin/codeblock';

export default (element: Element, content: string, {
    placeholder = i18n('placeholder'),
    plugins = [],
    ...props
}: any = {}) => {
    const tt = new Editor({
        element, content, ...props,
        extensions: [
            CodeBlockShiki,
            Image,
            Youtube,
            StarterKit,
            Underline,
            Highlight.configure({multicolor: true}),
            Link.configure({
                openOnClick: true, protocols: ['ftp', 'mailto', {
                    scheme: 'tel',
                    optionalSlashes: true
                }]
            }),
            TextAlign.configure({types: ['heading', 'paragraph', 'image']}),
            DropCursor,
            orderedlist,
            MathInline,
            MathBlock,
            table,
            tableHeader,
            tableRow,
            tableCell,
            Superscript,
            Subscript,
            Indent,
            Color,
            TextStyle,
            Iframe,
            Embed,
            Code.extend({
                renderHTML({HTMLAttributes}) {
                    return ['code', mergeAttributes(HTMLAttributes, {class: 'inline'})]
                }
            }),
            Placeholder.configure({placeholder}),
            ...plugins,
        ],
    })
    tt.registerPlugin(emoji(tt));
    tt.registerPlugin(command(tt));
    return tt;
}