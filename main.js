import * as THREE from 'https://unpkg.com/three@0.125.1/build/three.module.js';

// Vertex Shader: Passes along UV and normal data.
const vertexShader = `
varying vec2 vUv;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Fragment Shader: Creates a basic Earth-like look using procedural noise.
const fragmentShader = `
#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
varying vec3 vNormal;

const float PI = 3.14159265359;

// A basic hash function
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

// Periodic noise function that wraps every 'period' units.
float pnoise(vec2 p, vec2 period) {
  vec2 i = mod(floor(p), period);
  vec2 f = fract(p);
  
  float a = hash(i);
  float b = hash(mod(i + vec2(1.0, 0.0), period));
  float c = hash(mod(i + vec2(0.0, 1.0), period));
  float d = hash(mod(i + vec2(1.0, 1.0), period));
  
  vec2 u = f * f * (3.0 - 2.0 * f);
  
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// Fractal Brownian Motion (fbm) using periodic noise.
float fbm(vec2 st) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  // Define a fixed period for seamless noise.
  vec2 period = vec2(10.0, 10.0);
  
  for (int i = 0; i < 5; i++) {
    value += amplitude * pnoise(st * frequency, period);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  // Reconstruct spherical coordinates from the normal.
  float longitude = atan(vNormal.z, vNormal.x);
  float latitude = asin(vNormal.y);
  vec2 sphericalUV;
  sphericalUV.x = (longitude + PI) / (2.0 * PI);
  sphericalUV.y = (latitude + PI/2.0) / PI;
  
  // Scale the UVs to control the noise detail.
  vec2 st = sphericalUV * 10.0;
  float n = fbm(st);
  
  // Threshold to separate land from water.
  float threshold = 0.5;
  vec3 landColor = vec3(0.1, 0.7, 0.1);
  vec3 waterColor = vec3(0.0, 0.3, 0.7);
  vec3 color = mix(waterColor, landColor, step(threshold, n));
  
  // Apply simple directional lighting.
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float light = dot(normalize(vNormal), lightDir) * 0.5 + 0.5;
  color *= light;
  
  gl_FragColor = vec4(color, 1.0);
}
`;

// Three.js scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.z = 3;

// Target the canvas element
const canvas = document.getElementById('canvas');

// Renderer with the selected canvas
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Create sphere geometry and custom ShaderMaterial including uShape
const geometry = new THREE.SphereGeometry(1, 128, 128);
const material = new THREE.ShaderMaterial({
  vertexShader: vertexShader,
  fragmentShader: fragmentShader,
  uniforms: {
    time: { value: 0.0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uShape: { value: 0 }  // Default effect ( -1 version later )
  }
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// function animate(timeValue) {
//   requestAnimationFrame(animate);
//   material.uniforms.time.value = timeValue * 0.001;
//   renderer.render(scene, camera);
// }
// animate();

function animate(time) {
  requestAnimationFrame(animate);
  mesh.rotation.y += 0.001; // Slowly rotate for effect.
  // mesh.rotation.x += 0.001; // Slowly rotate for effect.
  // mesh.rotation.z += 0.001; // Slowly rotate for effect.
  renderer.render(scene, camera);
}
animate();

const canvasElement = document.querySelector('canvas');
console.log(canvasElement)

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// Update uMouse uniform on mouse movement
window.addEventListener('mousemove', (event) => {
  const x = (event.clientX / window.innerWidth) * 2 - 1;
  const y = -(event.clientY / window.innerHeight) * 2 + 1;
  material.uniforms.uMouse.value.set(x, y);
});

document.querySelectorAll('.effect').forEach(div => {
  const divToTarget = document.querySelector('.hover-info-container');
  div.addEventListener('mouseenter', (event) => {

    const effectId = parseInt(event.target.getAttribute('data-effect'), 10);

    // These could be cleaned up
    divToTarget.textContent = event.target.getAttribute('data-description-test');

    material.uniforms.uShape.value = effectId;

    div.style.backgroundColor = event.target.getAttribute('data-color-test');
    
  });

  div.addEventListener('mouseleave', () => {
    material.uniforms.uShape.value = 0; // Other -1 value spot
    // Tests
    div.style.backgroundColor = 'rgba(255, 141, 236, 0.02)';
    divToTarget.textContent = '';
  });
});
