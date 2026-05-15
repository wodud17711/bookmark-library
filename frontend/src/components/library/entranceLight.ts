import {
  Application,
  Container,
  Graphics,
  Sprite,
  Texture,
  type Ticker,
} from 'pixi.js'

// ── 외부 노출 타입 ───────────────────────────────────
export type EntrancePresetName = 'day' | 'evening' | 'night'

export interface EntrancePreset {
  label: string
  coneColor: number
  hotspotColor: number
  coneAlpha: number
  hotspotAlpha: number
  coneScaleY: number
  coneSpread: number
  ambientColor: number
  ambientAlpha: number
  darkness: number
  dustAlpha: number
  flicker: number
  // ※ 새 필드 추가 시 lerpPreset()의 보간 블록도 같이 갱신할 것
}

export const ENTRANCE_PRESETS: Record<EntrancePresetName, EntrancePreset> = {
  // ── 낮 : 창문으로 밀려드는 따뜻한 직사광 ──────────────────────
  day: {
    label: '낮',
    coneColor: 0xffe9b0,
    hotspotColor: 0xfff6d8,
    coneAlpha: 0.78,
    hotspotAlpha: 0.55,
    coneScaleY: 1.0,
    coneSpread: 1.0,
    ambientColor: 0xfff1d0,
    ambientAlpha: 0.06,
    darkness: 0.0,
    dustAlpha: 0.55,
    flicker: 0.015,
  },
  // ── 저녁 : 노을, 길고 낮게 깔리는 주황빛 ──────────────────────
  evening: {
    label: '저녁',
    coneColor: 0xff8a45,
    hotspotColor: 0xffb070,
    coneAlpha: 0.62,
    hotspotAlpha: 0.42,
    coneScaleY: 1.25,
    coneSpread: 1.15,
    ambientColor: 0xc04020,
    ambientAlpha: 0.22,
    darkness: 0.18,
    dustAlpha: 0.7,
    flicker: 0.025,
  },
  // ── 밤 : 달빛, 차갑게 (바닥까지 식별 가능한 어둠) ──────────────
  night: {
    label: '밤',
    coneColor: 0xa8c4ed,
    hotspotColor: 0xd4e2f6,
    coneAlpha: 0.55,
    hotspotAlpha: 0.42,
    coneScaleY: 0.92,
    coneSpread: 1.0,
    ambientColor: 0x2a3a5e,
    ambientAlpha: 0.4,
    darkness: 0.22,
    dustAlpha: 0.45,
    flicker: 0.03,
  },
}

export interface EntranceLightOpts {
  x?: number
  y?: number
  windowWidth?: number
  maxReach?: number
  dustCount?: number
}

// ── 내부 타입 ────────────────────────────────────────
interface DustParticle {
  g: Graphics
  ox: number
  depth: number
  drift: number
  driftSpeed: number
  fallSpeed: number
  size: number
}

// ────────────────────────────────────────────────────────────────────
//  EntranceLight  ·  창문에서 들어오는 자연광 (낮 / 저녁 / 밤)
//
//  레이어 구성:
//    container        — cone + hotspot + dust (입구 부근)
//    ambientLayer     — 캔버스 전체 multiply ambient (분리)
// ────────────────────────────────────────────────────────────────────
export class EntranceLight {
  readonly container: Container

  private readonly app: Application
  private readonly cx: number
  private readonly cy: number
  private readonly windowWidth: number
  private readonly maxReach: number

  private readonly cone: Sprite
  private readonly hotspot: Sprite
  private readonly dust: Container
  private readonly dustParticles: DustParticle[] = []
  private readonly ambient: Graphics

  private cfg: EntrancePreset
  private lerpStart: EntrancePreset | null = null
  private lerpTarget: EntrancePreset | null = null
  private lerpT = 1

  private t = 0
  private tickerFn: ((ticker: Ticker) => void) | null = null

  // ── 정적 텍스처 캐시 (모든 인스턴스 공유) ─────────────
  private static __coneTex: Texture | null = null
  private static __hotspotTex: Texture | null = null

