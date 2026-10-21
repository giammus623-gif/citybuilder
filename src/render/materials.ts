import * as THREE from 'three';

export interface WindowUniforms {
  uNight: { value: number };
}

/**
 * Plaster material with procedural windows: recessed (darker) by day, randomly
 * lit at night. Windows are anchored in world space so every façade gets them.
 */
export function windowedMaterial(uniforms: WindowUniforms): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = uniforms.uNight;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWPos;
        varying vec3 vWNorm;
        varying float vSeed;`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
        mat4 wm = modelMatrix;
        #ifdef USE_INSTANCING
          wm = modelMatrix * instanceMatrix;
          vSeed = float(gl_InstanceID) * 1.618;
        #else
          vSeed = 0.0;
        #endif
        vWPos = (wm * vec4(transformed, 1.0)).xyz;
        vWNorm = normalize(mat3(wm) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uNight;
        varying vec3 vWPos;
        varying vec3 vWNorm;
        varying float vSeed;
        float winMask;
        float winLit;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        winMask = 0.0;
        winLit = 0.0;
        if (abs(vWNorm.y) < 0.5) {
          float u = abs(vWNorm.x) > 0.5 ? vWPos.z : vWPos.x;
          vec2 cell = vec2(u / 0.11, (vWPos.y - 0.04) / 0.16);
          vec2 f = fract(cell);
          winMask = step(0.24, f.x) * step(f.x, 0.76) * step(0.3, f.y) * step(f.y, 0.78) * step(0.1, vWPos.y);
          float h = fract(sin(dot(floor(cell) + vec2(vSeed, vSeed * 0.37), vec2(12.9898, 78.233))) * 43758.5453);
          winLit = winMask * step(1.0 - uNight * 0.7, h);
        }
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.6, 0.62, 0.66), winMask);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.76, 0.42) * winLit * uNight * 1.8;`,
      );
  };
  return mat;
}

export function plainMaterial(color = 0xffffff, roughness = 0.95): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 });
}

/** A triangular prism (pitched roof) of unit size, ridge along X, base on y=0. */
export function roofGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, 0);
  shape.lineTo(0.5, 0);
  shape.lineTo(0, 1);
  shape.lineTo(-0.5, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}
