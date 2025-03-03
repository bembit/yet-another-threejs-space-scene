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

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
// camera.position.z = 5;
camera.position.z = 50; 

// target the canvas element
const canvas = document.getElementById('canvas');

// renderer with the selected canvas
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// starfield
const starGeometry = new THREE.BufferGeometry();
const starCount = 10000;
const starPositions = new Float32Array(starCount * 3);

for (let i = 0; i < starCount; i++) {
    const distance = 50 + Math.random() * 450;
    const theta = THREE.MathUtils.randFloatSpread(360);
    const phi = THREE.MathUtils.randFloatSpread(360);

    starPositions[i * 3] = distance * Math.sin(theta) * Math.cos(phi);
    starPositions[i * 3 + 1] = distance * Math.sin(theta) * Math.sin(phi);
    starPositions[i * 3 + 2] = distance * Math.cos(theta);
}

starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

// star color and material
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.2 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

let mouseX = 0;
let mouseY = 0;

// colors for transition
const color1 = new THREE.Color(0xffffff);  // yellow
const color2 = new THREE.Color(0xffff00);  // blue
const color3 = new THREE.Color(0xfffff);  // white

document.addEventListener('mousemove', (event) => {
  mouseX = (event.clientX / window.innerWidth) - 0.5;
  mouseY = (event.clientY / window.innerHeight) - 0.5;
});

// add planets to test

// might replace these with planets.
const planets = [];

const starCounts = 6;
for (let i = 0; i < starCounts; i++) {
    // Create a sphere geometry and apply our custom shader material.
    const geometry = new THREE.SphereGeometry(2, 128, 128);
    const material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });
    const sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);

    // position each star randomly in the space
    sphere.position.set(
        // (Math.random() - 0.1) * 100,
        (Math.random() - 0.1) * 100,
        (Math.random() - 0.1) * 100,
        (Math.random() - 3.2) * 100
    );
    
    console.log(sphere, sphere.position);

    //scale sthe star
    sphere.scale.set(1, 1, 1);

    scene.add(sphere);

    planets.push(sphere);
}

// zoom to planets
function animateCamera(targetPosition, duration = 2000) {
    const startPosition = camera.position.clone();
    const startTime = performance.now();

    // disable zoom effect during animation
    // currently anims are off
    isZooming = false;

    function updateCamera() {
        const elapsed = performance.now() - startTime;
        // check math from Sam.
        const t = Math.min(elapsed / duration, 1); // ensure `t` doesn't exceed 1

        // this too. smooth easing function
        const easeInOutQuad = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        // check distance to target
		if (camera.position.distanceTo(targetPosition) < 5) {
            // targetPosition = null; // stop further movement on zoom
		}
        
        // interpolate camera position
        camera.position.lerpVectors(startPosition, targetPosition, easeInOutQuad);

        renderer.render(scene, camera);

        // continue animating if not yet at target
        if (t < 1) {
            requestAnimationFrame(updateCamera);
        } else {
            isZooming = true;
        }
    }

    requestAnimationFrame(updateCamera);

}

// zoom to image on click
function zoomToImage(index, duration = 2000) {
    // where is my planet if I clone its position and jump to it with - 2 on Z still not visible plus they move. maybe that 
    const targetPosition = planets[index].position.clone().sub(new THREE.Vector3(5, 0, -2)); // offset slightly for zoom effect
    animateCamera(targetPosition, duration);
}

// store the initial camera position
// this "resets the view now"
const initialCameraPosition = camera.position.clone();

// zoom back to the initial position
function zoomBackToInitialPosition(targetPosition, duration = 2000) {
    animateCamera(initialCameraPosition, duration);
}

// DOM elements with ids zoomToImage1, zoomToImage2, etc.
document.getElementById('zoomToImage1').addEventListener('click', () => zoomToImage(0));
document.getElementById('zoomToImage2').addEventListener('click', () => zoomToImage(1));
document.getElementById('zoomToImage3').addEventListener('click', () => zoomToImage(2));
document.getElementById('zoomToImage4').addEventListener('click', () => zoomToImage(3));
document.getElementById('zoomToImage5').addEventListener('click', () => zoomToImage(4));
document.getElementById('zoomToImage6').addEventListener('click', () => zoomToImage(5));


// check if the click was outside of certain elements
document.addEventListener('click', (event) => {
    if (
        !event.target.closest('#zoomToImage1') &&
        !event.target.closest('#zoomToImage2') &&
        !event.target.closest('#zoomToImage3') &&
        !event.target.closest('#zoomToImage4') &&
        !event.target.closest('#zoomToImage5') &&
        !event.target.closest('#zoomToImage6')
        // !event.target.closest('.arrow-left') &&
        // !event.target.closest('.arrow-right')
    ) {
        zoomBackToInitialPosition(); // back to the initial camera position
    }
});

let isZooming = true;

function animate() {
    requestAnimationFrame(animate);

    camera.position.z -= 0.005;

    planets.forEach(image => {
        image.position.z -= 0.006;
        image.rotation.y += 0.001;
    });

    // little point stars
    const positions = starGeometry.attributes.position.array;
    for (let i = 0; i < starCount; i++) {
        if (positions[i * 3 + 2] + camera.position.z > 5) {
            positions[i * 3 + 2] -= 500;
        }
    }
    starGeometry.attributes.position.needsUpdate = true;

    // color hover transitions
    const color = color1.clone();
    color.lerp(color2, (mouseX + 0.5));  // horizontal gradient transition
    color.lerp(color3, (mouseY + 0.5));  // vertical gradient transition

    starMaterial.color.set(color);

    renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

// bunch of hacked in styles
document.querySelectorAll('.effect').forEach(div => {
  const divToTarget = document.querySelector('.hover-info-container');

  // const color = div.getAttribute('data-color-test');
  // div.style.borderTop = `15px solid ${color}`;

  div.addEventListener('mouseenter', (event) => {

    // const effectId = parseInt(event.target.getAttribute('data-effect'), 10);

    // These could be cleaned up
    divToTarget.textContent = event.target.getAttribute('data-description-test');

    // material.uniforms.uShape.value = effectId;
    const color = event.target.getAttribute('data-color-test');
    div.style.backgroundColor = color;
    // div.style.borderTop = `15px solid ${color}`;

    div.classList.add('animatedDiv')
    
  });

  div.addEventListener('mouseleave', () => {
    // material.uniforms.uShape.value = 0; // Other -1 value spot
    // Tests
    div.style.backgroundColor = 'rgba(255, 141, 236, 0.02)';
    divToTarget.textContent = '';
    div.classList.remove('animatedDiv')

  });
});
