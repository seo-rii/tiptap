import {slashVisible, slashItems, slashLocaltion, slashProps, slashDetail} from './stores';
import i18n from "$lib/i18n";

export default {
    items: ({query}) => {
        const raw = [
            {
                section: i18n('text'), list: [
                    {
                        icon: 'title',
                        title: i18n('title') + ' 1',
                        subtitle: i18n('title1Info'),
                        command: ({editor, range}) => {
                            editor.chain().focus().deleteRange(range).setNode('heading', {level: 1}).run();
                        }
                    },
                    {
                        icon: 'title',
                        title: i18n('title') + ' 2',
                        subtitle: i18n('title2Info'),
                        command: ({editor, range}) => {
                            editor.chain().focus().deleteRange(range).setNode('heading', {level: 2}).run();
                        }
                    },
                    {
                        icon: 'title',
                        title: i18n('title') + ' 3',
                        subtitle: i18n('title3Info'),
                        command: ({editor, range}) => {
                            editor.chain().focus().deleteRange(range).setNode('heading', {level: 3}).run();
                        }
                    },
                    {
                        icon: 'format_list_bulleted',
                        title: i18n('unorderedList'),
                        subtitle: i18n('unorderedListInfo'),
                        command: ({editor, range}) => {
                            editor.commands.deleteRange(range);
                            editor.commands.toggleBulletList();
                        }
                    },
                    {
                        icon: 'format_list_numbered',
                        title: i18n('numberList'),
                        subtitle: i18n('numberListInfo'),
                        command: ({editor, range}) => {
                            editor.commands.deleteRange(range);
                            editor.commands.toggleOrderedList();
                        }
                    }
                ]
            },
            {
                section: i18n('block'), list: [
                    {
                        icon: 'code',
                        title: i18n('codeBlock'),
                        subtitle: i18n('codeBlockInfo'),
                        command: ({editor, range}) => {
                            editor.chain().focus().deleteRange(range).setNode('codeBlock').run();
                        }
                    },
                    {
                        icon: 'functions',
                        title: i18n('mathBlock'),
                        subtitle: i18n('mathBlockInfo'),
                        command: ({editor, range}) => {
                            const {to} = range;
                            editor.chain().focus().deleteRange(range).setNode('math_display').focus().run();
                        }
                    },
                    {
                        icon: 'table_chart',
                        title: i18n('table'),
                        subtitle: i18n('tableInfo'),
                        command: ({editor, range}) => {
                            editor.chain().focus().insertTable({rows: 2, cols: 3}).run();
                        }
                    },
                    {
                        icon: 'format_quote',
                        title: i18n('blockquote'),
                        subtitle: i18n('blockquoteInfo'),
                        command: ({editor, range}) => {
                            editor.chain().focus().deleteRange(range).setBlockquote().focus().run();
                        }
                    },
                    {
                        icon: 'iframe',
                        title: i18n('iframe'),
                        subtitle: i18n('iframeInfo'),
                        command: ({editor, range}) => {
                            slashDetail.set('iframe');
                        }
                    },
                    {
                        icon: 'youtube_activity',
                        title: i18n('youtube'),
                        subtitle: i18n('youtubeInfo'),
                        command: ({editor, range}) => {
                            slashDetail.set('youtube');
                        }
                    }
                ]
            }
        ]

        const filtered = raw.map(({section, list}) =>
            ({
                section, list: list.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())
                    || item.subtitle.toLowerCase().includes(query.toLowerCase()))
            })).filter(({list}) => list.length > 0);

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
                slashDetail.set(null);
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
