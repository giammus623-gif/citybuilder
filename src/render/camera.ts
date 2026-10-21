import * as THREE from 'three';

const DEG = Math.PI / 180;

/**
 * Orbit camera around a ground target with inertia (Part 3.1): pan, free rotation,
 * 90° snaps, smooth zoom, and fly-to for "vai sul posto".
 */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly target = new THREE.Vector3();
  yaw = 45 * DEG;
  pitch = 38 * DEG;
  dist = 52;
  private goalTarget = new THREE.Vector3();
  private goalYaw = this.yaw;
  private goalPitch = this.pitch;
  private goalDist = this.dist;
  reducedMotion = false;

  constructor(
    aspect: number,
    private readonly half: number,
  ) {
    // A narrow field of view flattens perspective, the way a model is photographed.
    this.camera = new THREE.PerspectiveCamera(28, aspect, 0.5, 600);
    this.apply();
  }

  get minDist(): number {
    return 5;
  }

  get maxDist(): number {
    return this.half * 3.4;
  }

  panBy(dx: number, dz: number): void {
    this.goalTarget.x += dx;
    this.goalTarget.z += dz;
    this.clampTarget();
  }

  panTo(x: number, z: number, instant = false): void {
    this.goalTarget.set(x, 0, z);
    this.clampTarget();
    if (instant) this.target.copy(this.goalTarget);
  }

  rotateBy(dYaw: number, dPitch: number): void {
    this.goalYaw += dYaw;
    this.goalPitch = THREE.MathUtils.clamp(this.goalPitch + dPitch, 18 * DEG, 72 * DEG);
  }

  snap(dir: 1 | -1): void {
    const step = Math.PI / 2;
    this.goalYaw = Math.round((this.goalYaw + dir * step - 45 * DEG) / step) * step + 45 * DEG;
  }

  zoomBy(factor: number): void {
    this.goalDist = THREE.MathUtils.clamp(this.goalDist * factor, this.minDist, this.maxDist);
  }

  flyTo(x: number, z: number, dist = 18): void {
    this.panTo(x, z);
    this.goalDist = dist;
  }

  private clampTarget(): void {
    const h = this.half + 4;
    this.goalTarget.x = THREE.MathUtils.clamp(this.goalTarget.x, -h, h);
    this.goalTarget.z = THREE.MathUtils.clamp(this.goalTarget.z, -h, h);
  }

  update(dt: number): void {
    const k = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 9);
    this.target.lerp(this.goalTarget, k);
    this.yaw += (this.goalYaw - this.yaw) * k;
    this.pitch += (this.goalPitch - this.pitch) * k;
    this.dist += (this.goalDist - this.dist) * k;
    this.apply();
  }

  private apply(): void {
    const c = Math.cos(this.pitch);
    this.camera.position.set(
      this.target.x + this.dist * c * Math.sin(this.yaw),
      this.target.y + this.dist * Math.sin(this.pitch),
      this.target.z + this.dist * c * Math.cos(this.yaw),
    );
    this.camera.lookAt(this.target);
    this.camera.updateMatrixWorld();
  }

  /** Ground point (y = 0) under a screen position in normalized device coordinates. */
  groundAt(ndcX: number, ndcY: number, out = new THREE.Vector3()): THREE.Vector3 | null {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    return ray.ray.intersectPlane(plane, out);
  }
}
