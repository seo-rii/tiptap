import {Editor, mergeAttributes} from "@tiptap/core";
import {CodeBlockLowlight} from "@tiptap/extension-code-block-lowlight";
import {lowlight} from "lowlight";
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
import Placeholder from "@tiptap/extension-placeholder";
import {Indent} from "$lib/plugin/indent";
import {Color} from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Iframe from "$lib/plugin/iframe";
// @ts-ignore
import {MathInline, MathBlock} from "@seorii/prosemirror-math/tiptap";

import command from "$lib/plugin/command";

export default (element: Element, content: string, {
    placeholder = '내용을 입력하세요...',
    plugins = [],
    ...props
}: any = {}) => new Editor({
    element, content, ...props,
    extensions: [
        CodeBlockLowlight.configure({lowlight}),
        Image,
        StarterKit,
        Underline,
        Highlight.configure({multicolor: true}),
        Link.configure({openOnClick: true}),
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
        Placeholder.configure({placeholder}),
        Indent,
        Color,
        TextStyle,
        Iframe,
        Code.extend({
            renderHTML({HTMLAttributes}) {
                return ['code', mergeAttributes(HTMLAttributes, {class: 'inline'})]
            }
        }),
        command,
        ...plugins,
    ],
});