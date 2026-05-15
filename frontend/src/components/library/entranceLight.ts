// ────────────────────────────────────────────────────────────────────────
//  EntranceLight  ·  Pixi.js v8
//  도서관 입구로 들어오는 자연광 효과 (낮 / 저녁 / 밤)
//
//  4 레이어:
//    1. ambient   — MULTIPLY로 캔버스 전체 톤·어둡기 (시간대 분위기 핵심)
//    2. cone      — 메인 빛 원뿔 (canvas로 베이크한 trapezoidal 그라디언트)
//    3. hotspot   — 입구 바로 아래 radial 핫스팟
//    4. dust      — 빛 속 떠다니는 먼지 입자
//
//  ticker 등록 시: flicker · breathe · dust drift 라이브 애니메이션
//  시간대 전환 시 lerp 보간 (color, alpha, scale 모두)
//
//  Note: god ray 부채꼴(5개) 레이어는 두 번째 디자인 시안 대비 너무
//  강조돼 부드러운 둥근 광원 인상이 깨져서 제거함.
// ────────────────────────────────────────────────────────────────────────

import {
  Application,
  Container,
  Graphics,
  Sprite,
  Texture,
  type Ticker,
} from 'pixi.js'

export type EntrancePresetName = 'day' | 'evening' | 'night'

export interface EntrancePreset {
  label: string
  coneColor: number       // 메인 원뿔 tint
  hotspotColor: number    // 입구 바로 아래 핫스팟 + 먼지 색
  coneAlpha: number
  hotspotAlpha: number
  coneScaleY: number      // 빛이 닿는 거리 (1.0 기준)
  coneSpread: number      // 좌우 퍼짐
  ambientColor: number    // 방 전체에 입혀지는 색조
  ambientAlpha: number    // 색조 입히는 강도
  darkness: number        // 0=원본 / 1=암흑
  dustAlpha: number
  flicker: number         // 매 프레임 random 노이즈 폭
}

export const ENTRANCE_PRESETS: Record<EntrancePresetName, EntrancePreset> = {
  // 낮: 창문으로 밀려드는 따뜻한 직사광 (~4800K)
  day: {
    label: '낮',
    coneColor:    0xFFE9B0,
    hotspotColor: 0xFFF6D8,
    coneAlpha:    0.85,
    hotspotAlpha: 0.60,
    coneScaleY:   1.0,
    coneSpread:   1.30,        // 시안 인상에 맞춰 좌우 넓게 (1.0 → 1.30)
    ambientColor: 0xFFF1D0,
    ambientAlpha: 0.04,
    darkness:     0.0,
    dustAlpha:    0.55,
    flicker:      0.015,
  },
  // 저녁: 노을, 길고 낮게 깔리는 주황빛 (~2200K)
  evening: {
    label: '저녁',
    coneColor:    0xFF9A55,
    hotspotColor: 0xFFC080,
    coneAlpha:    0.72,
    hotspotAlpha: 0.50,
    coneScaleY:   1.20,
    coneSpread:   1.30,        // 1.15 → 1.30
    ambientColor: 0xB54820,
    ambientAlpha: 0.15,        // 0.22 → 0.15
    darkness:     0.10,        // 0.18 → 0.10
    dustAlpha:    0.7,
    flicker:      0.025,
  },
  // 밤: 차가운 달빛 (가구·UI 식별 가능한 어둠)
  // darkness/ambientAlpha를 1차보다 낮춤 — 책장/마루가 시안 톤대로
  // 갈색 그대로 보이게. 빛은 cone 강도/spread를 올려 시각 임팩트 강화.
  night: {
    label: '밤',
    coneColor:    0xC8D8F2,    // 약간 더 중성적 흰빛 (시안 인상에 맞춤)
    hotspotColor: 0xE6EEFA,
    coneAlpha:    0.78,        // 0.55 → 0.78
    hotspotAlpha: 0.58,        // 0.42 → 0.58
    coneScaleY:   1.00,        // 0.92 → 1.00
    coneSpread:   1.30,        // 1.00 → 1.30 (좌우로 더 넓게)
    ambientColor: 0x2E3D5C,
    ambientAlpha: 0.22,        // 0.40 → 0.22
    darkness:     0.10,        // 0.22 → 0.10 (캔버스 톤 유지)
    dustAlpha:    0.55,        // 0.45 → 0.55
    flicker:      0.025,
  },
}

