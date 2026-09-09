<script setup lang="ts">
/**
 * HeroDiceScene
 * --------------------------------------------------------------------
 * Hero 섹션 배경에 떠 있는 4개의 실제 3D 주사위 (RoundedBoxGeometry + pip sphere)
 *
 * - PerspectiveCamera
 * - MeshPhysicalMaterial (semi-matte ivory)
 * - pip: 작은 SphereGeometry (실제 면에 배치, 실 주사위 규칙)
 * - 부드러운 float + 미세 마우스 parallax
 * - prefers-reduced-motion 대응
 * - 모바일/태블릿에서는 DOF off, 필요 시 일부 주사위 숨김
 * - onUnmounted 에서 모든 resource dispose
 * --------------------------------------------------------------------
 */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

/* ============================================================
   1. PIP 배치 (실 주사위 규칙)
   face index: 0=right(+X), 1=left(-X), 2=top(+Y), 3=bottom(-Y), 4=front(+Z), 5=back(-Z)
   ============================================================ */
const FACE_NORMALS: Record<number, [THREE.Vector3, THREE.Vector3]> = {
  // right (+X) — face normal +X, up +Y
  0: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0)],
  // left (-X)
  1: [new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0)],
  // top (+Y)
  2: [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1)],
  // bottom (-Y)
  3: [new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 0, 1)],
  // front (+Z)
  4: [new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)],
  // back (-Z)
  5: [new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0)]
}

// 면에 따라 로컬 2D 평면(u,v)을 만들고, 그 평면 위에서 pip 위치 (u,v)를 [-1,1] 범위로 정의
const PIP_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[0, 0]],
  2: [[-0.55, -0.55], [0.55, 0.55]],
  3: [[-0.55, -0.55], [0, 0], [0.55, 0.55]],
  4: [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]],
  5: [
    [-0.55, -0.55],
    [0.55, -0.55],
    [0, 0],
    [-0.55, 0.55],
    [0.55, 0.55]
  ],
  6: [
    [-0.55, -0.55],
    [0.55, -0.55],
    [-0.55, 0],
    [0.55, 0],
    [-0.55, 0.55],
    [0.55, 0.55]
  ]
}

// face index -> 주사위 숫자 매핑 (기본: 1~6, 매 호출마다 +1로 4,5,6,2,3,1 식 회전)
// 인덱스 0..5 -> 면 값 1..6
const FACE_VALUE: Record<number, number> = {
  0: 1,
  1: 6,
  2: 2,
  3: 5,
  4: 3,
  5: 4
}

/* ============================================================
   2. 주사위 인스턴스 정의
   ============================================================ */
interface DiceConfig {
  id: string
  position: [number, number, number] // world 좌표
  scale: number
  rotation: [number, number, number] // 초기 rotation (radian)
  floatAmp: number
  floatSpeed: number
  rotAmp: number
  rotSpeed: number
  phase: number
  hideOnMobile?: boolean
}

const DICE_CONFIGS: DiceConfig[] = [
  // A. 좌상단 - 가장 큰 주사위
  {
    id: 'top-left',
    position: [-5.4, 3.4, 1.5],
    scale: 1.85,
    rotation: [deg(22), deg(-22), deg(14)],
    floatAmp: 0.22,
    floatSpeed: 0.00045,
    rotAmp: deg(3),
    rotSpeed: 0.00035,
    phase: 0
  },
  // B. 좌하단 - 작은 주사위
  {
    id: 'bottom-left',
    position: [-4.8, -3.2, -1.2],
    scale: 0.95,
    rotation: [deg(-12), deg(35), deg(-8)],
    floatAmp: 0.18,
    floatSpeed: 0.00055,
    rotAmp: deg(4),
    rotSpeed: 0.00042,
    phase: 1.7
  },
  // C. 우상단 - 작은 주사위 (가장 멀고 흐림)
  {
    id: 'top-right',
    position: [4.6, 3.6, -3.0],
    scale: 0.75,
    rotation: [deg(28), deg(-38), deg(18)],
    floatAmp: 0.14,
    floatSpeed: 0.0004,
    rotAmp: deg(3),
    rotSpeed: 0.0003,
    phase: 3.1,
    hideOnMobile: true
  },
  // D. 우하단 - 큰 주사위
  {
    id: 'bottom-right',
    position: [5.0, -3.0, 0.8],
    scale: 1.65,
    rotation: [deg(-20), deg(28), deg(-14)],
    floatAmp: 0.2,
    floatSpeed: 0.00048,
    rotAmp: deg(3.5),
    rotSpeed: 0.00038,
    phase: 4.4
  }
]

