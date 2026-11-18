/**
 * Ereto Namunyak CBO - Interactive Three.js 3D Community Globe & Organic Mesh
 * Symbolizing unity, growth, environmental stewardship, and community empowerment.
 * Brand colors: Forest Green (#176B45) & Golden Yellow (#F4B942).
 */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('three-hero-canvas');
  if (!container || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.z = 22;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Group to hold all 3D components
  const masterGroup = new THREE.Group();
  scene.add(masterGroup);

  // 1. Organic Icosahedron Wireframe Sphere (Community Unity)
  const sphereGeo = new THREE.IcosahedronGeometry(9, 2);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0x176B45,
    wireframe: true,
    transparent: true,
    opacity: 0.38,
    roughness: 0.2,
    metalness: 0.5
  });
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
  masterGroup.add(sphereMesh);

  // 2. Glowing Golden Core (Hope & Blessing - Namunyak)
  const coreGeo = new THREE.SphereGeometry(3.5, 32, 32);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xF4B942,
    wireframe: true,
    transparent: true,
    opacity: 0.45
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  masterGroup.add(coreMesh);

  // 3. Shimmering Particle Cloud (Beneficiaries, Trees & Life)
  const particleCount = 750;
  const particleGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const greenColor = new THREE.Color(0x176B45);
  const yellowColor = new THREE.Color(0xF4B942);
  const lightGreen = new THREE.Color(0x48BB78);

  for (let i = 0; i < particleCount; i++) {
    const radius = 10 + Math.random() * 6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    // Alternate brand colors
    const randChoice = Math.random();
    let pColor = greenColor;
    if (randChoice > 0.6) pColor = yellowColor;
    else if (randChoice > 0.35) pColor = lightGreen;

    colors[i * 3] = pColor.r;
    colors[i * 3 + 1] = pColor.g;
    colors[i * 3 + 2] = pColor.b;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMat = new THREE.PointsMaterial({
    size: 0.28,
    vertexColors: true,
    transparent: true,
    opacity: 0.85
  });
  const particleSystem = new THREE.Points(particleGeo, particleMat);
  masterGroup.add(particleSystem);

  // 4. Orbiting Rings (Mutual Support & Stewardship)
  const ringGeo = new THREE.TorusGeometry(12.5, 0.06, 16, 100);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xF4B942,
    transparent: true,
    opacity: 0.5
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 3;
  masterGroup.add(ringMesh);

  const ringGeo2 = new THREE.TorusGeometry(14, 0.04, 16, 100);
  const ringMat2 = new THREE.MeshBasicMaterial({
    color: 0x176B45,
    transparent: true,
    opacity: 0.4
  });
  const ringMesh2 = new THREE.Mesh(ringGeo2, ringMat2);
  ringMesh2.rotation.y = Math.PI / 4;
  masterGroup.add(ringMesh2);

  // Ambient & Directional Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xF4B942, 1.2);
  dirLight.position.set(10, 20, 15);
  scene.add(dirLight);

  // Interactive mouse tracking
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;
  const windowHalfX = window.innerWidth / 2;
  const windowHalfY = window.innerHeight / 2;

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - windowHalfX) * 0.0006;
    mouseY = (e.clientY - windowHalfY) * 0.0006;
  });

  // Touch tracking for mobile
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      mouseX = (e.touches[0].clientX - windowHalfX) * 0.0006;
      mouseY = (e.touches[0].clientY - windowHalfY) * 0.0006;
    }
  }, { passive: true });

  // Animation Loop
  let clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();

    // Constant soothing rotations
    sphereMesh.rotation.y += 0.003;
    sphereMesh.rotation.x += 0.001;

    coreMesh.rotation.y -= 0.005;
    coreMesh.rotation.z += 0.002;

    particleSystem.rotation.y += 0.0015;
    ringMesh.rotation.z += 0.004;
    ringMesh2.rotation.x -= 0.003;

    // Organic breathing scale
    const scaleFactor = 1 + Math.sin(elapsedTime * 1.5) * 0.04;
    coreMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Smooth mouse lerp
    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    masterGroup.rotation.y += targetX * 0.4;
    masterGroup.rotation.x += targetY * 0.4;

    renderer.render(scene, camera);
  }

  animate();

  // Resize Listener
  window.addEventListener('resize', () => {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
});