export interface EntranceLightOpts {
  x?: number
  y?: number
  windowWidth?: number
  maxReach?: number
  dustCount?: number
}

interface DustParticle {
  g: Graphics
  ox: number
  depth: number
  drift: number
  driftSpeed: number
  fallSpeed: number
  size: number
}

export class EntranceLight {
  readonly container: Container

  private app: Application
  private cx: number
  private cy: number
  private windowWidth: number
  private maxReach: number

  private ambient: Graphics
  private cone: Sprite
  private hotspot: Sprite
  private dust: Container
  private dustParticles: DustParticle[] = []

  private t = 0
  private cfg: EntrancePreset
  private targetCfg: EntrancePreset | null = null
  private lerpStart: EntrancePreset | null = null
  private lerpT: number | null = null

  private tickerFn: ((ticker: Ticker) => void) | null = null

  constructor(app: Application, opts: EntranceLightOpts = {}) {
    this.app = app
    this.cx = opts.x ?? app.screen.width / 2
    this.cy = opts.y ?? 10
    this.windowWidth = opts.windowWidth ?? 220
    this.maxReach = opts.maxReach ?? 520

    this.container = new Container()
    this.container.sortableChildren = false

    // 1) ambient — MULTIPLY 합성으로 캔버스 전체 톤·어둡기
    this.ambient = new Graphics()
    this.ambient.blendMode = 'multiply'

    // 2) cone — 메인 빛 원뿔 (ADD)
    this.cone = new Sprite(EntranceLight.coneTexture())
    this.cone.anchor.set(0.5, 0)
    this.cone.blendMode = 'add'
    this.cone.x = this.cx
    this.cone.y = this.cy
    this.cone.width = this.windowWidth * 3.4
    this.cone.height = this.maxReach

    // 3) hotspot — 입구 바로 아래 radial 핫스팟
    this.hotspot = new Sprite(EntranceLight.hotspotTexture())
    this.hotspot.anchor.set(0.5, 0.3)
    this.hotspot.blendMode = 'add'
    this.hotspot.x = this.cx
    this.hotspot.y = this.cy + 18
    this.hotspot.width = this.windowWidth * 1.6
    this.hotspot.height = 180

    // 4) dust — 빛 속 떠다니는 먼지 입자
    this.dust = new Container()
    const dustCount = opts.dustCount ?? 28
    for (let i = 0; i < dustCount; i++) {
      const g = new Graphics()
      g.circle(0, 0, 1).fill({ color: 0xFFFFFF, alpha: 1 })
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
    // ambient는 별도 — drawScene에서 stage의 맨 끝에 붙여 모든 요소 위로 깔리게.
    // (cone/hotspot/dust는 입구 부근만이라 이 컨테이너 안에서 순서대로)

    this.cfg = ENTRANCE_PRESETS.day
    this.setPreset('day', true)
  }

  /** ambient를 별도로 노출 — caller가 stage 최상단에 직접 붙임. */
  get ambientLayer(): Graphics {
    return this.ambient
  }

  /** 시간대 전환. instant=false면 ~1초 lerp. */
  setPreset(name: EntrancePresetName, instant = false) {
    const next = ENTRANCE_PRESETS[name]
    if (!next) return
    this.targetCfg = next
    if (instant) {
      this.cfg = { ...next }
      this.applyStatic()
    } else {
      this.lerpStart = { ...this.cfg }
      this.lerpT = 0
    }
  }

  /** ticker 등록 — flicker / dust / lerp가 살아남. */
  attachTicker() {
    if (this.tickerFn) return
    this.tickerFn = (ticker: Ticker) => this.update(ticker.deltaTime)
    this.app.ticker.add(this.tickerFn)
  }

  /** 컴포넌트 unmount 또는 redraw 시 호출. ticker 해제 + 컨테이너 정리. */
  destroy() {
    if (this.tickerFn) {
      this.app.ticker.remove(this.tickerFn)
      this.tickerFn = null
    }
    this.container.destroy({ children: true })
    this.ambient.destroy()
  }

  // ── 정적 적용 ─────────────────────────────────────────
  private applyStatic() {
    const c = this.cfg
    this.cone.tint = c.coneColor
    const coneTex = this.cone.texture
    // scale 직접 설정 (width/height = scale * texture.size)
    this.cone.scale.y = (this.maxReach / coneTex.height) * c.coneScaleY
    this.cone.scale.x = ((this.windowWidth * 3.4) / coneTex.width) * c.coneSpread
    this.hotspot.tint = c.hotspotColor
    this.drawAmbient()
  }

  private drawAmbient() {
    const { ambientColor, ambientAlpha, darkness } = this.cfg
    const w = this.app.screen.width
    const h = this.app.screen.height
    // MULTIPLY: 결과색 = 원본색 × tint.
    //   1) 색조: white→ambientColor 를 ambientAlpha 만큼 섞고
    //   2) 그 결과를 (1-darkness) 만큼 곱해서 전체 톤다운
    const r = ((ambientColor >> 16) & 0xff) / 255
    const g = ((ambientColor >> 8) & 0xff) / 255
    const b = (ambientColor & 0xff) / 255
    const k = 1 - darkness
    const fr = ((1 - ambientAlpha) + ambientAlpha * r) * k
    const fg = ((1 - ambientAlpha) + ambientAlpha * g) * k
    const fb = ((1 - ambientAlpha) + ambientAlpha * b) * k
    const finalColor =
      (Math.round(fr * 255) << 16) |
      (Math.round(fg * 255) << 8) |
      Math.round(fb * 255)
    this.ambient.clear()
    this.ambient.rect(0, 0, w, h).fill({ color: finalColor, alpha: 1 })
  }

  // ── 매 프레임 ─────────────────────────────────────────
  private update(dt: number) {
    this.t += dt

    // 보간
    if (this.lerpT !== null && this.lerpT < 1 && this.lerpStart && this.targetCfg) {
      this.lerpT = Math.min(1, this.lerpT + dt / 60)
      const u = easeInOut(this.lerpT)
      const a = this.lerpStart
      const b = this.targetCfg
      this.cfg = {
        ...b,
        coneAlpha:    lerp(a.coneAlpha,    b.coneAlpha,    u),
        hotspotAlpha: lerp(a.hotspotAlpha, b.hotspotAlpha, u),
        coneScaleY:   lerp(a.coneScaleY,   b.coneScaleY,   u),
        coneSpread:   lerp(a.coneSpread,   b.coneSpread,   u),
        ambientAlpha: lerp(a.ambientAlpha, b.ambientAlpha, u),
        darkness:     lerp(a.darkness,     b.darkness,     u),
        dustAlpha:    lerp(a.dustAlpha,    b.dustAlpha,    u),
        flicker:      lerp(a.flicker,      b.flicker,      u),
        coneColor:    lerpColor(a.coneColor,    b.coneColor,    u),
        hotspotColor: lerpColor(a.hotspotColor, b.hotspotColor, u),
        ambientColor: lerpColor(a.ambientColor, b.ambientColor, u),
      }
      this.applyStatic()
    }

    const c = this.cfg

    // flicker — 창밖 구름·바람 느낌
    const breathe = 1 + Math.sin(this.t * 0.03) * 0.04
    const noise = (Math.random() - 0.5) * c.flicker
    const f = breathe + noise

    this.cone.alpha = c.coneAlpha * f
    this.hotspot.alpha = c.hotspotAlpha * f

    // 먼지 부유
    for (const p of this.dustParticles) {
      p.depth += p.fallSpeed * dt * 0.004
      if (p.depth > 1) p.depth -= 1
      p.drift += p.driftSpeed * dt * 0.01

      const halfW = (this.windowWidth * 0.35) + p.depth * (this.windowWidth * 1.2) * c.coneSpread
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

  // ── 텍스처 베이크 (정적 캐시, 한 번만 생성) ───────────
  private static __cone: Texture | null = null
  private static __hotspot: Texture | null = null

  private static coneTexture(): Texture {
    if (EntranceLight.__cone) return EntranceLight.__cone
    const W = 256
    const H = 384
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, W, H)
    // 행별 horizontal gradient → trapezoidal 빛기둥
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
    // 위→아래 fade (블러 흉내)
    ctx.globalCompositeOperation = 'destination-in'
    const fade = ctx.createLinearGradient(0, 0, 0, H)
    fade.addColorStop(0, 'rgba(0,0,0,1)')
    fade.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = fade
    ctx.fillRect(0, 0, W, H)

    EntranceLight.__cone = Texture.from(c)
    return EntranceLight.__cone
  }

  private static hotspotTexture(): Texture {
    if (EntranceLight.__hotspot) return EntranceLight.__hotspot
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
    EntranceLight.__hotspot = Texture.from(c)
    return EntranceLight.__hotspot
  }
}

// ── 유틸 ─────────────────────────────────────────────────
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

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}