function deg(d: number): number {
  return (d * Math.PI) / 180
}

/* ============================================================
   3. 컴포넌트 본체
   ============================================================ */
const containerRef = ref<HTMLDivElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let rafId = 0
let resizeHandler: (() => void) | null = null
let pointerHandler: ((e: PointerEvent) => void) | null = null
let reducedMotionListener: ((e: MediaQueryListEvent) => void) | null = null

let pointerTarget = { x: 0, y: 0 }
let pointerCurrent = { x: 0, y: 0 }

const reducedMotion = ref(false)
const isMobileViewport = ref(false)

// dice 메쉬 + 자원 정리용
interface DiceInstance {
  group: THREE.Group
  config: DiceConfig
  pipMeshes: THREE.Mesh[]
  materials: THREE.Material[]
  geometries: THREE.BufferGeometry[]
  shadow: {
    mesh: THREE.Mesh
    geom: THREE.BufferGeometry
    mat: THREE.Material
  }
}

const diceInstances: DiceInstance[] = []
const disposables: { dispose: () => void }[] = []

const createDice = (config: DiceConfig, diceMaterial: THREE.MeshPhysicalMaterial, pipMaterial: THREE.MeshStandardMaterial): DiceInstance => {
  const group = new THREE.Group()
  group.position.set(...config.position)
  group.rotation.set(...config.rotation)

  const boxSize = 2
  const segments = 8
  const cornerRadius = 0.22
  const boxGeom = new RoundedBoxGeometry(boxSize, boxSize, boxSize, segments, cornerRadius)
  const cube = new THREE.Mesh(boxGeom, diceMaterial)
  cube.castShadow = true
  cube.receiveShadow = false
  group.add(cube)

  const pipMeshes: THREE.Mesh[] = []
  const localGeoms: THREE.BufferGeometry[] = [boxGeom]
  const localMats: THREE.Material[] = []

  const half = boxSize / 2
  // 표면 안쪽으로 살짝 들어가도록 (음수 오프셋 → 면 안으로 0.01 패인 느낌)
  const surfaceOffset = half - 0.012
  const pipRadius = 0.19
  const pipHeight = 0.025

  for (let faceIndex = 0; faceIndex < 6; faceIndex++) {
    const value = FACE_VALUE[faceIndex]
    const pipPositions = PIP_LAYOUTS[value]
    const [normal, upHint] = FACE_NORMALS[faceIndex]

    // 면의 tangent basis
    const n = normal.clone().normalize()
    const u = upHint.clone().normalize().sub(n.clone().multiplyScalar(upHint.dot(n))).normalize()
    const v = new THREE.Vector3().crossVectors(n, u).normalize()

    // 납작한 원형 pip (CylinderGeometry 으로면 디스크처럼 정밀하게)
    const pipGeom = new THREE.CylinderGeometry(pipRadius, pipRadius, pipHeight, 32, 1)
    // 면이 가로로 누워있도록 기본 회전 (Cylinder는 y축이 높이축)
    pipGeom.rotateX(Math.PI / 2)
    const pipMatLocal = pipMaterial.clone()
    localGeoms.push(pipGeom)
    localMats.push(pipMatLocal)

    for (const [pu, pv] of pipPositions) {
      const pipMesh = new THREE.Mesh(pipGeom, pipMatLocal)
      const pos = n
        .clone()
        .multiplyScalar(surfaceOffset)
        .add(u.clone().multiplyScalar(pu))
        .add(v.clone().multiplyScalar(pv))
      pipMesh.position.copy(pos)
      // 면 법선을 디스크의 +Z 와 일치시키기 위해 회전
      pipMesh.lookAt(pos.clone().add(n))
      pipMesh.castShadow = false
      pipMesh.receiveShadow = false
      group.add(pipMesh)
      pipMeshes.push(pipMesh)
    }
  }

  group.scale.setScalar(config.scale)

  return {
    group,
    config,
    pipMeshes,
    materials: localMats,
    geometries: localGeoms
  }
}

