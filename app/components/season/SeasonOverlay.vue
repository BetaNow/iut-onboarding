<script setup lang="ts">
// Falling particles and the material on each window's top edge, on one canvas.
// They have to interleave: snow covers the flakes landing in it, and the grass
// bends in a wave crossing the whole desktop, neither of which a CSS
// pseudo-element inside a window's stacking context can do.
//
// The stage is always 1920x1080 and only CSS-scaled, so the canvas is sized once.
// The loop stops on a hidden tab and draws one still frame for
// prefers-reduced-motion, since the panel runs for weeks unattended.
import type { Season } from '~/utils/season'

const props = defineProps<{ season: Season }>()

const STAGE_WIDTH = 1920
const STAGE_HEIGHT = 1080
const TAU = Math.PI * 2

const SPRITE_BASE = '/img/assets'
/** Sprites are pre-scaled to this once, so no frame ever samples the 2000px source. */
const SPRITE_SIZE = 72
/** Pre-rendered bend states for a crest that moves in the wind. */
const WIND_STATES = 21
/** Width of one crest slice. A divisor of every tile width, so slices never wrap. */
const SEGMENT = 64

interface ParticleSpec {
  dir: string
  files: string[]
  count: number
  /** All ranges are [min, max]. */
  size: [number, number]
  /** Fall speed, stage px per second. */
  speed: [number, number]
  /** Horizontal sway amplitude, stage px. */
  sway: [number, number]
  swaySpeed: [number, number]
  /** Rotation while falling, radians per second. */
  spin: [number, number]
  alpha: [number, number]
  // How long a particle stays put once it lands, seconds. Omitted means it is
  // absorbed on contact: it fades where it touched and falls again.
  settle?: [number, number]
  // Where the material a particle lands on sits, relative to the surface's top
  // edge. Positive is the window edge, negative the crown of the crest above it.
  // Contact is tested against this line.
  contactOffset: number
  /** Fade-out duration, ms. */
  fade: number
  // How fast a particle keeps sinking while it fades, px per second. Reads as
  // the drift drawing it in rather than the particle blinking out.
  sink?: number
  // Halo baked in behind the sprite. The flakes are almost white and would
  // otherwise vanish against the white document wells.
  halo?: string
}

interface WindSpec {
  /** Peak lean of the tips, degrees. */
  amplitude: number
  /** Distance between gust crests, stage px. */
  wavelength: number
  /** How fast a gust travels, radians per second. */
  speed: number
  /** Rate of the slower envelope that swells and drops the whole field. */
  gust: number
}

interface CrestSpec {
  src: string
  tileWidth: number
  height: number
  wind?: WindSpec
}

interface SeasonSpec {
  particles?: ParticleSpec
  crest?: CrestSpec
}

const SPECS: Record<Season, SeasonSpec> = {
  spring: {
    particles: {
      dir: 'spring',
      files: ['leaves_1.png', 'leaves_2.png', 'leaves_3.png'],
      count: 80,
      size: [22, 40],
      speed: [30, 62],
      sway: [40, 80],
      swaySpeed: [0.4, 0.9],
      spin: [-1.2, 1.2],
      alpha: [0.85, 1],
      settle: [18, 40],
      contactOffset: 2,
      fade: 900,
    },
  },
  summer: {
    crest: {
      src: '/season/crest-grass.svg',
      tileWidth: 320,
      height: 40,
      wind: {
        amplitude: 7,
        wavelength: 520,
        speed: 1.15,
        gust: 0.24,
      },
    },
  },
  autumn: {
    particles: {
      dir: 'autumn',
      files: ['leaves_1.png', 'leaves_2.png', 'leaves_3.png'],
      count: 90,
      size: [24, 44],
      speed: [45, 95],
      sway: [30, 70],
      swaySpeed: [0.5, 1.1],
      spin: [-1.6, 1.6],
      alpha: [0.9, 1],
      settle: [18, 40],
      contactOffset: 2,
      fade: 900,
    },
  },
  winter: {
    particles: {
      dir: 'winter',
      files: ['flake_1.png', 'flake_2.png', 'flake_3.png'],
      count: 85,
      size: [14, 28],
      speed: [25, 55],
      sway: [12, 30],
      swaySpeed: [0.3, 0.7],
      spin: [-0.35, 0.35],
      alpha: [0.75, 1],
      // No settle: a flake is taken by the drift the moment it touches. Contact
      // is the crown of the snow, not the window edge 22px below it.
      contactOffset: -22,
      fade: 650,
      sink: 20,
      halo: 'rgba(74, 116, 158, 0.7)',
    },
    crest: {
      src: '/season/crest-snow.svg',
      tileWidth: 320,
      height: 32,
    },
  },
}

