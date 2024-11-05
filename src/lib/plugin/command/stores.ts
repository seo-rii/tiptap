import { writable } from 'svelte/store';

export const slashVisible = writable(false);
export const slashItems = writable([]);
export const slashLocaltion = writable({ x: 0, y: 0, height: 0 });
export const slashProps = writable({ editor: null, range: null });
export const slashDetail = writable(null);
export const slashSelection = writable(null);
