/**
 * Safe image fallback — prevents infinite onError loops.
 * Uses a data-attribute flag so each <img> only falls back ONCE.
 */

// Generic no-image SVG placeholder (inline data URI — never makes a network request)
export const NO_IMAGE_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3Cg transform='translate(200,180)'%3E%3Cpath d='M-40,-20 L40,-20 L40,30 L-40,30 Z' fill='none' stroke='%23d1d5db' stroke-width='2'/%3E%3Ccircle cx='-20' cy='-5' r='6' fill='%23d1d5db'/%3E%3Cpath d='M-35,25 L-10,5 L5,15 L20,0 L35,20' fill='none' stroke='%23d1d5db' stroke-width='2'/%3E%3C/g%3E%3Ctext x='50%25' y='60%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui,sans-serif' font-size='14' fill='%239ca3af'%3EKhông có ảnh%3C/text%3E%3C/svg%3E`;

// Banner-specific SVG placeholder
export const BANNER_FALLBACK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='500' viewBox='0 0 1200 500'%3E%3Crect width='1200' height='500' fill='%23e9ecef'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23adb5bd'%3EBanner%3C/text%3E%3C/svg%3E`;

// News-specific SVG placeholder
export const NEWS_FALLBACK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e9ecef'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='%23adb5bd'%3ESpaceLink News%3C/text%3E%3C/svg%3E`;

// Admin table small placeholder
export const ADMIN_THUMB_FALLBACK = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='50' viewBox='0 0 80 50'%3E%3Crect width='80' height='50' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='9' fill='%23aaa'%3ENo Img%3C/text%3E%3C/svg%3E`;

/**
 * Use this as the `onError` handler on any `<img>` tag.
 * It replaces the broken src with the given fallback, but ONLY ONCE.
 *
 * @example
 * <img src={url} onError={e => handleImgError(e)} />
 * <img src={url} onError={e => handleImgError(e, BANNER_FALLBACK)} />
 */
export function handleImgError(
    e: React.SyntheticEvent<HTMLImageElement, Event>,
    fallbackSrc: string = NO_IMAGE_SVG,
) {
    const img = e.currentTarget;
    // Guard: only apply fallback once
    if (img.dataset.fallbackApplied) return;
    img.dataset.fallbackApplied = '1';
    img.src = fallbackSrc;
}
