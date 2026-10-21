import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { BKind, TICKS_PER_DAY, Terrain, TileUse, Zone } from '../sim/constants';
import { hash2 } from '../sim/rng';
import type { GridView } from '../sim/protocol';
import { B_KIND, B_LEVEL, B_PROGRESS, B_STRIDE, B_TILE, B_VARIANT } from '../sim/protocol';
import { CameraRig } from './camera';
import { plainMaterial, roofGeometry, windowedMaterial } from './materials';
import { ACCENTI, BODY_TINTS, PLASTICO } from './palette';
import { PostFX } from './postfx';

export type QualityPreset = 'telefono' | 'bilanciato' | 'alto' | 'ultra';

interface PresetSpec {
  maxDpr: number;
  shadow: number;
  ao: boolean;
  targetFps: number;
}

export const PRESETS: Record<QualityPreset, PresetSpec> = {
  telefono: { maxDpr: 1.25, shadow: 1024, ao: false, targetFps: 30 },
  bilanciato: { maxDpr: 1.5, shadow: 2048, ao: false, targetFps: 60 },
  alto: { maxDpr: 2, shadow: 2048, ao: true, targetFps: 60 },
  ultra: { maxDpr: 3, shadow: 4096, ao: true, targetFps: 60 },
};

/** Growable InstancedMesh wrapper that is refilled in one pass. */
class Instances {
  mesh: THREE.InstancedMesh;
  private n = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly p = new THREE.Vector3();
  private readonly s = new THREE.Vector3();
  private readonly col = new THREE.Color();

  constructor(
    private readonly geo: THREE.BufferGeometry,
    private readonly mat: THREE.Material,
    private cap: number,
    private readonly parent: THREE.Object3D,
    private readonly shadows = true,
  ) {
    this.mesh = this.make(cap);
  }

  private make(cap: number): THREE.InstancedMesh {
    const mesh = new THREE.InstancedMesh(this.geo, this.mat, cap);
    mesh.castShadow = this.shadows;
    mesh.receiveShadow = true;
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.parent.add(mesh);
    return mesh;
  }

  begin(): void {
    this.n = 0;
  }

  push(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    color: number,
    rotY = 0,
  ): void {
    if (this.n >= this.cap) {
      const old = this.mesh;
      this.cap *= 2;
      this.mesh = this.make(this.cap);
      (this.mesh.instanceMatrix.array as Float32Array).set(
        old.instanceMatrix.array as Float32Array,
      );
      (this.mesh.instanceColor!.array as Float32Array).set(
        old.instanceColor!.array as Float32Array,
      );
      this.parent.remove(old);
      old.dispose();
    }
    this.q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rotY);
    this.m.compose(this.p.set(x, y, z), this.q, this.s.set(sx, sy, sz));
    this.mesh.setMatrixAt(this.n, this.m);
    this.mesh.setColorAt(this.n, this.col.setHex(color));
    this.n++;
  }

  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

