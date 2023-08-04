import enUs from './en-us/index'
import koKr from './ko-kr/index'
import {browser} from "$app/environment";

const locales = [enUs, koKr];

export function getLocale(locales: any[]) {
    if (typeof navigator === 'undefined') return enUs;
    const language = navigator.language;
    const locale = locales.find(item => item.target.includes(language));
    return locale || enUs;
}

const locale = getLocale(locales);

export default function i18n(...args: string[]) {
    return args.reduce((prev, next) => {
        return prev[next] || '';
    }, locale);
}
i18n.locale = locale;
i18n.localeLangCountry = i18n('lang') + '-' + i18n('country');

//@ts-ignore
if (browser) window.__me_i18n = i18n;