  constructor(app: Application, opts: EntranceLightOpts = {}) {
    this.app = app
    this.cx = opts.x ?? app.screen.width / 2
    this.cy = opts.y ?? 10
    this.windowWidth = opts.windowWidth ?? 220
    this.maxReach = opts.maxReach ?? 520

    this.container = new Container()

    // 1) 빛 원뿔 (additive)
    this.cone = new Sprite(EntranceLight.getConeTexture())
    this.cone.anchor.set(0.5, 0)
    this.cone.blendMode = 'add'
    this.cone.x = this.cx
    this.cone.y = this.cy
    this.cone.width = this.windowWidth * 3.4
    this.cone.height = this.maxReach

    // 2) 창문 바로 아래 핫스팟 (additive)
    this.hotspot = new Sprite(EntranceLight.getHotspotTexture())
    this.hotspot.anchor.set(0.5, 0.3)
    this.hotspot.blendMode = 'add'
    this.hotspot.x = this.cx
    this.hotspot.y = this.cy + 18
    this.hotspot.width = this.windowWidth * 1.6
    this.hotspot.height = 180

    // 3) 먼지 (god ray 속이 아닌 cone 안에서 부유)
    this.dust = new Container()
    const dustCount = opts.dustCount ?? 28
    for (let i = 0; i < dustCount; i++) {
      const g = new Graphics().circle(0, 0, 1).fill(0xffffff)
      g.blendMode = 'add'
      this.dust.addChild(g)
      this.dustParticles.push({
        g,
        ox: (Math.random() - 0.5) * this.windowWidth * 0.9,
        depth: Math.random(),
        drift: Math.random() * Math.PI * 2,
        driftSpeed: 0.4 + Math.random() * 0.6,
        fallSpeed: 0.08 + Math.random() * 0.18,
        size: 0.6 + Math.random() * 1.6,
      })
    }

    this.container.addChild(this.cone, this.hotspot, this.dust)

    // 4) ambient (multiply) — container와 분리되어 노출
    this.ambient = new Graphics()
    this.ambient.blendMode = 'multiply'

    this.cfg = { ...ENTRANCE_PRESETS.day }
    this.applyStatic()
  }

  get ambientLayer(): Graphics {
    return this.ambient
  }

  // ── 시간대 전환 ────────────────────────────────────
  setPreset(name: EntrancePresetName, instant = false): void {
    const next = ENTRANCE_PRESETS[name]
    if (!next) return
    if (instant) {
      this.cfg = { ...next }
      this.lerpStart = null
      this.lerpTarget = null
      this.lerpT = 1
      this.applyStatic()
    } else {
      this.lerpStart = { ...this.cfg }
      this.lerpTarget = next
      this.lerpT = 0
    }
  }

  // ── 매 프레임 ──────────────────────────────────────
  attachTicker(): void {
    if (this.tickerFn) return
    this.tickerFn = (ticker: Ticker) => this.update(ticker.deltaTime)
    this.app.ticker.add(this.tickerFn)
  }

  destroy(): void {
    if (this.tickerFn) {
      this.app.ticker.remove(this.tickerFn)
      this.tickerFn = null
    }
    this.container.destroy({ children: true })
    this.ambient.destroy()
  }

  // ── 내부 ───────────────────────────────────────────
  private update(dt: number): void {
    this.t += dt

    // 1) lerp 보간
    if (this.lerpT < 1 && this.lerpStart && this.lerpTarget) {
      this.lerpT = Math.min(1, this.lerpT + dt / 60)
      const u = easeInOut(this.lerpT)
      this.cfg = lerpPreset(this.lerpStart, this.lerpTarget, u)
      this.applyStatic()
      if (this.lerpT >= 1) {
        this.cfg = { ...this.lerpTarget }
        this.lerpStart = null
        this.lerpTarget = null
      }
    }

    // 2) flicker + breathe
    const c = this.cfg
    const breathe = 1 + Math.sin(this.t * 0.03) * 0.04
    const noise = (Math.random() - 0.5) * c.flicker
    const f = breathe + noise
    this.cone.alpha = c.coneAlpha * f
    this.hotspot.alpha = c.hotspotAlpha * f

    // 3) 먼지 부유
    for (const p of this.dustParticles) {
      p.depth += p.fallSpeed * dt * 0.004
      if (p.depth > 1) p.depth -= 1
      p.drift += p.driftSpeed * dt * 0.01

      const halfW =
        this.windowWidth * 0.35 +
        p.depth * (this.windowWidth * 1.2) * c.coneSpread
      const localX = p.ox * (0.6 + p.depth * 1.4) + Math.sin(p.drift) * 6
      const py = this.cy + p.depth * this.maxReach * c.coneScaleY
      const horizFade = Math.max(0, 1 - Math.abs(localX) / halfW)
      const fade = horizFade * (1 - p.depth) * c.dustAlpha
      p.g.x = this.cx + localX
      p.g.y = py
      p.g.scale.set(p.size * (0.4 + p.depth * 0.9))
      p.g.alpha = fade
      p.g.tint = c.hotspotColor
    }
  }

