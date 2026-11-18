// Pixel-art drawing helpers for the desktop pane: builds one SVG string.

const FONT: Record<string, string> = {
  'A': '01110100011000111111100011000110001',
  'B': '11110100011000111110100011000111110',
  'C': '01110100011000010000100001000101110',
  'D': '11110100011000110001100011000111110',
  'E': '11111100001000011110100001000011111',
  'F': '11111100001000011110100001000010000',
  'G': '01110100011000010111100011000101111',
  'H': '10001100011000111111100011000110001',
  'I': '01110001000010000100001000010001110',
  'J': '00111000100001000010000101001001100',
  'K': '10001100101010011000101001001010001',
  'L': '10000100001000010000100001000011111',
  'M': '10001110111010110101100011000110001',
  'N': '10001110011010110011100011000110001',
  'O': '01110100011000110001100011000101110',
  'P': '11110100011000111110100001000010000',
  'Q': '01110100011000110001101011001001101',
  'R': '11110100011000111110101001001010001',
  'S': '01111100001000001110000010000111110',
  'T': '11111001000010000100001000010000100',
  'U': '10001100011000110001100011000101110',
  'V': '10001100011000110001100010101000100',
  'W': '10001100011000110101101011101110001',
  'X': '10001100010101000100010101000110001',
  'Y': '10001100010101000100001000010000100',
  'Z': '11111000010001000100010001000011111',
  '0': '01110100011001110101110011000101110',
  '1': '00100011000010000100001000010001110',
  '2': '01110100010000100010001000100011111',
  '3': '11110000010000101110000010000111110',
  '4': '00010001100101010010111110001000010',
  '5': '11111100001111000001000011000101110',
  '6': '00110010001000011110100011000101110',
  '7': '11111000010001000100010000100001000',
  '8': '01110100011000101110100011000101110',
  '9': '01110100011000101111000010001001100',
  '%': '11000110010001000100010001001100011',
  '.': '00000000000000000000000000000000100',
  '-': '00000000000000011111000000000000000',
  ':': '00000001000010000000001000010000000',
  '!': '00100001000010000100001000000000100',
  '/': '00001000100001000100010000100010000',
  '^': '00000000010001110110111000100000000',
}
const ADV = 6

const ORANGE = '#D97757'
const DARK = '#8a3f25'

function cells(ch: string): Array<[number, number]> {
  const g = FONT[ch]
  const out: Array<[number, number]> = []
  if (!g) return out
  for (let i = 0; i < 35; i++) if (g[i] === '1') out.push([i % 5, Math.floor(i / 5)])
  return out
}

function pixelText(str: string, x: number, y: number, u: number, fill: string): string {
  let out = ''
  let cx = x
  for (const ch of str.toUpperCase()) {
    for (const [c, r] of cells(ch)) {
      out += `<rect x="${cx + c * u}" y="${y + r * u}" width="${u}" height="${u}" fill="${fill}"/>`
    }
    cx += ADV * u
  }
  return out
}

const textWidth = (str: string, u: number) => Math.max(0, str.length * ADV * u - u)

function glowText(str: string, mid: number, y: number, u: number, fill: string, shadow: string): string {
  const x = Math.round(mid - textWidth(str, u) / 2)
  const o = Math.max(1, Math.round(u / 2))
  return pixelText(str, x + o, y + o, u, shadow) + pixelText(str, x, y, u, fill)
}

// Big "brick" lettering like the Claude Code welcome screen. Each pixel is a
// <use> of a shared bordered block (see BRICK_DEFS), so the markup stays small.
const rp = (x: number, y: number, w: number, h: number) => `M${x} ${y}h${w}v${h}h${-w}z`

const BRICK_U = 10
const BRICK_DEFS =
  `<defs><rect id="bk" width="${BRICK_U}" height="${BRICK_U}" fill="${ORANGE}" stroke="#5a2a18" stroke-width="1.5"/>` +
  `<rect id="be" width="${BRICK_U}" height="${BRICK_U}" fill="none" stroke="${DARK}" stroke-width="1.5"/></defs>`

