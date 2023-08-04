import {Node, mergeAttributes} from "@tiptap/core";
import {Plugin, PluginKey} from "prosemirror-state";

const youtubeRegExp =
    /^(?:(?:https?:)?\/\/)?(?:www\.)?(?:m\.)?(?:youtu(?:be)?\.com\/(?:v\/|embed\/|watch(?:\/|\?v=))|youtu\.be\/)((?:\w|-){11})(?:\S+)?$/;
const youtubeExtractId = (url: string) => {
    const match = youtubeRegExp.exec(url.trim());
    return match ? match[1] : false;
};

export interface VideoPlayerOptions {
    HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
    interface Commands<ReturnType> {
        videoPlayer: {
            insertVideoPlayer: (options: { url: string }) => ReturnType;
        };
    }
}

const videoPlayerStaticAttributes = {nocookie: true};

export default Node.create<VideoPlayerOptions>({
    name: "lite-youtube",
    content: "",
    marks: "",
    group: "block",
    draggable: true,

    addAttributes() {
        return {
            videoid: {
                default: null,
            },
            provider: {
                default: "youtube",
            },
        };
    },
    parseHTML() {
        return [
            {
                tag: "lite-youtube",
            },
        ];
    },
    renderHTML({HTMLAttributes}) {
        return [
            "lite-youtube",
            mergeAttributes(videoPlayerStaticAttributes, this.options.HTMLAttributes, HTMLAttributes),
        ]
    },
    addCommands() {
        return {
            insertVideoPlayer: (options) => ({chain, editor}) => {
                const {url} = options;
                const videoid = youtubeExtractId(url);
                if (videoid) {
                    const {selection} = editor.state;
                    const pos = selection.$head;

                    return chain().insertContentAt(pos.before(), [{
                        type: this.name,
                        attrs: {videoid, provider: "youtube"},
                    }]).run()
                }
                return false;
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey("handlePasteVideoURL"),
                props: {
                    handlePaste: (view, _event, slice) => {
                        if (slice.content.childCount !== 1) return false;

                        const {state} = view;
                        const {selection} = state;
                        const {empty} = selection;

                        if (!empty) return false;

                        const pos = selection.$head;
                        const node = pos.node();
                        if (node.content.size > 0) return false;

                        let textContent = "", href = "";
                        slice.content.forEach((node) => {
                            textContent += node.textContent;
                        });
                        textContent = textContent.trim();

                        let videoid = youtubeExtractId(textContent);

                        if (!videoid) for (const mark of slice?.content?.content?.[0]?.marks) {
                            if (mark.attrs.href) {
                                const id = youtubeExtractId(mark.attrs.href);
                                if (id) {
                                    videoid = id;
                                    break;
                                }
                            }
                        }

                        if (!videoid) return false;

                        this.editor.chain().insertContentAt(pos.before(), [{
                            type: this.name,
                            attrs: {videoid, provider: "youtube"},
                        }]).run();

                        return true;
                    },
                },
            }),
        ];
    },
});