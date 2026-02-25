// Reexport your entry components here
import TipTap from '$lib/tiptap/index.js';
import { getDetail } from '$lib/plugin/command/suggest.js';
import { insertUploadSkeleton } from '$lib/plugin/upload/skeleton/index.js';

export default TipTap;
export { getDetail, insertUploadSkeleton };
