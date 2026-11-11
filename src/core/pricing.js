/** @typedef {{ IDR: number, USD: number }} MoneyPair */
/** @typedef {{ IDR: number, USD: number, illustrative?: boolean }} BasePrice */
/** @typedef {{ id: string, priceAdd?: MoneyPair }} PricedOption */
/** @typedef {{
 *   basePrice: BasePrice,
 *   options?: {
 *     fabricColor?: PricedOption[],
 *     finish?: PricedOption[],
 *     size?: PricedOption[],
 *   }
 * }} PricedProduct */
/** @typedef {{ fabricColor: string, finish: string, size: string }} PriceOptions */

const OPTION_KEYS = /** @type {const} */ (['fabricColor', 'finish', 'size']);

/**
 * @param {PricedOption[] | undefined} list
 * @param {string} id
 * @returns {MoneyPair}
 */
function priceAddFor(list, id) {
  const found = list?.find((item) => item.id === id);
  return { IDR: found?.priceAdd?.IDR ?? 0, USD: found?.priceAdd?.USD ?? 0 };
}

/**
 * @param {PricedProduct | null | undefined} product
 * @param {PriceOptions} options
 * @returns {{ IDR: number, USD: number, illustrative: boolean }}
 */
export function computePrice(product, options) {
  if (!product?.basePrice) {
    return { IDR: 0, USD: 0, illustrative: true };
  }

  let IDR = product.basePrice.IDR ?? 0;
  let USD = product.basePrice.USD ?? 0;

  for (const key of OPTION_KEYS) {
    const add = priceAddFor(product.options?.[key], options[key]);
    IDR += add.IDR;
    USD += add.USD;
  }

  return {
    IDR,
    USD,
    illustrative: product.basePrice.illustrative !== false,
  };
}

/**
 * @param {'en' | 'id' | string} lang
 * @returns {'IDR' | 'USD'}
 */
export function currencyForLang(lang) {
  return lang === 'id' ? 'IDR' : 'USD';
}

/**
 * @param {number} amount
 * @param {'IDR' | 'USD' | string} currency
 * @param {'en' | 'id' | string} lang
 * @returns {string}
 */
export function formatPrice(amount, currency, lang) {
  const locale = lang === 'id' ? 'id-ID' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