const createGroundShadow = (sceneRef: THREE.Scene, config: DiceConfig): { mesh: THREE.Mesh; geom: THREE.BufferGeometry; mat: THREE.Material } => {
  // 그림자 비활성화 — noop
  const geom = new THREE.PlaneGeometry(1, 1)
  const mat = new THREE.MeshBasicMaterial({ visible: false })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.visible = false
  sceneRef.add(mesh)
  return { mesh, geom, mat }
}

const setupLights = (sceneRef: THREE.Scene): THREE.DirectionalLight => {
  // 부드러운 천장 ambient (warm)
  const hemi = new THREE.HemisphereLight(0xfff8ee, 0xece0d0, 1.2)
  sceneRef.add(hemi)

  const ambient = new THREE.AmbientLight(0xffffff, 0.5)
  sceneRef.add(ambient)

  // 메인 키라이트 — 그림자 비활성화
  const key = new THREE.DirectionalLight(0xfff2e0, 2.4)
  key.position.set(-5, 9, 5)
  key.castShadow = false
  sceneRef.add(key)

  // 반대편 fill — 화면의 그림자가 검지 않도록
  const fill = new THREE.DirectionalLight(0xfff8ef, 0.8)
  fill.position.set(6, -3, 4)
  sceneRef.add(fill)

  // 후방 rim — 따뜻한 백라이트
  const rim = new THREE.DirectionalLight(0xfff0d6, 0.5)
  rim.position.set(2, 4, -6)
  sceneRef.add(rim)

  return key
}

const setupShadowPlane = (sceneRef: THREE.Scene): THREE.Group => {
  // 그림자 비활성화 — floor plane만 더미로 유지
  const wrapper = new THREE.Group()
  sceneRef.add(wrapper)
  return wrapper
}

const updateViewportFlag = () => {
  if (typeof window === 'undefined') return
  isMobileViewport.value = window.innerWidth <= 768
}

const handleResize = () => {
  if (!renderer || !camera || !containerRef.value) return
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  updateViewportFlag()
}

const handlePointer = (e: PointerEvent) => {
  if (!containerRef.value) return
  const rect = containerRef.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  const y = ((e.clientY - rect.top) / rect.height) * 2 - 1
  pointerTarget.x = x
  pointerTarget.y = y
}

const animate = (time: number) => {
  rafId = requestAnimationFrame(animate)
  if (!renderer || !scene || !camera) return

  // parallax lerp
  pointerCurrent.x += (pointerTarget.x - pointerCurrent.x) * 0.05
  pointerCurrent.y += (pointerTarget.y - pointerCurrent.y) * 0.05

  if (!reducedMotion.value) {
    // 전체 scene 미세 parallax
    scene.rotation.y = pointerCurrent.x * 0.025
    scene.rotation.x = pointerCurrent.y * 0.012
  } else {
    scene.rotation.y += (0 - scene.rotation.y) * 0.05
    scene.rotation.x += (0 - scene.rotation.x) * 0.05
  }

  // 개별 주사위 float + 회전
  for (const inst of diceInstances) {
    if (inst.config.hideOnMobile && isMobileViewport.value) {
      inst.group.visible = false
      inst.shadow.mesh.visible = false
      continue
    }
    inst.group.visible = true
    inst.shadow.mesh.visible = true
    const t = time * inst.config.floatSpeed + inst.config.phase * 1000
    const float = Math.sin(t) * inst.config.floatAmp
    inst.group.position.y = inst.config.position[1] + float

    if (!reducedMotion.value) {
      inst.group.rotation.x = inst.config.rotation[0] + Math.sin(t * 0.6) * inst.config.rotAmp
      inst.group.rotation.y = inst.config.rotation[1] + Math.cos(t * 0.5) * inst.config.rotAmp
    }
    // ground shadow는 정적 유지 — 매 프레임 갱신하면 깜빡임 유발
  }

  renderer.render(scene, camera)
}

