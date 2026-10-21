import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';

/** Separable tilt-shift blur: sharp band around the focus line, soft above and below. */
const TiltShiftShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uDir: { value: new THREE.Vector2(1, 0) },
    uFocus: { value: 0.55 },
    uBand: { value: 0.12 },
    uAmount: { value: 2.2 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uDir;
    uniform float uFocus;
    uniform float uBand;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      float d = abs(vUv.y - uFocus);
      float r = uAmount * smoothstep(uBand, uBand + 0.4, d);
      vec4 sum = texture2D(tDiffuse, vUv) * 0.2270270270;
      vec2 o1 = uDir * 1.3846153846 * r;
      vec2 o2 = uDir * 3.2307692308 * r;
      sum += texture2D(tDiffuse, vUv + o1) * 0.3162162162;
      sum += texture2D(tDiffuse, vUv - o1) * 0.3162162162;
      sum += texture2D(tDiffuse, vUv + o2) * 0.0702702703;
      sum += texture2D(tDiffuse, vUv - o2) * 0.0702702703;
      gl_FragColor = sum;
    }`,
};

/** Gentle grade: warm/cool tint by time of day, vignette, very fine grain. */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uVignette: { value: 0.28 },
    uGrain: { value: 0.012 },
    uTime: { value: 0 },
  },
  vertexShader: TiltShiftShader.vertexShader,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3 uTint;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      c.rgb *= uTint;
      float v = smoothstep(0.85, 0.25, distance(vUv, vec2(0.5)));
      c.rgb *= mix(1.0 - uVignette, 1.0, v);
      float n = fract(sin(dot(vUv * (uTime + 1.0), vec2(12.9898, 78.233))) * 43758.5453);
      c.rgb += (n - 0.5) * uGrain;
      gl_FragColor = c;
    }`,
};

export interface PostSettings {
  tiltShift: boolean;
  ao: boolean;
}

export class PostFX {
  readonly composer: EffectComposer;
  private tiltH: ShaderPass;
  private tiltV: ShaderPass;
  private grade: ShaderPass;
  private ao: GTAOPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.ao = new GTAOPass(scene, camera);
    this.ao.blendIntensity = 0.85;
    this.composer.addPass(this.ao);
    this.tiltH = new ShaderPass(TiltShiftShader);
    this.tiltV = new ShaderPass(TiltShiftShader);
    this.composer.addPass(this.tiltH);
    this.composer.addPass(this.tiltV);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
    this.composer.addPass(new OutputPass());
  }

  configure(s: PostSettings): void {
    this.tiltH.enabled = s.tiltShift;
    this.tiltV.enabled = s.tiltShift;
    this.ao.enabled = s.ao;
  }

  setSize(w: number, h: number): void {
    this.composer.setSize(w, h);
    this.tiltH.uniforms.uDir.value.set(1 / w, 0);
    this.tiltV.uniforms.uDir.value.set(0, 1 / h);
  }

  setTint(c: THREE.Color, time: number): void {
    this.grade.uniforms.uTint.value.copy(c);
    this.grade.uniforms.uTime.value = time % 100;
  }

  /** Stronger blur when zoomed in, like a real macro lens. */
  setBlur(amount: number): void {
    this.tiltH.uniforms.uAmount.value = amount;
    this.tiltV.uniforms.uAmount.value = amount;
  }

  render(): void {
    this.composer.render();
  }
}