function brickText(str: string, mid: number, y: number, running: boolean): string {
  const u = BRICK_U
  const x0 = Math.round(mid - textWidth(str, u) / 2)
  const echo = Math.max(2, Math.round(u / 3))
  let back = ''
  let front = ''
  let n = 0
  let cx = x0
  for (const ch of str.toUpperCase()) {
    let strip = ''
    for (const [c, r] of cells(ch)) {
      const px = cx + c * u
      const py = y + r * u
      back += `<use href="#be" x="${px + echo}" y="${py + echo}"/>`
      front += `<use href="#bk" x="${px}" y="${py}"/>`
      strip += rp(px + 2, py + 2, u - 4, 3)
    }
    const shine = running
      ? `<animate attributeName="opacity" values="0.9;0.2;0.9" dur="2s" begin="${(n * 0.2).toFixed(1)}s" repeatCount="indefinite"/>`
      : ''
    front += `<path d="${strip}" fill="#F7C0A8" opacity="0.8">${shine}</path>`
    n++
    cx += ADV * u
  }
  return back + front
}

// Outlined, gradient, bevelled pixel text: a thick dark outline, a soft
// drop shadow, row-by-row colour and a bright top edge on every block.
const GRAD_ORANGE = ['#FFE1D2', '#FBC3AB', '#F2A98C', '#E58B68', '#D97757', '#C4623F', '#A9502F']
const GRAD_LIGHT = ['#FFFFFF', '#F6EFEB', '#EADFD9', '#DDD0C9', '#CFC1B9', '#C0B2A9', '#B0A298']

function fancyText(str: string, mid: number, y: number, u: number, grad: string[], outline: string): string {
  const x0 = Math.round(mid - textWidth(str, u) / 2)
  const o = Math.max(1, Math.round(u / 4))
  let shadow = ''
  let edge = ''
  let hi = ''
  const rows: string[] = ['', '', '', '', '', '', '']
  let cx = x0
  for (const ch of str.toUpperCase()) {
    for (const [c, r] of cells(ch)) {
      const px = cx + c * u
      const py = y + r * u
      shadow += rp(px + o * 2, py + o * 2, u, u)
      edge += rp(px - o, py - o, u + o * 2, u + o * 2)
      rows[r] += rp(px, py, u, u)
      hi += rp(px, py, u, Math.max(1, Math.round(u / 5)))
    }
    cx += ADV * u
  }
  return (
    `<path d="${shadow}" fill="#000" opacity="0.28"/>` +
    `<path d="${edge}" fill="${outline}"/>` +
    rows.map((d, r) => (d ? `<path d="${d}" fill="${grad[r]}"/>` : '')).join('') +
    `<path d="${hi}" fill="#fff" opacity="0.45"/>`
  )
}

// Claude Code mascot, 16 x 11 pixels. # body, k eye.
const SPRITE = [
  '..############..',
  '..############..',
  '..##k######k##..',
  '..##k######k##..',
  '..############..',
  '################',
  '################',
  '..############..',
  '..############..',
  '...#.#....#.#...',
  '...#.#....#.#...',
]

type Mode = 'idle' | 'run' | 'done'

const LEG_COLS = [3, 5, 10, 12]