/** A window top edge (or the taskbar's) that particles can land on. */
interface Surface {
  x: number
  y: number
  w: number
  h: number
  z: number
}

type ParticleState = 'falling' | 'settled' | 'fading'

interface Particle {
  x: number
  y: number
  size: number
  speed: number
  sway: number
  swayPhase: number
  swaySpeed: number
  spin: number
  angle: number
  alpha: number
  sprite: number
  state: ParticleState
  /** Index into `surfaces`, or -1 while falling. */
  surface: number
  restX: number
  restY: number
  /** Timestamps, ms. */
  settleUntil: number
  fadeFrom: number
}

const canvas = ref<HTMLCanvasElement | null>(null)

let context: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let surfaces: Surface[] = []
let sprites: HTMLCanvasElement[] = []
let crestTiles: HTMLCanvasElement[] = []
let frameHandle = 0
let lastFrame = 0
let reducedMotion = false
/** Guards against a season change landing after a slower asset load resolves. */
let loadToken = 0

function between([min, max]: [number, number]) {
  return min + Math.random() * (max - min)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

// ---------------------------------------------------------------- assets

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`season asset failed to load: ${src}`))
    image.src = src
  })
}

// Bakes a source PNG down to sprite size once, with its halo if it needs one.
// The sources are ~2000px; rescaling them every frame would be ruinous.
function prerenderSprite(image: HTMLImageElement, halo?: string) {
  const scale = SPRITE_SIZE / Math.max(image.width, image.height)
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const pad = halo ? 4 : 0

  const target = document.createElement('canvas')
  target.width = width + pad * 2
  target.height = height + pad * 2

  const ctx = target.getContext('2d')
  if (!ctx) {
    return target
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  if (halo) {
    ctx.shadowColor = halo
    ctx.shadowBlur = 3
    // Twice, because one pass is too faint to separate white-on-white.
    ctx.drawImage(image, pad, pad, width, height)
    ctx.drawImage(image, pad, pad, width, height)
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
  }

  ctx.drawImage(image, pad, pad, width, height)
  return target
}

// One tile per bend state, sheared from the roots up. Pre-rendering them means a
// gust costs one drawImage per slice per frame instead of redrawing several
// hundred blades. Each tile draws the source three times side by side, so blades
// sheared past one edge arrive from the other and the tile still repeats.
function buildCrestTiles(image: HTMLImageElement, spec: CrestSpec) {
  const states = spec.wind ? WIND_STATES : 1
  const tiles: HTMLCanvasElement[] = []

  for (let index = 0; index < states; index += 1) {
    const tile = document.createElement('canvas')
    tile.width = spec.tileWidth
    tile.height = spec.height

    const ctx = tile.getContext('2d')
    if (!ctx) {
      continue
    }

    ctx.imageSmoothingEnabled = false

    let shear = 0
    if (spec.wind && states > 1) {
      const ratio = (index / (states - 1)) * 2 - 1
      shear = Math.tan((spec.wind.amplitude * ratio * Math.PI) / 180)
    }

    // Anchored at the bottom: roots stay put, tips lean.
    ctx.setTransform(1, 0, -shear, 1, shear * spec.height, 0)

    for (const offset of [-spec.tileWidth, 0, spec.tileWidth]) {
      ctx.drawImage(image, offset, 0, spec.tileWidth, spec.height)
    }

    tiles.push(tile)
  }

  return tiles
}

// ---------------------------------------------------------------- geometry

// Window and taskbar rectangles in stage pixels. Measured rather than read off
// the layout box, because a window may carry a transform of its own (the error
// pile is scaled down) which offsetWidth reports at full size. Rects come back in
// screen pixels, so the stage's CSS scale is divided back out.
function scanSurfaces() {
  const stage = canvas.value?.parentElement
  const stageRect = stage?.getBoundingClientRect()
  const scale = stageRect ? stageRect.width / STAGE_WIDTH : 0

  if (!stage || !stageRect || !scale) {
    surfaces = []
    return
  }

  surfaces = Array.from(stage.querySelectorAll<HTMLElement>('.w98-window, .w98-taskbar'))
    .map((element) => {
      const rect = element.getBoundingClientRect()

      return {
        x: (rect.left - stageRect.left) / scale,
        y: (rect.top - stageRect.top) / scale,
        w: rect.width / scale,
        h: rect.height / scale,
        z: Number(getComputedStyle(element).zIndex) || 0,
      }
    })
    // Painted back to front, so a nearer window can erase what sits behind it.
    .sort((a, b) => a.z - b.z)
}

// ---------------------------------------------------------------- particles

function resetFalling(particle: Particle, spec: ParticleSpec, seeded: boolean) {
  particle.size = between(spec.size)
  particle.x = Math.random() * STAGE_WIDTH
  // Seeded particles start scattered down the stage so the effect is already
  // running at the first frame rather than raining in from the top edge.
  particle.y = seeded ? Math.random() * STAGE_HEIGHT : -particle.size
  particle.speed = between(spec.speed)
  particle.sway = between(spec.sway)
  particle.swayPhase = Math.random() * TAU
  particle.swaySpeed = between(spec.swaySpeed)
  particle.spin = between(spec.spin)
  particle.angle = Math.random() * TAU
  particle.alpha = between(spec.alpha)
  particle.sprite = Math.floor(Math.random() * Math.max(1, sprites.length))
  particle.state = 'falling'
  particle.surface = -1
}

function createParticle(spec: ParticleSpec): Particle {
  const particle: Particle = {
    x: 0,
    y: 0,
    size: 0,
    speed: 0,
    sway: 0,
    swayPhase: 0,
    swaySpeed: 0,
    spin: 0,
    angle: 0,
    alpha: 1,
    sprite: 0,
    state: 'falling',
    surface: -1,
    restX: 0,
    restY: 0,
    settleUntil: 0,
    fadeFrom: 0,
  }

  resetFalling(particle, spec, true)
  return particle
}

// Starts a share of the particles already at rest. Settle times run to 40
// seconds, so seeding everything as falling gives a downpour on load and then a
// long lull. Surfaces are weighted by width, so a wide window collects more.
function seedSettled(spec: ParticleSpec, share: number, now: number) {
  if (!surfaces.length || !spec.settle) {
    return
  }

  const total = surfaces.reduce((sum, surface) => sum + surface.w, 0)

  for (const particle of particles) {
    if (Math.random() > share) {
      continue
    }

    let pick = Math.random() * total
    let index = surfaces.length - 1

    for (let i = 0; i < surfaces.length; i += 1) {
      pick -= surfaces[i]!.w
      if (pick <= 0) {
        index = i
        break
      }
    }

    const surface = surfaces[index]!
    const half = particle.size / 2

    particle.state = 'settled'
    particle.surface = index
    particle.restX = between([surface.x + half, surface.x + surface.w - half])
    particle.restY = surface.y + spec.contactOffset - half
    particle.angle = Math.random() * TAU
    // Spread across the whole window, so they do not all expire together.
    particle.settleUntil = now + Math.random() * spec.settle[1] * 1000
  }
}

// The highest surface whose contact line the particle crossed this frame. Tested
// at surface.y + contactOffset rather than at the window edge, or a particle
// resting on a crest jumps by the crest's depth in a single frame.
function findLanding(x: number, previousBottom: number, bottom: number, contactOffset: number) {
  let best = -1

  for (let index = 0; index < surfaces.length; index += 1) {
    const surface = surfaces[index]!
    const contact = surface.y + contactOffset

    if (x < surface.x || x > surface.x + surface.w) {
      continue
    }
    if (previousBottom >= contact || bottom < contact) {
      continue
    }
    if (best === -1 || surface.y < surfaces[best]!.y) {
      best = index
    }
  }

  return best
}

function advance(spec: ParticleSpec, delta: number, now: number) {
  for (const particle of particles) {
    if (particle.state === 'settled') {
      if (now >= particle.settleUntil) {
        particle.state = 'fading'
        particle.fadeFrom = now
      }
      continue
    }

    if (particle.state === 'fading') {
      if (spec.sink) {
        particle.restY += spec.sink * delta
      }
      if (now - particle.fadeFrom >= spec.fade) {
        resetFalling(particle, spec, false)
      }
      continue
    }

    const half = particle.size / 2
    const previousBottom = particle.y + half

    particle.y += particle.speed * delta
    particle.swayPhase += particle.swaySpeed * delta
    particle.angle += particle.spin * delta

    const x = particle.x + Math.sin(particle.swayPhase) * particle.sway
    const landing = findLanding(x, previousBottom, particle.y + half, spec.contactOffset)

    if (landing !== -1) {
      const surface = surfaces[landing]!
      particle.surface = landing
      // Left where it was on the frame it made contact. Recomputing from the
      // surface would shift it by however far past the line it went, which
      // reads as a twitch.
      particle.restY = particle.y
      // Settled material is pulled inside the window it rests on, so nothing
      // hangs off a corner. Absorbed material fades in place, so leave it.
      particle.restX = spec.settle
        ? clamp(x, surface.x + half, surface.x + surface.w - half)
        : x

      if (spec.settle) {
        particle.state = 'settled'
        particle.settleUntil = now + between(spec.settle) * 1000
        // The angle is left alone. Snapping to a rest tilt on impact reads as a
        // stutter, so it locks where its spin left it.
      }
      else {
        // Taken by the drift on contact.
        particle.state = 'fading'
        particle.fadeFrom = now
      }

      continue
    }

    // Nothing to land on (no taskbar on this route): recycle at the top.
    if (particle.y - half > STAGE_HEIGHT) {
      resetFalling(particle, spec, false)
    }
  }
}

// ---------------------------------------------------------------- painting

function paintParticle(ctx: CanvasRenderingContext2D, particle: Particle, spec: ParticleSpec, now: number) {
  const sprite = sprites[particle.sprite]

  if (!sprite) {
    return
  }

  const scale = particle.size / SPRITE_SIZE
  const width = sprite.width * scale
  const height = sprite.height * scale

  const settled = particle.state !== 'falling'
  const x = settled ? particle.restX : particle.x + Math.sin(particle.swayPhase) * particle.sway
  const y = settled ? particle.restY : particle.y

  let alpha = particle.alpha
  if (particle.state === 'fading') {
    alpha *= Math.max(0, 1 - (now - particle.fadeFrom) / spec.fade)
  }

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(particle.angle)
  ctx.drawImage(sprite, -width / 2, -height / 2, width, height)
  ctx.restore()
}

/** Which pre-rendered bend a slice at this x is showing right now. */
function bendAt(spec: CrestSpec, x: number, seconds: number) {
  if (!spec.wind || crestTiles.length < 2) {
    return 0
  }

  const middle = Math.floor((crestTiles.length - 1) / 2)
  if (reducedMotion) {
    return middle
  }

  const phase = (x / spec.wind.wavelength) * TAU - seconds * spec.wind.speed
  // A slower envelope on top, so the field swells and drops between gusts
  // rather than waving at one constant strength.
  const gust = 0.55 + 0.45 * Math.sin(seconds * spec.wind.gust + x / 900)
  const bend = Math.sin(phase) * gust

  return clamp(Math.round(((bend + 1) / 2) * (crestTiles.length - 1)), 0, crestTiles.length - 1)
}

// Tiles the crest along a surface's top edge, clipped to its width. Drawn in
// slices so each carries its own bend, which is what makes a gust travel instead
// of the whole strip leaning at once. Slices use absolute stage x, so a gust
// crossing one window carries on onto the next.
function paintCrest(ctx: CanvasRenderingContext2D, surface: Surface, spec: CrestSpec, seconds: number) {
  if (!crestTiles.length) {
    return
  }

  const top = surface.y - spec.height
  const perTile = Math.max(1, Math.round(spec.tileWidth / SEGMENT))
  const slices = Math.ceil(surface.w / SEGMENT)

  ctx.save()
  ctx.beginPath()
  ctx.rect(surface.x, top, surface.w, spec.height)
  ctx.clip()

  for (let slice = 0; slice < slices; slice += 1) {
    const x = surface.x + slice * SEGMENT
    const width = Math.min(SEGMENT, surface.x + surface.w - x)
    const tile = crestTiles[bendAt(spec, x, seconds)]

    if (tile) {
      ctx.drawImage(tile, (slice % perTile) * SEGMENT, 0, width, spec.height, x, top, width, spec.height)
    }
  }

  ctx.restore()
}

/** Clears whatever has been painted so far from under a window. */
function erase(ctx: CanvasRenderingContext2D, surface: Surface) {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = '#000'
  ctx.fillRect(surface.x, surface.y, surface.w, surface.h)
  ctx.restore()
}

// Painter's algorithm over the window stack. Falling particles go down first,
// then each surface in ascending z erases what is behind it before its own
// settled particles and crest are painted. That keeps a leaf on a background
// window hidden behind whatever covers it, which clipping cannot express.
function draw(ctx: CanvasRenderingContext2D, spec: SeasonSpec, now: number) {
  ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)

  const seconds = now / 1000

  if (spec.particles) {
    for (const particle of particles) {
      if (particle.state === 'falling') {
        paintParticle(ctx, particle, spec.particles, now)
      }
    }
  }

  for (let index = 0; index < surfaces.length; index += 1) {
    const surface = surfaces[index]!
    erase(ctx, surface)

    if (spec.particles) {
      for (const particle of particles) {
        if (particle.state !== 'falling' && particle.surface === index) {
          paintParticle(ctx, particle, spec.particles, now)
        }
      }
    }

    // Last, so settled and falling particles alike pass beneath the drift.
    if (spec.crest) {
      paintCrest(ctx, surface, spec.crest, seconds)
    }
  }
}

