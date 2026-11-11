import infoSvg from './icons/info.svg?raw';
import xSvg from './icons/x.svg?raw';
import saveSvg from './icons/save.svg?raw';
import trashSvg from './icons/trash.svg?raw';
import cameraSvg from './icons/camera.svg?raw';
import cubeSvg from './icons/cube.svg?raw';
import chevronSvg from './icons/chevron.svg?raw';

/**
 * @param {string} svg
 * @param {string} [className]
 * @returns {string}
 */
export function iconHtml(svg, className = 'icon') {
  return svg.replace(
    /<svg\b([^>]*)>/,
    `<svg class="${className}" aria-hidden="true"$1>`,
  );
}

export const icons = {
  info: infoSvg,
  x: xSvg,
  save: saveSvg,
  trash: trashSvg,
  camera: cameraSvg,
  cube: cubeSvg,
  chevron: chevronSvg,
};