export class CityRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly rig: CameraRig;
  readonly post: PostFX;
  private readonly size: number;
  private readonly half: number;
  private readonly world = new THREE.Group();
  private readonly sun = new THREE.DirectionalLight(0xffffff, 2.4);
  private readonly moon = new THREE.DirectionalLight(0x9fb4d8, 0);
  private readonly hemi = new THREE.HemisphereLight(0xe6eef5, 0xcabfa8, 1.0);
  private readonly windowUniforms = { uNight: { value: 0 } };

  private ground!: THREE.Mesh;
  private groundCanvas: HTMLCanvasElement;
  private groundTex: THREE.CanvasTexture;
  private water: THREE.Mesh | null = null;
  private waterMat = new THREE.MeshPhysicalMaterial({
    color: PLASTICO.acqua,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    transmission: 0,
    metalness: 0,
  });

  private roads: Instances;
  private zones: Instances;
  private bodies: Instances;
  private plain: Instances;
  private roofs: Instances;
  private cyls: Instances;
  private scaffold: Instances;
  private trees: Instances;
  private trunks: Instances;
  private people: Instances;
  private preview: Instances;
  private lamps: THREE.Points;

  private grid: GridView | null = null;
  private buildings: Float32Array = new Float32Array(0);
  private prevPeople = new Float32Array(0);
  private currPeople = new Float32Array(0);
  private peopleAt = 0;
  private peopleInterval = 100;
  private playerTile = -1;

  quality: QualityPreset = 'bilanciato';
  private resScale = 1;
  private frameTimes: number[] = [];
  private lastScaleCheck = 0;
  private night = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    size: number,
  ) {
    this.size = size;
    this.half = size / 2;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Count draw calls over the whole composer frame, not just the last pass.
    this.renderer.info.autoReset = false;

    this.rig = new CameraRig(canvas.clientWidth / Math.max(1, canvas.clientHeight), this.half);
    this.scene.add(this.world);
    this.scene.fog = new THREE.Fog(0xe9e4da, 120, 320);

    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -this.half - 6;
    sc.right = this.half + 6;
    sc.top = this.half + 6;
    sc.bottom = -this.half - 6;
    sc.near = 1;
    sc.far = 260;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target, this.moon, this.hemi);

    this.buildBase();
    this.groundCanvas = document.createElement('canvas');
    this.groundCanvas.width = this.groundCanvas.height = size * 8;
    this.groundTex = new THREE.CanvasTexture(this.groundCanvas);
    this.groundTex.colorSpace = THREE.SRGBColorSpace;
    this.groundTex.anisotropy = 4;
    const groundMat = new THREE.MeshStandardMaterial({ map: this.groundTex, roughness: 1 });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), groundMat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.world.add(this.ground);

    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
    cyl.translate(0, 0.5, 0);
    const sphere = new THREE.IcosahedronGeometry(0.5, 2);
    const person = new THREE.CylinderGeometry(0.5, 0.5, 1, 6);
    person.translate(0, 0.5, 0);
    const flat = new THREE.PlaneGeometry(1, 1);
    flat.rotateX(-Math.PI / 2);

    this.roads = new Instances(box, plainMaterial(0xffffff, 0.9), 1024, this.world, false);
    const zoneMat = new THREE.MeshLambertMaterial({
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    this.zones = new Instances(flat, zoneMat, 512, this.world, false);
    this.zones.mesh.receiveShadow = false;
    this.bodies = new Instances(box, windowedMaterial(this.windowUniforms), 1024, this.world);
    this.plain = new Instances(box, plainMaterial(), 1024, this.world);
    this.roofs = new Instances(roofGeometry(), plainMaterial(), 512, this.world);
    this.cyls = new Instances(cyl, plainMaterial(), 256, this.world);
    const scafMat = new THREE.MeshStandardMaterial({
      color: PLASTICO.legnoChiaro,
      wireframe: true,
    });
    this.scaffold = new Instances(box, scafMat, 128, this.world, false);
    this.trees = new Instances(
      sphere,
      new THREE.MeshStandardMaterial({ roughness: 1, flatShading: false }),
      2048,
      this.world,
    );
    this.trunks = new Instances(cyl, plainMaterial(PLASTICO.legnoChiaro), 2048, this.world, false);
    const personMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    this.people = new Instances(person, personMat, 2048, this.world, false);
    const prevMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.preview = new Instances(flat, prevMat, 256, this.world, false);

    const lampGeo = new THREE.BufferGeometry();
    this.lamps = new THREE.Points(
      lampGeo,
      new THREE.PointsMaterial({
        color: 0xffd9a0,
        size: 0.35,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.world.add(this.lamps);

    this.post = new PostFX(this.renderer, this.scene, this.rig.camera);
    this.setQuality(this.quality);
    this.resize();
  }

  // ------------------------------------------------------------- static parts

  private buildBase(): void {
    const s = this.size;
    // The model sits on a thick bevelled MDF base, on a neutral table.
    const base = new THREE.Mesh(
      new RoundedBoxGeometry(s + 2.4, 1.6, s + 2.4, 4, 0.35),
      plainMaterial(PLASTICO.legnoChiaro, 0.75),
    );
    base.position.y = -0.8 - 0.002;
    base.receiveShadow = true;
    base.castShadow = true;
    this.world.add(base);
    const table = new THREE.Mesh(new THREE.CircleGeometry(420, 48), plainMaterial(0xe2dccf, 1));
    table.rotation.x = -Math.PI / 2;
    table.position.y = -1.6;
    table.receiveShadow = true;
    this.scene.add(table);
  }

  private tileToWorld(t: number): [number, number] {
    const x = t % this.size;
    const y = (t - x) / this.size;
    return [x - this.half + 0.5, y - this.half + 0.5];
  }

  worldToTile(x: number, z: number): number {
    const tx = Math.floor(x + this.half);
    const ty = Math.floor(z + this.half);
    if (tx < 0 || ty < 0 || tx >= this.size || ty >= this.size) return -1;
    return ty * this.size + tx;
  }

  // ------------------------------------------------------------- data in

  setPlayerTile(t: number): void {
    this.playerTile = t;
  }

  setGrid(g: GridView): void {
    this.grid = g;
    this.paintGround();
    this.buildWater();
    this.buildRoadsZonesTrees();
    this.buildBuildings();
  }

  setBuildings(packed: Float32Array): void {
    this.buildings = packed;
    this.buildBuildings();
  }

  setPeople(p: Float32Array, now: number, intervalMs: number): void {
    this.prevPeople = this.currPeople.length === p.length ? this.currPeople : p;
    this.currPeople = p;
    this.peopleAt = now;
    this.peopleInterval = intervalMs;
  }

  private paintGround(): void {
    const g = this.grid!;
    const ctx = this.groundCanvas.getContext('2d')!;
    const px = 8;
    const sabbia = '#e4dccd';
    const salvia = '#c9d0bd';
    const fertile = '#d6cfae';
    const forest = '#b8c4ab';
    const park = '#b3c7a6';
    const water = '#93aec2';
    for (let t = 0; t < g.use.length; t++) {
      const x = t % g.size;
      const y = (t - x) / g.size;
      let c = sabbia;
      const n = hash2(x, y, 77);
      if (g.terrain[t] === Terrain.Fertile) c = fertile;
      else if (g.terrain[t] === Terrain.Forest) c = forest;
      else if (n > 0.55) c = salvia;
      if (g.use[t] === TileUse.Park) c = park;
      if (g.terrain[t] === Terrain.Water) c = water;
      ctx.fillStyle = c;
      ctx.fillRect(x * px, y * px, px, px);
      if (g.terrain[t] === Terrain.Fertile && g.use[t] === TileUse.Empty) {
        // Ploughed rows, like strips of corrugated card on a model.
        ctx.fillStyle = 'rgba(120,100,60,0.12)';
        for (let k = 1; k < px; k += 2) ctx.fillRect(x * px, y * px + k, px, 1);
      }
    }
    this.groundTex.needsUpdate = true;
  }

  private buildWater(): void {
    if (this.water) {
      this.world.remove(this.water);
      this.water.geometry.dispose();
    }
    const g = this.grid!;
    const geos: THREE.BufferGeometry[] = [];
    for (let t = 0; t < g.terrain.length; t++) {
      if (g.terrain[t] !== Terrain.Water) continue;
      const [x, z] = this.tileToWorld(t);
      const p = new THREE.PlaneGeometry(1, 1);
      p.rotateX(-Math.PI / 2);
      p.translate(x, 0.012, z);
      geos.push(p);
    }
    if (geos.length === 0) return;
    const merged = mergeGeometries(geos);
    this.water = new THREE.Mesh(merged, this.waterMat);
    this.water.receiveShadow = true;
    this.world.add(this.water);
  }

  private buildRoadsZonesTrees(): void {
    const g = this.grid!;
    this.roads.begin();
    this.zones.begin();
    this.trees.begin();
    this.trunks.begin();
    const lampPos: number[] = [];
    for (let t = 0; t < g.use.length; t++) {
      const [x, z] = this.tileToWorld(t);
      const tx = t % g.size;
      const ty = (t - tx) / g.size;
      if (g.use[t] === TileUse.Road) {
        const bridge = g.terrain[t] === Terrain.Water;
        const color = g.highway[t] ? PLASTICO.grigioCaldo : PLASTICO.strada;
        this.roads.push(x, bridge ? 0.04 : 0, z, 1, bridge ? 0.06 : 0.035, 1, color);
        if ((tx + ty) % 3 === 0) lampPos.push(x + 0.42, 0.28, z + 0.42);
      } else if (g.use[t] === TileUse.Empty && g.zone[t] !== Zone.None) {
        const color =
          g.zone[t] === Zone.Res
            ? ACCENTI.agricoltura
            : g.zone[t] === Zone.Com
              ? ACCENTI.emergenza
              : ACCENTI.economia;
        this.zones.push(x, 0.014, z, 0.92, 1, 0.92, color);
      }
      const forest = g.terrain[t] === Terrain.Forest && g.use[t] === TileUse.Empty;
      const park = g.use[t] === TileUse.Park;
      if (forest || park) {
        const count = forest ? 3 : 2;
        for (let k = 0; k < count; k++) {
          const h1 = hash2(tx * 3 + k, ty, 11);
          const h2 = hash2(tx, ty * 3 + k, 13);
          const r = 0.18 + hash2(tx + k, ty + k, 17) * 0.12;
          const px = x + (h1 - 0.5) * 0.6;
          const pz = z + (h2 - 0.5) * 0.6;
          const trunk = 0.12 + r * 0.6;
          const tint = [0x9fb29a, 0x93a88e, 0xa8b9a0, 0x8fa48a][Math.floor(h1 * 4)];
          this.trunks.push(px, 0, pz, 0.04, trunk, 0.04, PLASTICO.legnoChiaro);
          this.trees.push(px, trunk + r * 0.8, pz, r * 2, r * 2, r * 2, tint);
        }
      }
    }
    this.roads.end();
    this.zones.end();
    this.trees.end();
    this.trunks.end();
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lampPos, 3));
    this.lamps.geometry.dispose();
    this.lamps.geometry = lg;
  }

  /** Which side a building faces: the first neighbouring road, else south. */
  private facing(t: number): number {
    const g = this.grid;
    if (!g) return 0;
    const s = g.size;
    const x = t % s;
    if (t + s < g.use.length && g.use[t + s] === TileUse.Road) return 0;
    if (x < s - 1 && g.use[t + 1] === TileUse.Road) return Math.PI / 2;
    if (t - s >= 0 && g.use[t - s] === TileUse.Road) return Math.PI;
    if (x > 0 && g.use[t - 1] === TileUse.Road) return -Math.PI / 2;
    return 0;
  }

  private buildBuildings(): void {
    if (!this.grid) return;
    const B = this.buildings;
    this.bodies.begin();
    this.plain.begin();
    this.roofs.begin();
    this.cyls.begin();
    this.scaffold.begin();
    const n = B.length / B_STRIDE;
    for (let k = 0; k < n; k++) {
      const o = k * B_STRIDE;
      const t = B[o + B_TILE];
      const kind = B[o + B_KIND];
      const level = B[o + B_LEVEL];
      const variant = B[o + B_VARIANT];
      const progress = B[o + B_PROGRESS];
      const [x, z] = this.tileToWorld(t);
      const tx = t % this.size;
      const h = (i: number) => hash2(tx * 7 + variant, Math.floor(t / this.size) * 5 + i, 3);
      const tint = BODY_TINTS[(variant + level) % BODY_TINTS.length];
      const rot = this.facing(t);
      const f = Math.min(1, progress);
      const fx = Math.sin(rot);
      const fz = Math.cos(rot);
      // Front offset helper: d along the facing direction.
      const front = (d: number): [number, number] => [x + fx * d, z + fz * d];

      if (kind === BKind.Res) {
        if (level === 1) {
          const w = 0.56 + h(1) * 0.12;
          const d = 0.48 + h(2) * 0.1;
          const hh = 0.36 + h(3) * 0.1;
          this.bodies.push(x, 0, z, w, hh * f, d, tint, rot);
          if (f >= 1)
            this.roofs.push(
              x,
              hh,
              z,
              w + 0.06,
              0.24,
              d + 0.06,
              PLASTICO.legnoChiaro,
              rot + (h(4) > 0.5 ? Math.PI / 2 : 0),
            );
        } else if (level === 2) {
          const w = 0.78;
          const hh = 0.85 + h(1) * 0.45;
          this.bodies.push(x, 0, z, w, hh * f, w, tint, rot);
          if (f >= 1) {
            this.plain.push(x, hh, z, w + 0.04, 0.05, w + 0.04, PLASTICO.gesso, rot);
            this.plain.push(
              x + (h(2) - 0.5) * 0.3,
              hh + 0.05,
              z + (h(3) - 0.5) * 0.3,
              0.18,
              0.1,
              0.14,
              PLASTICO.grigioCaldo,
              rot,
            );
          }
        } else {
          const h1 = 1.5 + h(1) * 0.7;
          this.bodies.push(x, 0, z, 0.86, h1 * f, 0.86, tint, rot);
          if (f >= 1) {
            const h2 = 0.7 + h(2) * 0.4;
            this.bodies.push(x, h1, z, 0.64, h2, 0.64, tint, rot);
            this.bodies.push(x, h1 + h2, z, 0.42, 0.45, 0.42, tint, rot);
            this.plain.push(x, h1 + h2 + 0.45, z, 0.12, 0.25, 0.12, PLASTICO.grigioCaldo, rot);
          }
        }
      } else if (kind === BKind.Com) {
        if (level <= 2) {
          const hh = level === 1 ? 0.48 + h(1) * 0.2 : 0.95 + h(1) * 0.4;
          this.bodies.push(x, 0, z, 0.82, hh * f, 0.72, tint, rot);
          if (f >= 1) {
            const awning = [ACCENTI.economia, PLASTICO.salvia, 0xc9694a, PLASTICO.acqua][
              Math.floor(h(2) * 4)
            ];
            const [ax, az] = front(0.4);
            this.plain.push(ax, 0.26, az, 0.7, 0.03, 0.16, awning, rot);
            this.plain.push(x, hh, z, 0.84, 0.04, 0.74, PLASTICO.gesso, rot);
          }
        } else {
          const hh = 2.6 + h(1) * 0.9;
          this.bodies.push(x, 0, z, 0.78, hh * f, 0.78, 0xe6ebee, rot);
          if (f >= 1) {
            this.plain.push(x, hh, z, 0.6, 0.18, 0.6, PLASTICO.grigioCaldo, rot);
            this.cyls.push(x, hh + 0.18, z, 0.03, 0.4, 0.03, PLASTICO.grigioCaldo);
          }
        }
      } else if (kind === BKind.Ind) {
        const hh = level === 1 ? 0.42 : 0.6;
        this.plain.push(x, 0, z, 0.92, hh * f, 0.8, PLASTICO.sabbia, rot);
        if (f >= 1) {
          this.roofs.push(
            x - 0.22 * fz,
            hh,
            z + 0.22 * fx,
            0.44,
            0.18,
            0.8,
            PLASTICO.grigioCaldo,
            rot + Math.PI / 2,
          );
          this.roofs.push(
            x + 0.22 * fz,
            hh,
            z - 0.22 * fx,
            0.44,
            0.18,
            0.8,
            PLASTICO.grigioCaldo,
            rot + Math.PI / 2,
          );
          this.cyls.push(x + 0.3, 0, z - 0.25, 0.12, hh + 0.75, 0.12, PLASTICO.gesso);
          if (level >= 2)
            this.cyls.push(x - 0.3, 0, z + 0.28, 0.3, 0.35, 0.3, PLASTICO.grigioCaldo);
        }
      } else if (kind === BKind.Player) {
        this.bodies.push(x, 0, z, 0.8, 0.56, 0.7, PLASTICO.crema, rot);
        this.plain.push(x, 0.56, z, 0.82, 0.05, 0.72, PLASTICO.gesso, rot);
        const [ax, az] = front(0.4);
        this.plain.push(ax, 0.28, az, 0.74, 0.035, 0.18, ACCENTI.economia, rot);
        this.plain.push(x, 0.61, z, 0.5, 0.16, 0.06, ACCENTI.economia, rot);
      }
      if (f < 1) {
        // Scaffolding around the final volume while it rises.
        const full =
          kind === BKind.Res
            ? level === 1
              ? 0.5
              : level === 2
                ? 1.1
                : 2.2
            : kind === BKind.Com
              ? level === 3
                ? 3
                : 0.9
              : 0.6;
        this.scaffold.push(x, 0, z, 0.9, full, 0.9, PLASTICO.legnoChiaro, rot);
      }
    }
    this.bodies.end();
    this.plain.end();
    this.roofs.end();
    this.cyls.end();
    this.scaffold.end();
  }

  // ------------------------------------------------------------- preview & picking

  setPreview(tiles: number[], valid: boolean[], tool: string): void {
    this.preview.begin();
    const ok = tool === 'bulldoze' ? ACCENTI.polizia : 0xffffff;
    for (let k = 0; k < tiles.length; k++) {
      const [x, z] = this.tileToWorld(tiles[k]);
      this.preview.push(x, 0.06, z, 0.96, 1, 0.96, valid[k] ? ok : 0x6b625a);
    }
    this.preview.end();
  }

  pickTile(clientX: number, clientY: number): number {
    const r = this.canvas.getBoundingClientRect();
    const p = this.rig.groundAt(
      ((clientX - r.left) / r.width) * 2 - 1,
      -((clientY - r.top) / r.height) * 2 + 1,
    );
    return p ? this.worldToTile(p.x, p.z) : -1;
  }

  groundAtClient(clientX: number, clientY: number): THREE.Vector3 | null {
    const r = this.canvas.getBoundingClientRect();
    return this.rig.groundAt(
      ((clientX - r.left) / r.width) * 2 - 1,
      -((clientY - r.top) / r.height) * 2 + 1,
    );
  }

  /** Screen position of a tile, for HTML labels. */
  project(t: number, height = 0.9): { x: number; y: number; visible: boolean } {
    const [x, z] = this.tileToWorld(t);
    const v = new THREE.Vector3(x, height, z).project(this.rig.camera);
    return {
      x: (v.x * 0.5 + 0.5) * this.canvas.clientWidth,
      y: (-v.y * 0.5 + 0.5) * this.canvas.clientHeight,
      visible: v.z < 1,
    };
  }

  tileCenter(t: number): [number, number] {
    return this.tileToWorld(t);
  }

  // ------------------------------------------------------------- settings

  setQuality(q: QualityPreset): void {
    this.quality = q;
    const spec = PRESETS[q];
    this.sun.shadow.mapSize.set(spec.shadow, spec.shadow);
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null;
    this.resScale = 1;
    this.applyPixelRatio();
  }

  private applyPixelRatio(): void {
    const dpr =
      Math.min(window.devicePixelRatio || 1, PRESETS[this.quality].maxDpr) * this.resScale;
    this.renderer.setPixelRatio(dpr);
    this.resize();
  }

  configurePost(tiltShift: boolean, ao: boolean | null): void {
    this.post.configure({ tiltShift, ao: ao ?? PRESETS[this.quality].ao });
  }

  get renderScale(): number {
    return this.resScale;
  }

  resize(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.post.setSize(w * this.renderer.getPixelRatio(), h * this.renderer.getPixelRatio());
    this.rig.camera.aspect = w / h;
    this.rig.camera.updateProjectionMatrix();
  }

  /**
   * Dynamic resolution (Part 3.6): drop internal resolution in 10% steps when
   * below target, down to 50%, and raise it again when there is headroom.
   */
  private adaptResolution(now: number, dt: number): void {
    this.frameTimes.push(dt);
    if (this.frameTimes.length > 90) this.frameTimes.shift();
    if (now - this.lastScaleCheck < 1500 || this.frameTimes.length < 60) return;
    this.lastScaleCheck = now;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    const fps = 1 / avg;
    const target = PRESETS[this.quality].targetFps;
    if (fps < target * 0.88 && this.resScale > 0.5) {
      this.resScale = Math.max(0.5, this.resScale - 0.1);
      this.applyPixelRatio();
    } else if (fps > target * 0.98 && this.resScale < 1) {
      this.resScale = Math.min(1, this.resScale + 0.1);
      this.applyPixelRatio();
    }
  }

  // ------------------------------------------------------------- frame

  private lighting(tod: number): void {
    const hours = (tod / TICKS_PER_DAY) * 24;
    const ang = ((hours - 6) / 12) * Math.PI; // 0 at dawn, PI at dusk
    const elev = Math.sin(ang);
    const az = ang + 0.6;
    const dayK = THREE.MathUtils.smoothstep(elev, -0.08, 0.25);
    this.night = 1 - THREE.MathUtils.smoothstep(elev, -0.2, 0.12);
    const r = 120;
    const sunElev = Math.max(0.12, elev);
    this.sun.position.set(Math.cos(az) * r * 0.8, sunElev * r, Math.sin(az) * r * 0.5 + 30);
    this.sun.target.position.set(0, 0, 0);
    const warm = 1 - THREE.MathUtils.smoothstep(elev, 0.05, 0.55);
    this.sun.color.setRGB(1, 0.92 - warm * 0.22, 0.84 - warm * 0.4);
    this.sun.intensity = 2.6 * dayK;
    this.moon.position.set(-40, 80, -30);
    this.moon.intensity = 0.55 * this.night;
    this.hemi.intensity = 0.35 + 0.75 * dayK;
    this.hemi.color.setRGB(
      0.9 - this.night * 0.45,
      0.93 - this.night * 0.4,
      0.96 - this.night * 0.2,
    );
    const bg = new THREE.Color(0xe9e4da).lerp(new THREE.Color(0x2b3140), this.night * 0.92);
    this.scene.background = bg;
    (this.scene.fog as THREE.Fog).color.copy(bg);
    this.windowUniforms.uNight.value = this.night;
    (this.lamps.material as THREE.PointsMaterial).opacity = this.night * 0.95;
    // Colour grade per hour: cool dawn, neutral noon, amber sunset, blue night.
    const tint = new THREE.Color(1, 1, 1);
    tint.lerp(new THREE.Color(1.06, 0.97, 0.88), warm * dayK * 0.8);
    tint.lerp(new THREE.Color(0.82, 0.88, 1.08), this.night);
    this.post.setTint(tint, performance.now() / 1000);
  }

  private updatePeople(now: number): void {
    const cur = this.currPeople;
    const prev = this.prevPeople;
    const a = Math.min(1, (now - this.peopleAt) / Math.max(16, this.peopleInterval));
    // Dots far away, small figures up close (Part 3.1 levels of detail).
    const scale = THREE.MathUtils.clamp(this.rig.dist / 40, 0.8, 2.6);
    const color = this.night > 0.5 ? 0x1c1a18 : 0x2f2b27;
    this.people.begin();
    for (let i = 0; i < cur.length / 2; i++) {
      const x1 = cur[i * 2];
      if (Number.isNaN(x1)) continue;
      const y1 = cur[i * 2 + 1];
      let x = x1;
      let y = y1;
      const x0 = prev[i * 2];
      const y0 = prev[i * 2 + 1];
      if (!Number.isNaN(x0) && Math.abs(x1 - x0) + Math.abs(y1 - y0) < 2) {
        x = x0 + (x1 - x0) * a;
        y = y0 + (y1 - y0) * a;
      }
      this.people.push(
        x - this.half + 0.5,
        0.035,
        y - this.half + 0.5,
        0.07 * scale,
        0.12 * Math.min(scale, 1.6),
        0.07 * scale,
        color,
      );
    }
    this.people.end();
  }

  frame(now: number, dt: number, tod: number): void {
    this.renderer.info.reset();
    this.rig.update(dt);
    this.lighting(tod);
    this.updatePeople(now);
    this.post.setBlur(THREE.MathUtils.clamp(3 - this.rig.dist / 30, 0.8, 2.4));
    this.post.render();
    this.adaptResolution(now, dt);
  }

  get drawCalls(): number {
    return this.renderer.info.render.calls;
  }

  get triangles(): number {
    return this.renderer.info.render.triangles;
  }

  get nightFactor(): number {
    return this.night;
  }

  get playerLot(): number {
    return this.playerTile;
  }

  /** Render one frame at a fixed size and return it as a PNG blob (photo mode). */
  async photo(width: number, height: number, tod: number): Promise<Blob> {
    const prevDpr = this.renderer.getPixelRatio();
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.post.setSize(width, height);
    this.rig.camera.aspect = width / height;
    this.rig.camera.updateProjectionMatrix();
    this.lighting(tod);
    this.post.render();
    const blob = await new Promise<Blob>((res, rej) =>
      this.canvas.toBlob((b) => (b ? res(b) : rej(new Error('Foto non riuscita'))), 'image/png'),
    );
    this.renderer.setPixelRatio(prevDpr);
    this.renderer.setSize(w, h, false);
    this.resize();
    return blob;
  }
}

function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let count = 0;
  for (const g of geos) count += g.getAttribute('position').count;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const idx: number[] = [];
  let off = 0;
  for (const g of geos) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    pos.set(p.array as Float32Array, off * 3);
    nor.set(n.array as Float32Array, off * 3);
    const gi = g.getIndex()!;
    for (let i = 0; i < gi.count; i++) idx.push(gi.getX(i) + off);
    off += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}