// ---------------------------------------------------------------- loop

function step(time: number) {
  const ctx = context
  const spec = SPECS[props.season]

  if (!ctx) {
    return
  }

  // Clamped so a long pause (tab restored, laptop woken) resumes smoothly
  // instead of teleporting every particle off the bottom of the stage.
  const delta = Math.min((time - lastFrame) / 1000, 0.05)
  lastFrame = time

  const now = performance.now()

  if (spec.particles) {
    advance(spec.particles, delta, now)
  }

  draw(ctx, spec, now)
  frameHandle = requestAnimationFrame(step)
}

function stop() {
  if (frameHandle) {
    cancelAnimationFrame(frameHandle)
    frameHandle = 0
  }
}

/** Something to animate every frame, as opposed to a single still. */
function isAnimated(spec: SeasonSpec) {
  return Boolean(spec.particles) || Boolean(spec.crest?.wind)
}

async function start() {
  stop()

  const ctx = context
  if (!ctx) {
    return
  }

  const spec = SPECS[props.season]
  loadToken += 1
  const token = loadToken

  particles = []
  sprites = []
  crestTiles = []
  ctx.clearRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)

  let loadedSprites: HTMLCanvasElement[] = []
  let loadedTiles: HTMLCanvasElement[] = []

  try {
    const [spriteImages, crestImage] = await Promise.all([
      Promise.all((spec.particles?.files ?? []).map(file => loadImage(`${SPRITE_BASE}/${spec.particles!.dir}/${file}`))),
      spec.crest ? loadImage(spec.crest.src) : Promise.resolve(null),
    ])

    loadedSprites = spriteImages.map(image => prerenderSprite(image, spec.particles?.halo))
    loadedTiles = crestImage && spec.crest ? buildCrestTiles(crestImage, spec.crest) : []
  }
  catch (error) {
    console.error(error)
    return
  }

  // A newer season started loading while this one was in flight.
  if (token !== loadToken) {
    return
  }

  sprites = loadedSprites
  crestTiles = loadedTiles
  scanSurfaces()

  const now = performance.now()

  if (spec.particles) {
    particles = Array.from({ length: spec.particles.count }, () => createParticle(spec.particles!))
    seedSettled(spec.particles, 0.65, now)
  }

  if (reducedMotion || !isAnimated(spec)) {
    draw(ctx, spec, now)
    return
  }

  lastFrame = performance.now()
  frameHandle = requestAnimationFrame(step)
}

function handleVisibility() {
  if (document.hidden) {
    stop()
    return
  }

  const spec = SPECS[props.season]

  if (!reducedMotion && isAnimated(spec) && !frameHandle) {
    lastFrame = performance.now()
    frameHandle = requestAnimationFrame(step)
  }
}

onMounted(async () => {
  context = canvas.value?.getContext('2d') ?? null
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.addEventListener('visibilitychange', handleVisibility)
  // Windows are siblings in the stage; let them commit before measuring.
  await nextTick()
  start()
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibility)
  stop()
  loadToken += 1
  context = null
  particles = []
  sprites = []
  crestTiles = []
  surfaces = []
})

watch(() => props.season, start)
</script>

<template>
  <canvas
    ref="canvas"
    class="season-overlay"
    :width="STAGE_WIDTH"
    :height="STAGE_HEIGHT"
    aria-hidden="true"
  />
</template>

<style scoped lang="scss">
.season-overlay {
  position: absolute;
  z-index: 10;
  inset: 0;
  pointer-events: none;
}
</style>