function sprite(u: number, mode: Mode): string {
  const HI = '#EE9F84'
  const LO = '#BF5B39'
  const hot = mode !== 'idle'
  let body = ''
  let eyes = ''
  let legs = ''
  let armL = ''
  let armR = ''
  SPRITE.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]
      if (ch === '.') continue
      const cell = (fill: string) => `<rect x="${c * u}" y="${r * u}" width="${u}" height="${u}" fill="${fill}"/>`
      const isArm = (r === 5 || r === 6) && (c <= 1 || c >= 14)
      if (ch === 'k') {
        eyes += cell('#000000')
        eyes += `<rect x="${c * u}" y="${r * u}" width="${Math.round(u * 0.4)}" height="${Math.round(u * 0.4)}" fill="#fff" opacity="${r === 2 ? 0.9 : 0}"/>`
      } else if (r >= 9) legs += cell(LO)
      else if (isArm) {
        const f = r === 5 ? HI : LO
        if (c <= 1) armL += cell(f)
        else armR += cell(f)
      } else body += cell(r === 0 ? HI : r === 8 ? LO : ORANGE)
    }
  })
  // Hot modes: swap the eyes for a visor with a glint that sweeps across.
  if (hot) {
    eyes =
      `<rect x="${3 * u}" y="${2 * u}" width="${10 * u}" height="${2 * u}" fill="#0b0b0e"/>` +
      `<rect x="${3 * u}" y="${2 * u}" width="${10 * u}" height="${Math.round(u * 0.4)}" fill="#3a4a66"/>` +
      `<rect x="${4 * u}" y="${Math.round(2.6 * u)}" width="${u * 2}" height="${Math.round(u * 0.4)}" fill="#7fd0ff" opacity="0.8"/>` +
      `<rect x="${3 * u}" y="${2 * u}" width="${Math.round(u * 0.8)}" height="${2 * u}" fill="#fff" opacity="0.85"><animate attributeName="x" values="${3 * u};${12 * u};${3 * u}" dur="1.8s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;0.9;0" dur="1.8s" repeatCount="indefinite"/></rect>`
  }
  const t = (v: string, dur: string) =>
    `<animateTransform attributeName="transform" type="translate" values="${v}" dur="${dur}" repeatCount="indefinite" calcMode="discrete"/>`
  const h = Math.round(u / 2)
  let bounce = ''
  let aL = ''
  let aR = ''
  let lg = ''
  let flame = ''
  const jet = (vals: string, dur: string) => {
    const frames = vals.split(';')
    let out = ''
    for (const col of LEG_COLS) {
      out +=
        `<g opacity="0"><animate attributeName="opacity" values="${vals}" dur="${dur}" repeatCount="indefinite" calcMode="discrete"/>` +
        `<rect x="${col * u}" y="${11 * u}" width="${u}" height="${2 * u}" fill="#FF8A3D"><animate attributeName="height" values="${u};${2 * u};${3 * u};${2 * u}" dur="0.2s" repeatCount="indefinite" calcMode="discrete"/></rect>` +
        `<rect x="${col * u}" y="${11 * u}" width="${u}" height="${u}" fill="#FFE29A"/></g>`
    }
    return frames.length ? out : ''
  }
  if (mode === 'run') {
    const d = '0.9s'
    bounce = t([0, -2, -4, -6, -4, -2, 0, 0].map(n => `0 ${n * u}`).join(';'), d)
    aL = t([0, -2, 1, -2, 1, -2, 0, 0].map(n => `0 ${n * u}`).join(';'), d)
    aR = t([0, 1, -2, 1, -2, 1, 0, 0].map(n => `0 ${n * u}`).join(';'), d)
    lg = t([0, -1, -1, -1, -1, -1, 0, 0].map(n => `0 ${n * u}`).join(';'), d)
    flame = jet('0;1;1;1;1;1;0;0', d)
  } else if (mode === 'done') {
    const d = '1.6s'
    bounce = t([0, -3, -6, -8, -9, -8, -6, -3, 0, 0].map(n => `0 ${n * u}`).join(';'), d)
    aL = t(`0 ${-3 * u};0 ${-4 * u};0 ${-3 * u};0 ${-4 * u}`, '0.4s')
    aR = t(`0 ${-4 * u};0 ${-3 * u};0 ${-4 * u};0 ${-3 * u}`, '0.4s')
    lg = t([0, -1, -1, -1, -1, -1, -1, -1, 0, 0].map(n => `0 ${n * u}`).join(';'), d)
    flame = jet('0;1;1;1;1;1;1;1;0;0', d)
  } else {
    bounce = t(`0 0;0 ${-h};0 0;0 0`, '1.8s')
    aL = t(`0 0;0 ${-u};0 0;0 ${u}`, '1.8s')
    aR = t(`0 ${u};0 0;0 ${-u};0 0`, '1.8s')
  }
  const look = `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;${-u} 0;${-u} 0;0 0;${u} 0;${u} 0;0 0" dur="4s" repeatCount="indefinite" calcMode="discrete"/>`
  const blink = `<animate attributeName="opacity" values="1;1;1;1;0;1;1;1;1;1" dur="3.2s" repeatCount="indefinite" calcMode="discrete"/>`
  const spark =
    mode === 'done'
      ? `<rect x="${u * 5}" y="${u * 0}" width="${u}" height="${u}" fill="#FFF6EE"><animate attributeName="opacity" values="1;0;1" dur="0.5s" repeatCount="indefinite"/></rect>`
      : ''
  return (
    `<g>${bounce}${flame}` +
    `<g>${aL}${armL}</g>` +
    `<g>${aR}${armR}</g>` +
    body +
    (hot ? eyes : `<g>${blink}<g>${look}${eyes}</g></g>`) +
    `<g>${lg}${legs}</g>${spark}</g>`
  )
}

