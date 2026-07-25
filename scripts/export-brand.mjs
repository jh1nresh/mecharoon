import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  utimes,
  writeFile,
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = join(root, 'public', 'brand');
const pngDir = join(brandDir, 'png');
const bannerDir = join(brandDir, 'banners');
const socialDir = join(brandDir, 'social');
const packagePath = join(brandDir, 'mecharoon-brand-package.zip');
const packageRoot = join(tmpdir(), `mecharoon-brand-package-${process.pid}`);
const frozenWordmarkHash = 'e231fd5043e8e718e6eb835f9bceb646c50affa434e5183bcababbcf8044b9a6';
const fixedTime = new Date('2026-07-25T00:00:00.000Z');

const palette = {
  ink: '#0B1F2A',
  paper: '#F5F1E8',
  reserve: '#2C755F',
  reservePale: '#DCEAE4',
  line: '#D6D1C7',
  white: '#FFFDF8',
};

function asDataUri(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

function svgBody(svg) {
  return svg
    .replace(/^<svg[^>]*>\s*/, '')
    .replace(/\s*<\/svg>\s*$/, '')
    .replace(/^\s*<title[^>]*>.*?<\/title>\s*/s, '')
    .replace(/^\s*<desc[^>]*>.*?<\/desc>\s*/s, '');
}

function stackedLockupSvg({symbol, wordmark, title}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 168" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">The Mecharoon authority-boundary symbol is centered above its parent-child wordmark.</desc>
  <svg x="160" y="0" width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
    ${svgBody(symbol)}
  </svg>
  <svg x="0" y="96" width="384" height="72" viewBox="0 0 384 72" aria-hidden="true">
    ${svgBody(wordmark)}
  </svg>
</svg>`;
}

function descriptorOutline(color) {
  return `<defs>
    <path id="descriptor-glyph-29" d="M638 0L520 0L459 189L198 189L136 0L22 0L260 698L401 698ZM431 286L362 493L330 594L325 594L293 493L224 286Z"/>
    <path id="descriptor-glyph-8" d="M535 -49Q535 -103 507.5 -139.5Q480 -176 422 -194Q364 -212 270 -212Q186 -212 133.5 -197Q81 -182 57.5 -154Q34 -126 34 -87Q34 -44 57.5 -19.5Q81 5 123 13L123 24Q94 33 79 54Q64 75 64 104Q64 144 91.5 165.5Q119 187 157 196L157 200Q110 222 85.5 262Q61 302 61 354Q61 407 85.5 447Q110 487 156.5 509.5Q203 532 268 532Q295 532 318.5 528Q342 524 363 516L363 530Q363 565 380 584Q397 603 431 603L510 603L510 516L405 516L405 495Q440 471 458.5 435Q477 399 477 354Q477 302 452.5 262Q428 222 381.5 200Q335 178 269 178Q250 178 232.5 180Q215 182 201 186Q182 179 167 166.5Q152 154 152 134Q152 113 170.5 104Q189 95 224 95L352 95Q448 95 491.5 57Q535 19 535 -49ZM433 -61Q433 -33 411.5 -17.5Q390 -2 337 -2L161 -2Q143 -12 134.5 -27.5Q126 -43 126 -62Q126 -93 151 -113Q176 -133 237 -133L305 -133Q369 -133 401 -115Q433 -97 433 -61ZM269 256Q317 256 343.5 278Q370 300 370 344L370 365Q370 409 343.5 431Q317 453 269 453Q221 453 194.5 431Q168 409 168 365L168 344Q168 300 194.5 278Q221 256 269 256Z"/>
    <path id="descriptor-glyph-6" d="M283 -12Q209 -12 155 21.5Q101 55 71.5 116Q42 177 42 260Q42 343 71 403.5Q100 464 153 498Q206 532 280 532Q357 532 408.5 497.5Q460 463 486 404Q512 345 512 273L512 232L156 232L156 215Q156 155 191.5 116.5Q227 78 293 78Q341 78 374 99Q407 120 429 156L494 93Q464 46 409.5 17Q355 -12 283 -12ZM282 447Q244 447 215.5 429.5Q187 412 171.5 381.5Q156 351 156 311L156 304L398 304L398 314Q398 354 384 384Q370 414 344 430.5Q318 447 282 447Z"/>
    <path id="descriptor-glyph-16" d="M187 0L78 0L78 520L187 520L187 434L192 434Q209 476 243.5 504Q278 532 338 532Q418 532 462.5 479Q507 426 507 330L507 0L398 0L398 317Q398 378 374.5 408.5Q351 439 300 439Q271 439 245.5 429.5Q220 420 203.5 400Q187 380 187 350Z"/>
    <path id="descriptor-glyph-22" d="M317 0L222 0Q166 0 136.5 30.5Q107 61 107 114L107 431L26 431L26 520L70 520Q97 520 107.5 532Q118 544 118 571L118 662L216 662L216 520L325 520L325 431L216 431L216 89L317 89Z"/>
    <path id="descriptor-glyph-47" d="M295 -12Q208 -12 146 20.5Q84 53 40 106L119 179Q155 134 199.5 111Q244 88 301 88Q368 88 402 118.5Q436 149 436 199Q436 226 426 246Q416 266 392 279Q368 292 328 300L266 311Q198 324 152.5 349Q107 374 84 414.5Q61 455 61 510Q61 572 91 617Q121 662 176.5 686Q232 710 306 710Q385 710 443 682.5Q501 655 541 603L462 533Q435 568 396 589Q357 610 299 610Q239 610 206.5 586Q174 562 174 516Q174 487 186 468Q198 449 222.5 437Q247 425 284 418L346 405Q416 392 461 366Q506 340 527.5 300.5Q549 261 549 205Q549 140 519 91.5Q489 43 432 15.5Q375 -12 295 -12Z"/>
    <path id="descriptor-glyph-18" d="M78 -200L78 520L187 520L187 434L192 434Q208 481 247 506.5Q286 532 338 532Q404 532 450 499.5Q496 467 520.5 406.5Q545 346 545 260Q545 175 520.5 114Q496 53 450 20.5Q404 -12 338 -12Q286 -12 248 14Q210 40 192 86L187 86L187 -200ZM305 80Q362 80 396 117.5Q430 155 430 215L430 305Q430 365 396 402Q362 439 305 439Q272 439 245.5 428Q219 417 203 397Q187 377 187 350L187 174Q187 144 203 123.5Q219 103 245.5 91.5Q272 80 305 80Z"/>
    <path id="descriptor-glyph-5" d="M405 0L405 86L400 86Q382 40 344 14Q306 -12 254 -12Q189 -12 142.5 20.5Q96 53 71.5 114Q47 175 47 260Q47 346 71.5 406.5Q96 467 142.5 499.5Q189 532 254 532Q306 532 345 506.5Q384 481 400 434L405 434L405 740L514 740L514 0ZM287 80Q320 80 346.5 91.5Q373 103 389 123.5Q405 144 405 174L405 350Q405 377 389 397Q373 417 346.5 428Q320 439 287 439Q231 439 196.5 402Q162 365 162 305L162 215Q162 155 196.5 117.5Q231 80 287 80Z"/>
    <path id="descriptor-glyph-31" d="M348 -12Q257 -12 191 28.5Q125 69 90 148Q55 227 55 345Q55 462 90 543.5Q125 625 191 667.5Q257 710 348 710Q438 710 499.5 670Q561 630 597 552L502 500Q484 550 446.5 579.5Q409 609 348 609Q267 609 221 553Q175 497 175 400L175 293Q175 197 221 143Q267 89 348 89Q410 89 450 121.5Q490 154 509 205L600 150Q565 75 501.5 31.5Q438 -12 348 -12Z"/>
    <path id="descriptor-glyph-17" d="M281 -12Q208 -12 154.5 21.5Q101 55 71.5 116Q42 177 42 260Q42 343 71.5 404Q101 465 154.5 498.5Q208 532 281 532Q353 532 406.5 498.5Q460 465 489.5 404Q519 343 519 260Q519 177 489.5 116Q460 55 406.5 21.5Q353 -12 281 -12ZM281 79Q337 79 370.5 113.5Q404 148 404 216L404 304Q404 372 370.5 406.5Q337 441 281 441Q226 441 191.5 406.5Q157 372 157 304L157 216Q157 148 191.5 113.5Q226 79 281 79Z"/>
    <path id="descriptor-glyph-20" d="M187 0L78 0L78 520L187 520L187 417L192 417Q200 443 217.5 466.5Q235 490 264 505Q293 520 335 520L364 520L364 415L321 415Q278 415 248 405Q218 395 202.5 377Q187 359 187 332Z"/>
    <path id="descriptor-glyph-14" d="M259 0L190 0Q134 0 106 29.5Q78 59 78 109L78 740L187 740L187 89L259 89Z"/>
    <path id="descriptor-glyph-44" d="M199 0L86 0L86 698L386 698Q450 698 495.5 672Q541 646 565 599Q589 552 589 488Q589 425 565 378Q541 331 495.5 304.5Q450 278 386 278L199 278ZM199 599L199 377L379 377Q407 377 427.5 387Q448 397 459 416.5Q470 436 470 464L470 512Q470 541 459 560Q448 579 427.5 589Q407 599 379 599Z"/>
    <path id="descriptor-glyph-1" d="M520 0L459 0Q429 0 407.5 13.5Q386 27 375 52Q364 77 364 111L364 120L395 87L360 87Q345 39 305 13.5Q265 -12 208 -12Q128 -12 84 30Q40 72 40 143Q40 195 65.5 229.5Q91 264 140 281.5Q189 299 262 299L356 299L356 343Q356 390 330 416.5Q304 443 249 443Q204 443 174.5 422.5Q145 402 125 372L60 431Q86 475 133.5 503.5Q181 532 256 532Q356 532 410.5 484.5Q465 437 465 350L465 89L520 89ZM356 229L264 229Q207 229 179 211Q151 193 151 159L151 141Q151 107 175 89Q199 71 239 71Q273 71 299 81Q325 91 340.5 110Q356 129 356 154Z"/>
  </defs>
  <g fill="${color}" transform="translate(184 128) scale(.018 -.018)">
    <use href="#descriptor-glyph-29"/>
    <use href="#descriptor-glyph-8" transform="translate(687.778)"/>
    <use href="#descriptor-glyph-6" transform="translate(1247.556)"/>
    <use href="#descriptor-glyph-16" transform="translate(1830.334)"/>
    <use href="#descriptor-glyph-22" transform="translate(2438.112)"/>
    <use href="#descriptor-glyph-47" transform="translate(3094.668)"/>
    <use href="#descriptor-glyph-18" transform="translate(3721.446)"/>
    <use href="#descriptor-glyph-6" transform="translate(4341.224)"/>
    <use href="#descriptor-glyph-16" transform="translate(4924.002)"/>
    <use href="#descriptor-glyph-5" transform="translate(5531.780)"/>
    <use href="#descriptor-glyph-31" transform="translate(6415.336)"/>
    <use href="#descriptor-glyph-17" transform="translate(7077.114)"/>
    <use href="#descriptor-glyph-16" transform="translate(7666.892)"/>
    <use href="#descriptor-glyph-22" transform="translate(8274.670)"/>
    <use href="#descriptor-glyph-20" transform="translate(8667.448)"/>
    <use href="#descriptor-glyph-17" transform="translate(9073.226)"/>
    <use href="#descriptor-glyph-14" transform="translate(9663.004)"/>
    <use href="#descriptor-glyph-44" transform="translate(10239.56)"/>
    <use href="#descriptor-glyph-14" transform="translate(10894.338)"/>
    <use href="#descriptor-glyph-1" transform="translate(11207.116)"/>
    <use href="#descriptor-glyph-16" transform="translate(11783.894)"/>
    <use href="#descriptor-glyph-6" transform="translate(12391.672)"/>
  </g>`;
}

function descriptorLockupSvg({symbol, wordmark, title, textColor}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 568 160" role="img" aria-labelledby="title desc">
  <title id="title">${title}</title>
  <desc id="desc">The Mecharoon symbol and parent-child wordmark with the Agent Spend Control Plane descriptor.</desc>
  <svg x="0" y="0" width="160" height="160" viewBox="0 0 64 64" aria-hidden="true">
    ${svgBody(symbol)}
  </svg>
  <svg x="184" y="26" width="384" height="72" viewBox="0 0 384 72" aria-hidden="true">
    ${svgBody(wordmark)}
  </svg>
  ${descriptorOutline(textColor)}
</svg>`;
}

function bannerSvg({width, height, social = false}, lockup, symbol) {
  const frame = social ? 32 : 36;
  const innerX = social ? 64 : 88;
  const logoWidth = social ? 480 : 590;
  const logoHeight = logoWidth * (72 / 472);
  const panelX = social ? 820 : 1110;
  const panelY = social ? 86 : 72;
  const panelWidth = social ? 298 : 398;
  const panelHeight = social ? 458 : 456;
  const symbolSize = social ? 238 : 318;
  const headlineY = social ? 286 : 288;
  const headlineSize = social ? 62 : 76;
  const sublineY = social ? 450 : 472;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">Mecharoon brand banner</title>
  <desc id="desc">Mecharoon Agent Spend Control Plane — financial control for autonomous teams.</desc>
  <rect width="${width}" height="${height}" fill="${palette.paper}"/>
  <rect x="${frame}" y="${frame}" width="${width - frame * 2}" height="${height - frame * 2}" fill="${palette.white}" stroke="${palette.line}" stroke-width="2"/>
  <image href="${asDataUri(lockup)}" x="${innerX}" y="${social ? 74 : 78}" width="${logoWidth}" height="${logoHeight}"/>
  <text x="${innerX}" y="${social ? 190 : 202}" fill="${palette.reserve}" font-family="Arial, Helvetica, sans-serif" font-size="${social ? 17 : 18}" font-weight="700" letter-spacing="3">AGENT SPEND CONTROL PLANE</text>
  <line x1="${innerX}" y1="${social ? 216 : 230}" x2="${social ? 710 : 980}" y2="${social ? 216 : 230}" stroke="${palette.line}" stroke-width="2"/>
  <text x="${innerX}" y="${headlineY}" fill="${palette.ink}" font-family="Arial, Helvetica, sans-serif" font-size="${headlineSize}" font-weight="700" letter-spacing="-3">
    <tspan x="${innerX}" dy="0">Financial control for</tspan>
    <tspan x="${innerX}" dy="${social ? 70 : 84}">autonomous teams.</tspan>
  </text>
  <text x="${innerX}" y="${sublineY}" fill="#344850" font-family="Arial, Helvetica, sans-serif" font-size="${social ? 22 : 24}">
    <tspan x="${innerX}" dy="0">Delegate authority. Reserve atomically.</tspan>
    <tspan x="${innerX}" dy="${social ? 32 : 34}">Reconcile every payment.</tspan>
  </text>
  <rect x="${panelX}" y="${panelY}" width="${panelWidth}" height="${panelHeight}" fill="${palette.reservePale}" stroke="${palette.line}" stroke-width="2"/>
  <image href="${asDataUri(symbol)}" x="${panelX + (panelWidth - symbolSize) / 2}" y="${panelY + (panelHeight - symbolSize) / 2 - 18}" width="${symbolSize}" height="${symbolSize}"/>
  <text x="${panelX + panelWidth / 2}" y="${panelY + panelHeight - 34}" text-anchor="middle" fill="${palette.ink}" font-family="Arial, Helvetica, sans-serif" font-size="${social ? 10 : 14}" font-weight="700" letter-spacing="${social ? 1.2 : 2}">DELEGATE · RESERVE · RECONCILE</text>
</svg>`;
}

async function render(svgPath, outputPath, width, height) {
  await sharp(svgPath)
    .resize(width, height, {fit: 'fill'})
    .png({compressionLevel: 9})
    .toFile(outputPath);
}

async function setFixedTimes(path) {
  const info = await stat(path);
  if (info.isDirectory()) {
    for (const entry of (await readdir(path)).sort()) {
      await setFixedTimes(join(path, entry));
    }
  }
  await utimes(path, fixedTime, fixedTime);
}

await mkdir(pngDir, {recursive: true});
await mkdir(bannerDir, {recursive: true});
await mkdir(socialDir, {recursive: true});

const wordmarkPath = join(brandDir, 'mecharoon-wordmark.svg');
const wordmark = await readFile(wordmarkPath, 'utf8');
const wordmarkHash = createHash('sha256').update(wordmark).digest('hex');
if (wordmarkHash !== frozenWordmarkHash) {
  throw new Error(`Wordmark changed: expected ${frozenWordmarkHash}, received ${wordmarkHash}`);
}

const symbolPath = join(brandDir, 'mecharoon-symbol-color.svg');
const symbol = await readFile(symbolPath, 'utf8');
const symbolMonoPath = join(brandDir, 'mecharoon-symbol-mono.svg');
const symbolMono = await readFile(symbolMonoPath, 'utf8');
const symbolReversePath = join(brandDir, 'mecharoon-symbol-reverse.svg');
const symbolReverse = await readFile(symbolReversePath, 'utf8');
const lockupPath = join(brandDir, 'mecharoon-horizontal-lockup.svg');
const lockup = await readFile(lockupPath, 'utf8');
const reverseLockupPath = join(brandDir, 'mecharoon-horizontal-lockup-reverse.svg');
const reverseLockup = lockup
  .replace('Mecharoon horizontal lockup', 'Mecharoon reverse horizontal lockup')
  .replaceAll(palette.ink, palette.paper);
await writeFile(reverseLockupPath, reverseLockup);

const monoLockupPath = join(brandDir, 'mecharoon-horizontal-lockup-mono.svg');
const monoLockup = lockup
  .replace('Mecharoon horizontal lockup', 'Mecharoon monochrome horizontal lockup')
  .replaceAll(palette.reserve, palette.ink);
await writeFile(monoLockupPath, monoLockup);

const monoReverseLockupPath = join(brandDir, 'mecharoon-horizontal-lockup-mono-reverse.svg');
const monoReverseLockup = lockup
  .replace('Mecharoon horizontal lockup', 'Mecharoon reverse monochrome horizontal lockup')
  .replaceAll(palette.ink, palette.paper)
  .replaceAll(palette.reserve, palette.paper);
await writeFile(monoReverseLockupPath, monoReverseLockup);

const reverseWordmark = wordmark.replaceAll(palette.ink, palette.paper);
const monoWordmark = wordmark.replaceAll(palette.reserve, palette.ink);
const monoReverseWordmark = wordmark
  .replaceAll(palette.ink, palette.paper)
  .replaceAll(palette.reserve, palette.paper);

const primaryLogoPath = join(brandDir, 'mecharoon-primary-logo.svg');
const primaryLogoReversePath = join(brandDir, 'mecharoon-primary-logo-reverse.svg');
const primaryLogoMonoPath = join(brandDir, 'mecharoon-primary-logo-mono.svg');
const primaryLogoMonoReversePath = join(brandDir, 'mecharoon-primary-logo-mono-reverse.svg');
await writeFile(
  primaryLogoPath,
  descriptorLockupSvg({
    symbol,
    wordmark,
    title: 'Mecharoon primary logo',
    textColor: palette.ink,
  }),
);
await writeFile(
  primaryLogoReversePath,
  descriptorLockupSvg({
    symbol: symbol.replaceAll(palette.ink, palette.paper),
    wordmark: reverseWordmark,
    title: 'Mecharoon reverse primary logo',
    textColor: palette.paper,
  }),
);
await writeFile(
  primaryLogoMonoPath,
  descriptorLockupSvg({
    symbol: symbolMono,
    wordmark: monoWordmark,
    title: 'Mecharoon monochrome primary logo',
    textColor: palette.ink,
  }),
);
await writeFile(
  primaryLogoMonoReversePath,
  descriptorLockupSvg({
    symbol: symbolReverse,
    wordmark: monoReverseWordmark,
    title: 'Mecharoon reverse monochrome primary logo',
    textColor: palette.paper,
  }),
);

const stackedLockupPath = join(brandDir, 'mecharoon-stacked-lockup.svg');
const stackedReverseLockupPath = join(brandDir, 'mecharoon-stacked-lockup-reverse.svg');
const stackedMonoLockupPath = join(brandDir, 'mecharoon-stacked-lockup-mono.svg');
const stackedMonoReverseLockupPath = join(brandDir, 'mecharoon-stacked-lockup-mono-reverse.svg');
await writeFile(
  stackedLockupPath,
  stackedLockupSvg({
    symbol,
    wordmark,
    title: 'Mecharoon stacked lockup',
  }),
);
await writeFile(
  stackedReverseLockupPath,
  stackedLockupSvg({
    symbol: symbol.replaceAll(palette.ink, palette.paper),
    wordmark: reverseWordmark,
    title: 'Mecharoon reverse stacked lockup',
  }),
);
await writeFile(
  stackedMonoLockupPath,
  stackedLockupSvg({
    symbol: symbolMono,
    wordmark: monoWordmark,
    title: 'Mecharoon monochrome stacked lockup',
  }),
);
await writeFile(
  stackedMonoReverseLockupPath,
  stackedLockupSvg({
    symbol: symbolReverse,
    wordmark: monoReverseWordmark,
    title: 'Mecharoon reverse monochrome stacked lockup',
  }),
);

const bannerWidePath = join(bannerDir, 'mecharoon-banner-1600x600.svg');
const bannerSocialPath = join(bannerDir, 'mecharoon-social-1200x630.svg');
await writeFile(bannerWidePath, bannerSvg({width: 1600, height: 600}, lockup, symbol));
await writeFile(bannerSocialPath, bannerSvg({width: 1200, height: 630, social: true}, lockup, symbol));

const renderJobs = [
  [primaryLogoPath, join(pngDir, 'mecharoon-logo-primary.png'), 2272, 640],
  [primaryLogoReversePath, join(pngDir, 'mecharoon-logo-reverse.png'), 2272, 640],
  [primaryLogoMonoPath, join(pngDir, 'mecharoon-logo-mono.png'), 2272, 640],
  [primaryLogoMonoReversePath, join(pngDir, 'mecharoon-logo-mono-reverse.png'), 2272, 640],
  [lockupPath, join(pngDir, 'mecharoon-logo-compact.png'), 1888, 288],
  [reverseLockupPath, join(pngDir, 'mecharoon-logo-compact-reverse.png'), 1888, 288],
  [monoLockupPath, join(pngDir, 'mecharoon-logo-compact-mono.png'), 1888, 288],
  [monoReverseLockupPath, join(pngDir, 'mecharoon-logo-compact-mono-reverse.png'), 1888, 288],
  [stackedLockupPath, join(pngDir, 'mecharoon-logo-stacked.png'), 1152, 504],
  [stackedReverseLockupPath, join(pngDir, 'mecharoon-logo-stacked-reverse.png'), 1152, 504],
  [stackedMonoLockupPath, join(pngDir, 'mecharoon-logo-stacked-mono.png'), 1152, 504],
  [stackedMonoReverseLockupPath, join(pngDir, 'mecharoon-logo-stacked-mono-reverse.png'), 1152, 504],
  [wordmarkPath, join(pngDir, 'mecharoon-wordmark.png'), 1536, 288],
  [symbolPath, join(pngDir, 'mecharoon-symbol-color-1024.png'), 1024, 1024],
  [join(brandDir, 'mecharoon-symbol-mono.svg'), join(pngDir, 'mecharoon-symbol-mono-1024.png'), 1024, 1024],
  [join(brandDir, 'mecharoon-symbol-reverse.svg'), join(pngDir, 'mecharoon-symbol-reverse-1024.png'), 1024, 1024],
  [join(brandDir, 'mecharoon-symbol-micro-color.svg'), join(pngDir, 'mecharoon-symbol-micro-color-512.png'), 512, 512],
  [join(brandDir, 'mecharoon-symbol-micro-mono.svg'), join(pngDir, 'mecharoon-symbol-micro-mono-512.png'), 512, 512],
  [join(brandDir, 'mecharoon-symbol-micro-reverse.svg'), join(pngDir, 'mecharoon-symbol-micro-reverse-512.png'), 512, 512],
  [join(brandDir, 'mecharoon-symbol-micro-color.svg'), join(pngDir, 'mecharoon-favicon-16.png'), 16, 16],
  [join(brandDir, 'mecharoon-symbol-micro-color.svg'), join(pngDir, 'mecharoon-favicon-20.png'), 20, 20],
  [join(brandDir, 'mecharoon-symbol-micro-color.svg'), join(pngDir, 'mecharoon-favicon-32.png'), 32, 32],
  [join(brandDir, 'mecharoon-symbol-micro-color.svg'), join(pngDir, 'mecharoon-favicon-64.png'), 64, 64],
  [bannerWidePath, join(bannerDir, 'mecharoon-banner-1600x600.png'), 1600, 600],
  [bannerSocialPath, join(bannerDir, 'mecharoon-social-1200x630.png'), 1200, 630],
];

for (const [input, output, width, height] of renderJobs) {
  await render(input, output, width, height);
}

const logoPreview = await sharp(primaryLogoPath).resize(1000, 282).png().toBuffer();
await sharp({
  create: {
    width: 1200,
    height: 440,
    channels: 4,
    background: palette.paper,
  },
})
  .composite([{input: logoPreview, left: 100, top: 79}])
  .png({compressionLevel: 9})
  .toFile(join(pngDir, 'mecharoon-logo-primary-preview.png'));

const pfpSymbol = await sharp(symbolPath).resize(300, 300).png().toBuffer();
const xPfpPath = join(socialDir, 'mecharoon-x-pfp-400.png');
await sharp({
  create: {
    width: 400,
    height: 400,
    channels: 4,
    background: palette.paper,
  },
})
  .composite([{input: pfpSymbol, left: 50, top: 50}])
  .png({compressionLevel: 9})
  .toFile(xPfpPath);

await rm(packageRoot, {recursive: true, force: true});
for (const folder of ['logos', 'symbols', 'banners', 'social', 'guidelines']) {
  await mkdir(join(packageRoot, folder), {recursive: true});
}

const copies = [
  [primaryLogoPath, 'logos/mecharoon-logo-primary.svg'],
  [primaryLogoReversePath, 'logos/mecharoon-logo-reverse.svg'],
  [primaryLogoMonoPath, 'logos/mecharoon-logo-mono.svg'],
  [primaryLogoMonoReversePath, 'logos/mecharoon-logo-mono-reverse.svg'],
  [lockupPath, 'logos/mecharoon-logo-compact.svg'],
  [reverseLockupPath, 'logos/mecharoon-logo-compact-reverse.svg'],
  [monoLockupPath, 'logos/mecharoon-logo-compact-mono.svg'],
  [monoReverseLockupPath, 'logos/mecharoon-logo-compact-mono-reverse.svg'],
  [stackedLockupPath, 'logos/mecharoon-logo-stacked.svg'],
  [stackedReverseLockupPath, 'logos/mecharoon-logo-stacked-reverse.svg'],
  [stackedMonoLockupPath, 'logos/mecharoon-logo-stacked-mono.svg'],
  [stackedMonoReverseLockupPath, 'logos/mecharoon-logo-stacked-mono-reverse.svg'],
  [wordmarkPath, 'logos/mecharoon-wordmark.svg'],
  [join(pngDir, 'mecharoon-logo-primary.png'), 'logos/mecharoon-logo-primary.png'],
  [join(pngDir, 'mecharoon-logo-primary-preview.png'), 'logos/mecharoon-logo-primary-preview.png'],
  [join(pngDir, 'mecharoon-logo-reverse.png'), 'logos/mecharoon-logo-reverse.png'],
  [join(pngDir, 'mecharoon-logo-mono.png'), 'logos/mecharoon-logo-mono.png'],
  [join(pngDir, 'mecharoon-logo-mono-reverse.png'), 'logos/mecharoon-logo-mono-reverse.png'],
  [join(pngDir, 'mecharoon-logo-compact.png'), 'logos/mecharoon-logo-compact.png'],
  [join(pngDir, 'mecharoon-logo-compact-reverse.png'), 'logos/mecharoon-logo-compact-reverse.png'],
  [join(pngDir, 'mecharoon-logo-compact-mono.png'), 'logos/mecharoon-logo-compact-mono.png'],
  [join(pngDir, 'mecharoon-logo-compact-mono-reverse.png'), 'logos/mecharoon-logo-compact-mono-reverse.png'],
  [join(pngDir, 'mecharoon-logo-stacked.png'), 'logos/mecharoon-logo-stacked.png'],
  [join(pngDir, 'mecharoon-logo-stacked-reverse.png'), 'logos/mecharoon-logo-stacked-reverse.png'],
  [join(pngDir, 'mecharoon-logo-stacked-mono.png'), 'logos/mecharoon-logo-stacked-mono.png'],
  [join(pngDir, 'mecharoon-logo-stacked-mono-reverse.png'), 'logos/mecharoon-logo-stacked-mono-reverse.png'],
  [join(pngDir, 'mecharoon-wordmark.png'), 'logos/mecharoon-wordmark.png'],
  [bannerWidePath, 'banners/mecharoon-banner-1600x600.svg'],
  [join(bannerDir, 'mecharoon-banner-1600x600.png'), 'banners/mecharoon-banner-1600x600.png'],
  [bannerSocialPath, 'banners/mecharoon-social-1200x630.svg'],
  [join(bannerDir, 'mecharoon-social-1200x630.png'), 'banners/mecharoon-social-1200x630.png'],
  [xPfpPath, 'social/mecharoon-x-pfp-400.png'],
  [join(root, 'brand.md'), 'guidelines/mecharoon-brand-guide.md'],
  [join(brandDir, 'README.md'), 'README.md'],
];

for (const name of [
  'mecharoon-symbol-color.svg',
  'mecharoon-symbol-mono.svg',
  'mecharoon-symbol-reverse.svg',
  'mecharoon-symbol-micro-color.svg',
  'mecharoon-symbol-micro-mono.svg',
  'mecharoon-symbol-micro-reverse.svg',
]) {
  copies.push([join(brandDir, name), `symbols/${name}`]);
}
for (const name of [
  'mecharoon-symbol-color-1024.png',
  'mecharoon-symbol-mono-1024.png',
  'mecharoon-symbol-reverse-1024.png',
  'mecharoon-symbol-micro-color-512.png',
  'mecharoon-symbol-micro-mono-512.png',
  'mecharoon-symbol-micro-reverse-512.png',
  'mecharoon-favicon-16.png',
  'mecharoon-favicon-20.png',
  'mecharoon-favicon-32.png',
  'mecharoon-favicon-64.png',
]) {
  copies.push([join(pngDir, name), `symbols/${name}`]);
}

for (const [source, destination] of copies) {
  await cp(source, join(packageRoot, destination));
}

await setFixedTimes(packageRoot);
await rm(packagePath, {force: true});
execFileSync('zip', ['-X', '-q', '-r', packagePath, '.'], {cwd: packageRoot});
await rm(packageRoot, {recursive: true, force: true});

console.log(`Brand package exported: ${packagePath}`);
