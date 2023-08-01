import {slashVisible, slashItems, slashLocaltion, slashProps} from './stores';

export default {
    items: ({query}) => {
        const raw = [
            {
                section: '텍스트', list: [
                    {
                        icon: 'title',
                        title: '제목 1',
                        subtitle: '큰 제목',
                        command: ({editor, range}) => {
                            editor.chain().focus().deleteRange(range).setNode('heading', {level: 1}).run();
                        }
                    },
                    {
                        icon: 'title',
                        title: '제목 2',
                        subtitle: '좀 더 작은 제목',
                        command: ({editor, range}) => {
                            editor.chain().focus().deleteRange(range).setNode('heading', {level: 2}).run();
                        }
                    },
                    {
                        icon: 'title',
                        title: '제목 3',
                        subtitle: '적당히 큰 제목',
                        command: ({editor, range}) => {
                            editor.chain().focus().deleteRange(range).setNode('heading', {level: 3}).run();
                        }
                    },
                    {
                        icon: 'format_list_bulleted',
                        title: '리스트',
                        subtitle: '순서 없는 리스트',
                        command: ({editor, range}) => {
                            editor.commands.deleteRange(range);
                            editor.commands.toggleBulletList();
                        }
                    },
                    {
                        icon: 'format_list_numbered',
                        title: '숫자 리스트',
                        subtitle: '1, 2, 3, 4',
                        command: ({editor, range}) => {
                            editor.commands.deleteRange(range);
                            editor.commands.toggleOrderedList();
                        }
                    }
                ]
            },
            {
                section: '블록', list: [
                    {
                        icon: 'code',
                        title: '코드 블록',
                        subtitle: '하이라이팅되는 코드 블록',
                        command: ({editor, range}) => {
                            editor.chain().focus().deleteRange(range).setNode('codeBlock').run();
                        }
                    },
                    {
                        icon: 'functions',
                        title: '수식 블록',
                        subtitle: '가운데로 정렬된 큰 수식',
                        command: ({editor, range}) => {
                            const {to} = range;
                            editor.chain().focus().deleteRange(range).setNode('math_display').focus().run();
                        }
                    },
                    {
                        icon: 'table_chart',
                        title: '테이블',
                        subtitle: '표',
                        command: ({editor, range}) => {
                            editor.chain().focus().insertTable({rows: 2, cols: 3}).run();
                        }
                    }
                ]
            }
        ]

        const filtered = raw.map(({section, list}) =>
            ({section, list: list.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))})).filter(({list}) => list.length > 0);

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
