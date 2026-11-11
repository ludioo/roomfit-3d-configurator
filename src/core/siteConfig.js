/**
 * Public site origin for canonical / Open Graph / Twitter.
 * Change this one value when the subdomain moves (deploy/DNS stay manual).
 */
export const SITE_ORIGIN = 'https://configurator.barkahmauludi.com';

export const SITE_NAME = 'RoomFit';

export const CONTACT_URL = 'https://barkahmauludi.com/contact';

export const OG_IMAGE_PATH = '/og-image.png';

/** @param {string} path absolute path starting with / */
export function absoluteUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_ORIGIN}${p}`;
}