function confetti(on: boolean, W: number, H: number): string {
  if (!on) return ''
  const cols = ['#F2A98C', '#FFE9DD', '#D97757', '#8fd694', '#8ec5ff', '#ffd166']
  let out = ''
  for (let i = 0; i < 26; i++) {
    const x = 12 + ((i * 53) % (W - 24))
    const sz = 6 + (i % 3) * 2
    const dur = 2.2 + (i % 5) * 0.4
    const begin = ((i * 0.17) % 2).toFixed(2)
    out += `<rect x="${x}" y="180" width="${sz}" height="${sz}" fill="${cols[i % cols.length]}" opacity="0.95"><animate attributeName="y" values="180;${H - 30}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;1;0" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></rect>`
  }
  return out
}

export function pixelScene(p: number, label: string, running: boolean, was = 0): string {
  const W = 440
  const H = 566
  const U = 10
  const MY = 262
  const done = label === 'Done'
  const mode: Mode = done ? 'done' : running ? 'run' : 'idle'
  const A = (el: string) => (running ? el : '')
  const spriteW = SPRITE[0]!.length * U
  const segs = 20
  const lit = Math.round((p / 100) * segs)
  const wasLit = Math.min(lit, Math.round((was / 100) * segs))
  const segW = 18
  const gap = 3
  const barW = segs * (segW + gap) - gap
  const bx = Math.round((W - barW) / 2)
  const BY = 408
  const BH = 26
  let bar = ''
  for (let i = 0; i < segs; i++) {
    const x = bx + i * (segW + gap)
    if (i < lit) {
      const t = i / (segs - 1)
      const col = t < 0.5 ? '#C4623F' : t < 0.8 ? ORANGE : '#F2A98C'
      const sweep = i >= wasLit ? `<animate attributeName="opacity" values="0;1" dur="0.25s" begin="${((i - wasLit) * 0.07).toFixed(2)}s" fill="freeze"/>` : ''
      bar += `<rect x="${x}" y="${BY}" width="${segW}" height="${BH}" fill="${col}" ${i >= wasLit ? 'opacity="0"' : ''}>${sweep}${A(`<animate attributeName="opacity" values="1;0.55;1" dur="1.6s" begin="${(i * 0.08).toFixed(2)}s" repeatCount="indefinite"/>`)}</rect>`
      bar += `<rect x="${x}" y="${BY}" width="${segW}" height="5" fill="#fff" opacity="0.25"/>`
    } else {
      const next = i === lit && running
      bar += `<rect x="${x}" y="${BY}" width="${segW}" height="${BH}" fill="${next ? '#F2A98C' : '#8a8a8a'}" opacity="${next ? 0.9 : 0.22}">${next ? '<animate attributeName="opacity" values="0.9;0.15;0.9" dur="0.6s" repeatCount="indefinite"/>' : ''}</rect>`
    }
  }
  const pct = `${p}%`
  const sub = (label || '').toUpperCase().slice(0, 18)
  const stars = running || done
    ? [[24, 268], [410, 258], [44, 358], [396, 348], [78, 238], [362, 240], [220, 232]]
        .map(([x, y], i) => `<rect x="${x}" y="${y}" width="6" height="6" fill="#F2A98C"><animate attributeName="opacity" values="0;1;0" dur="1.2s" begin="${(i * 0.25).toFixed(2)}s" repeatCount="indefinite"/></rect>`)
        .join('')
    : ''
  const dur = mode === 'run' ? '0.9s' : '1.6s'
  const wv = mode === 'run' ? [12, 11, 9, 7, 9, 11, 12, 12] : [12, 10, 8, 6, 5, 6, 8, 10, 12, 12]
  const shadowAnim =
    mode === 'idle'
      ? ''
      : `<animate attributeName="width" values="${wv.map(n => n * U).join(';')}" dur="${dur}" repeatCount="indefinite" calcMode="discrete"/><animate attributeName="x" values="${wv.map(n => (8 - n / 2) * U).join(';')}" dur="${dur}" repeatCount="indefinite" calcMode="discrete"/>`
  const dust =
    mode === 'idle'
      ? ''
      : [-1, 1]
          .map(
            sd =>
              `<rect x="${8 * U}" y="${SPRITE.length * U - 2}" width="${U}" height="${U / 2}" fill="#E9D5CB" opacity="0"><animate attributeName="opacity" values="${wv.map((_, i) => (i === wv.length - 2 ? 0.9 : 0)).join(';')}" dur="${dur}" repeatCount="indefinite" calcMode="discrete"/><animate attributeName="x" values="${wv.map((_, i) => (i === wv.length - 2 ? 8 * U + sd * 6 * U : 8 * U)).join(';')}" dur="${dur}" repeatCount="indefinite" calcMode="discrete"/></rect>`,
          )
          .join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">` +
    BRICK_DEFS +
    brickText('CLAUDE', W / 2, 10, running) +
    brickText('CODE', W / 2, 92, running) +
    stars +
    (running || done
      ? `<defs><radialGradient id="aura"><stop offset="0" stop-color="${done ? '#8fd694' : '#D97757'}" stop-opacity="0.45"/><stop offset="1" stop-color="#D97757" stop-opacity="0"/></radialGradient></defs><circle cx="${W / 2}" cy="${MY + 60}" r="140" fill="url(#aura)" shape-rendering="geometricPrecision"><animate attributeName="r" values="115;150;115" dur="1.2s" repeatCount="indefinite"/></circle>`
      : '') +
    confetti(done, W, H) +
    `<g transform="translate(${Math.round((W - spriteW) / 2)},${MY})">` +
    `<rect x="${U * 2}" y="${SPRITE.length * U + 4}" width="${U * 12}" height="6" fill="#000" opacity="0.25">${shadowAnim}</rect>` +
    dust +
    sprite(U, mode) +
    `</g>` +
    `<rect x="${bx - 8}" y="${BY - 8}" width="${barW + 16}" height="${BH + 16}" fill="#808080" opacity="0.18"/>` +
    bar +
    fancyText(done ? `^ ${pct}` : pct, W / 2, 454, 8, GRAD_ORANGE, '#2a130b') +
    fancyText(sub, W / 2, 524, 4, GRAD_LIGHT, '#1c1c20') +
    `</svg>`
  )
}