  private applyStatic(): void {
    const c = this.cfg
    this.cone.tint = c.coneColor
    this.cone.scale.y =
      (this.maxReach / this.cone.texture.height) * c.coneScaleY
    this.cone.scale.x =
      ((this.windowWidth * 3.4) / this.cone.texture.width) * c.coneSpread
    this.hotspot.tint = c.hotspotColor
    this.drawAmbient()
  }

  private drawAmbient(): void {
    const { ambientColor, ambientAlpha, darkness } = this.cfg
    const w = this.app.screen.width
    const h = this.app.screen.height
    const r = ((ambientColor >> 16) & 0xff) / 255
    const g = ((ambientColor >> 8) & 0xff) / 255
    const b = (ambientColor & 0xff) / 255
    const k = 1 - darkness
    const fr = (1 - ambientAlpha + ambientAlpha * r) * k
    const fg = (1 - ambientAlpha + ambientAlpha * g) * k
    const fb = (1 - ambientAlpha + ambientAlpha * b) * k
    const finalColor =
      (Math.round(fr * 255) << 16) |
      (Math.round(fg * 255) << 8) |
      Math.round(fb * 255)
    this.ambient.clear()
    this.ambient.rect(0, 0, w, h).fill(finalColor)
  }

  // ── 텍스처 베이크 (정적 캐시) ──────────────────────
  private static getConeTexture(): Texture {
    if (EntranceLight.__coneTex) return EntranceLight.__coneTex
    const W = 256
    const H = 384
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')!
    for (let y = 0; y < H; y++) {
      const t = y / H
      const vert = Math.pow(1 - t, 1.4)
      const halfW = W * 0.12 + t * W * 0.46
      const cx = W / 2
      const grad = ctx.createLinearGradient(cx - halfW, 0, cx + halfW, 0)
      grad.addColorStop(0, 'rgba(255,255,255,0)')
      grad.addColorStop(0.45, `rgba(255,255,255,${vert * 0.85})`)
      grad.addColorStop(0.5, `rgba(255,255,255,${vert})`)
      grad.addColorStop(0.55, `rgba(255,255,255,${vert * 0.85})`)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad
      ctx.fillRect(cx - halfW, y, halfW * 2, 1)
    }
    ctx.globalCompositeOperation = 'destination-in'
    const fade = ctx.createLinearGradient(0, 0, 0, H)
    fade.addColorStop(0, 'rgba(0,0,0,1)')
    fade.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = fade
    ctx.fillRect(0, 0, W, H)
    EntranceLight.__coneTex = Texture.from(c)
    return EntranceLight.__coneTex
  }

  private static getHotspotTexture(): Texture {
    if (EntranceLight.__hotspotTex) return EntranceLight.__hotspotTex
    const S = 256
    const c = document.createElement('canvas')
    c.width = c.height = S
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(S / 2, S * 0.35, 4, S / 2, S * 0.35, S / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
    g.addColorStop(0.55, 'rgba(255,255,255,0.18)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
    EntranceLight.__hotspotTex = Texture.from(c)
    return EntranceLight.__hotspotTex
  }
}

// ── 헬퍼 ─────────────────────────────────────────────
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  return (
    (Math.round(lerp(ar, br, t)) << 16) |
    (Math.round(lerp(ag, bg, t)) << 8) |
    Math.round(lerp(ab, bb, t))
  )
}

// ※ EntrancePreset에 새 필드 추가하면 여기도 같이 갱신할 것
function lerpPreset(a: EntrancePreset, b: EntrancePreset, t: number): EntrancePreset {
  return {
    label: b.label,
    coneColor: lerpColor(a.coneColor, b.coneColor, t),
    hotspotColor: lerpColor(a.hotspotColor, b.hotspotColor, t),
    coneAlpha: lerp(a.coneAlpha, b.coneAlpha, t),
    hotspotAlpha: lerp(a.hotspotAlpha, b.hotspotAlpha, t),
    coneScaleY: lerp(a.coneScaleY, b.coneScaleY, t),
    coneSpread: lerp(a.coneSpread, b.coneSpread, t),
    ambientColor: lerpColor(a.ambientColor, b.ambientColor, t),
    ambientAlpha: lerp(a.ambientAlpha, b.ambientAlpha, t),
    darkness: lerp(a.darkness, b.darkness, t),
    dustAlpha: lerp(a.dustAlpha, b.dustAlpha, t),
    flicker: lerp(a.flicker, b.flicker, t),
  }
}