onMounted(() => {
  if (!containerRef.value) return

  // prefers-reduced-motion
  if (typeof window !== 'undefined') {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotion.value = mq.matches
    reducedMotionListener = (e) => {
      reducedMotion.value = e.matches
    }
    if (mq.addEventListener) {
      mq.addEventListener('change', reducedMotionListener)
    } else if ((mq as MediaQueryList).addListener) {
      ;(mq as MediaQueryList).addListener(reducedMotionListener as (e: MediaQueryListEvent) => void)
    }
  }

  updateViewportFlag()

  // Renderer
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block;'
  containerRef.value.appendChild(canvas)

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  })
  renderer.setClearColor(0xffffff, 0)
  const dpr = Math.min(window.devicePixelRatio || 1, isMobileViewport.value ? 1.5 : 2)
  renderer.setPixelRatio(dpr)

  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  renderer.setSize(w, h, false)
  renderer.shadowMap.enabled = false
  renderer.outputColorSpace = THREE.SRGBColorSpace

  disposables.push({
    dispose: () => {
      renderer?.dispose()
    }
  })

  // Scene + Camera
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 100)
  camera.position.set(0, 0, 10)
  camera.lookAt(0, 0, 0)

  // Lights
  setupLights(scene)

  // 그림자 plane
  setupShadowPlane(scene)

  // dice material — 따뜻한 연한 cream, 부드러운 matte (clearcoat 거의 없음)
  const diceMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xfaf6ee,
    roughness: 0.72,
    metalness: 0,
    clearcoat: 0.03,
    clearcoatRoughness: 0.8,
    sheen: 0.2,
    sheenColor: new THREE.Color(0xfff4e0),
    sheenRoughness: 0.55
  })
  disposables.push({ dispose: () => diceMaterial.dispose() })

  // pip material — 어두운 부드러운 브라운, matte
  const pipMaterial = new THREE.MeshStandardMaterial({
    color: 0x322521,
    roughness: 0.85,
    metalness: 0
  })
  disposables.push({ dispose: () => pipMaterial.dispose() })

  // 주사위 4개 생성
  for (const cfg of DICE_CONFIGS) {
    const inst = createDice(cfg, diceMaterial, pipMaterial)
    inst.shadow = createGroundShadow(scene!, cfg)
    diceInstances.push(inst)
    scene.add(inst.group)
  }

  // 이벤트
  resizeHandler = handleResize
  pointerHandler = handlePointer
  window.addEventListener('resize', resizeHandler)
  window.addEventListener('pointermove', pointerHandler, { passive: true })

  // 애니메이션 시작
  rafId = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
  if (pointerHandler) window.removeEventListener('pointermove', pointerHandler)
  if (reducedMotionListener && typeof window !== 'undefined') {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.removeEventListener) {
      mq.removeEventListener('change', reducedMotionListener)
    } else if ((mq as MediaQueryList).removeListener) {
      ;(mq as MediaQueryList).removeListener(reducedMotionListener as (e: MediaQueryListEvent) => void)
    }
  }

  // dice 자원 정리
  for (const inst of diceInstances) {
    for (const g of inst.geometries) g.dispose()
    for (const m of inst.materials) m.dispose()
    if (scene) {
      scene.remove(inst.group)
      scene.remove(inst.shadow.mesh)
    }
    inst.shadow.geom.dispose()
    inst.shadow.mat.dispose()
  }

  for (const d of disposables) {
    try {
      d.dispose()
    } catch (err) {
      console.warn('Dispose error', err)
    }
  }

  if (renderer) {
    renderer.dispose()
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }

  diceInstances.length = 0
  disposables.length = 0
  renderer = null
  scene = null
  camera = null
})
</script>

<template>
  <div ref="containerRef" class="hero-dice" aria-hidden="true" />
</template>

<style scoped>
.hero-dice {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}
</style>
