import enUs from './en-us/index';
import koKr from './ko-kr/index';

const locales = [enUs, koKr] as const;
type Locale = (typeof locales)[number];
export type LocaleInput = string | Locale | null | undefined;
export type I18nTranslate = (...args: string[]) => string;
export const I18N_CONTEXT = Symbol('tiptap-i18n');

const normalizeLocaleCode = (value: string | null | undefined): string =>
	(value ?? '').trim().replace(/_/g, '-').toLowerCase();

const findLocale = (localeList: readonly Locale[], language: string): Locale | null => {
	const normalized = normalizeLocaleCode(language);
	if (!normalized) return null;

	const exact = localeList.find((item) =>
		item.target.some((target) => normalizeLocaleCode(target) === normalized)
	);
	if (exact) return exact;

	const primary = normalized.split('-')[0];
	if (!primary) return null;

	return (
		localeList.find((item) => normalizeLocaleCode(item.lang) === primary) ??
		localeList.find((item) =>
			item.target.some((target) => normalizeLocaleCode(target).split('-')[0] === primary)
		) ??
		null
	);
};

export function getLocale(
	localeList: readonly Locale[] = locales,
	language?: string | null
): Locale {
	if (language) return findLocale(localeList, language) ?? enUs;
	if (typeof navigator === 'undefined') return enUs;
	return findLocale(localeList, navigator.language) ?? enUs;
}

const resolveLocale = (input?: LocaleInput): Locale => {
	if (!input || (typeof input === 'string' && normalizeLocaleCode(input) === 'auto'))
		return getLocale();
	if (typeof input === 'string') return getLocale(locales, input);
	return input;
};

const translate = (locale: Locale, args: string[]): string => {
	let value: unknown = locale;
	for (const key of args) {
		if (value && typeof value === 'object' && key in (value as Record<string, unknown>)) {
			value = (value as Record<string, unknown>)[key];
			continue;
		}
		value = '';
		break;
	}
	return typeof value === 'string' ? value : '';
};

export function translateWithLocale(input: LocaleInput, ...args: string[]): string {
	return translate(resolveLocale(input), args);
}

let currentLocale: Locale = getLocale();

type I18n = ((...args: string[]) => string) & {
	locale: Locale;
	localeLangCountry: string;
	locales: readonly Locale[];
	setLocale: (input?: LocaleInput) => Locale;
	getLocale: () => Locale;
};

const i18n = ((...args: string[]) => {
	return translate(currentLocale, args);
}) as I18n;

export function setLocale(input?: LocaleInput): Locale {
	currentLocale = resolveLocale(input);
	i18n.locale = currentLocale;
	i18n.localeLangCountry = `${i18n('lang')}-${i18n('country')}`;
	return currentLocale;
}

i18n.locales = locales;
i18n.getLocale = () => currentLocale;
i18n.setLocale = setLocale;
setLocale(currentLocale);

export default i18n;

//@ts-ignore
if (typeof window !== 'undefined') window.__me_i18n = i18n;
