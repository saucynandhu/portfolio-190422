import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PlayerController } from './src/PlayerController.js';
import { Artwork } from './src/Artwork.js';
import { GalleryVisitor } from './src/GalleryVisitor.js';
import { audioManager } from './src/AudioManager.js';
import Stats from 'stats.js';

/**
 * Main application state
 * Contains all shared state for the 3D gallery
 */
const state = {
  clock: new THREE.Clock(),
  stats: new Stats(),
  scene: new THREE.Scene(),
  camera: new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  ),
  renderer: null,
  player: null,
  artworks: [],
  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2(),
  currentArtwork: null,
  infoTimeout: null,
  visitors: [],
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false
};

// Global camera reference for visitor thought bubbles and other camera-dependent features
const camera = state.camera;

/**
 * Artwork configuration
 * Defines the artworks to be displayed in the gallery
 * Each artwork requires:
 * - image: Filename of the artwork image
 * - title: Display title of the artwork
 * - artist: Artist's name
 */
const ARTWORKS = [
  { 
    image: 'socrates.jpg',
    title: 'The Death of Socrates',
    artist: 'Jacques-Louis David'
  },
  { 
    image: 'stars.jpg',
    title: 'Starry Night',
    artist: 'Vincent Van Gogh'
  },
  { 
    image: 'wave.jpg',
    title: 'The Great Wave off Kanagawa',
    artist: 'Katsushika Hokusai'
  },
  { 
    image: 'spring.jpg',
    title: 'Effect of Spring, Giverny',
    artist: 'Claude Monet'
  },
  { 
    image: 'mountain.jpg',
    title: 'Mount Corcoran',
    artist: 'Albert Bierstadt'
  },
  { 
    image: 'sunday.jpg',
    title: 'A Sunday on La Grande Jatte',
    artist: 'George Seurat'
  }
];

// Performance settings
const PERFORMANCE = {
  shadows: false,  // Disable shadows for better performance
  reflections: false,  // Disable reflections
  antialias: false,  // Disable antialiasing
  shadowMapSize: 512,  // Reduced shadow map size
  maxPixelRatio: 1  // Limit pixel ratio
};

// State is now defined at the top of the file

/**
 * Initialize the 3D gallery application
 * Sets up the scene, renderer, lighting, and event listeners
 */
function init() {
  setupRenderer();
  setupScene();
  setupLighting();
  setupFloor();
  createArtworks();
  setupPlayer();
  setupEventListeners();
  
  // Hide info panel by default
  const infoPanel = document.getElementById('info-panel');
  if (infoPanel) {
    infoPanel.classList.remove('visible');
  }
  
  // Set up environment and lighting
  setupEnvironment();
  
  // Add gallery visitors
  addGalleryVisitors();
  
  // Start animation loop
  animate();
}

function addGalleryVisitors() {
  try {
    console.log('Adding gallery visitors...');
    
    // Initialize visitors array if it doesn't exist
    if (!state.visitors) {
      state.visitors = [];
    }
    
    // Clear any existing visitors
    state.visitors.forEach(visitor => {
      try {
        if (visitor && visitor.group && visitor.group.parent) {
          visitor.group.parent.remove(visitor.group);
        }
      } catch (e) {
        console.error('Error removing existing visitor:', e);
      }
    });
    state.visitors = [];
    
    // Hardcoded visitor positions - more spread out
    const visitorPositions = [
      // Visitor near The Great Wave off Kanagawa (positioned near the right wall)
      {
        x: 12.0,   // Close to the right wall
        z: -8.0,    // Positioned near the artwork
        lookAt: { x: 14.0, z: -6.0 },  // Looking toward the artwork
        rotationY: Math.atan2(-6.0 - -8.0, 14.0 - 12.0) + Math.PI,
        distance: 2.0
      },
      // Visitor near A Sunday on La Grande Jatte (front-left position)
      {
        x: -10.0,  // Left side of the gallery
        z: -10.0,  // Front section
        lookAt: { x: -12.0, z: -12.0 },  // Looking toward the artwork
        rotationY: Math.atan2(-12.0 - -10.0, -12.0 - -10.0) + Math.PI,
        distance: 2.5
      },
      // Front wall painting - left side
      {
        x: -6.0,   // Further left on front wall
        z: -14.0,  // Further forward
        lookAt: { x: -4.0, z: -16.0 }, // Painting further forward
        rotationY: Math.atan2(-16.0 - -14.0, -4.0 - -6.0) + Math.PI,
        distance: 4.0
      },
      // Back wall painting - right side
      {
        x: 6.0,    // Further right on back wall
        z: 14.0,   // Further back
        lookAt: { x: 4.0, z: 16.0 },  // Painting further back
        rotationY: Math.atan2(16.0 - 14.0, 4.0 - 6.0) + Math.PI,
        distance: 4.0
      },
      // Visitor near The Death of Socrates (front-right position)
      {
        x: 10.0,   // Right side of the gallery
        z: -12.0,  // Front section
        lookAt: { x: 12.0, z: -14.0 },  // Looking toward the artwork
        rotationY: Math.atan2(-14.0 - -12.0, 12.0 - 10.0) + Math.PI,
        distance: 3.0
      }
    ];
    
    // Create multiple visitors with the defined positions
    visitorPositions.forEach((pos, index) => {
      // Add slight random offset (smaller range)
      const offset = 0.2;
      const x = pos.x + (Math.random() * offset * 2 - offset);
      const z = pos.z + (Math.random() * offset * 2 - offset);
      
      // Calculate look at position based on distance
      const lookAtX = pos.lookAt.x;
      const lookAtZ = pos.lookAt.z;
      setTimeout(() => {
        try {
          const visitor = new GalleryVisitor();
          
          // Position the visitor with slight random height
          const randomOffset = (Math.random() - 0.5) * 0.2;
          visitor.group.position.set(pos.x, randomOffset, pos.z);
          
          // Make visitor look at the painting
          const lookAtTarget = new THREE.Vector3(pos.lookAt.x, visitor.group.position.y, pos.lookAt.z);
          visitor.group.lookAt(lookAtTarget);
          
          // Add slight random rotation for natural look
          visitor.group.rotation.y += (Math.random() - 0.5) * 0.3;
          
          // Add to scene and track
          state.scene.add(visitor.group);
          state.visitors.push(visitor);
          
          console.log(`Visitor ${index} added at position:`, visitor.group.position);
          
          // Show thought bubble after a delay
          setTimeout(() => {
            try {
              if (visitor.thoughtBubble) {
                visitor.thoughtBubble.visible = true;
                visitor.showRandomThought();
              } else {
                visitor.setupThoughtBubble();
                if (visitor.thoughtBubble) {
                  visitor.thoughtBubble.visible = true;
                  visitor.showRandomThought();
                }
              }
            } catch (e) {
              console.error(`Error showing thought bubble for visitor ${index}:`, e);
            }
          }, 1000 + (index * 300)); // Stagger the thought bubbles
          
          // Add subtle animation
          const startTime = Date.now();
          const bobHeight = 0.02 + (Math.random() * 0.03);
          const bobSpeed = 1.5 + (Math.random() * 1.0);
          const startY = visitor.group.position.y;
          
          const animateVisitor = () => {
            if (!visitor || !visitor.group) return;
            
            const time = (Date.now() - startTime) * 0.001;
            visitor.group.position.y = startY + Math.sin(time * bobSpeed) * bobHeight;
            
            // Slight head turn
            if (Math.random() < 0.01) {
              visitor.group.rotation.y += (Math.random() - 0.5) * 0.1;
            }
            
            requestAnimationFrame(animateVisitor);
          };
          
          animateVisitor();
          
        } catch (error) {
          console.error(`Error creating visitor ${index}:`, error);
        }
      }, index * 200); // Stagger the creation of visitors
    });
    
  } catch (error) {
    console.error('Error in addGalleryVisitors:', error);
  }
}

function setupEnvironment() {
  // Use a simple color background instead of environment map for better performance
  state.scene.background = new THREE.Color(0x111118);
  
  // Only set environment if reflections are enabled
  if (PERFORMANCE.reflections) {
    const envMap = new THREE.PMREMGenerator(state.renderer).fromScene(new THREE.Scene(), 0.5).texture;
    state.scene.environment = envMap;
  }
  
  // Update lighting
  updateLighting();
}

function setupRenderer() {
  // Create renderer with performance settings
  state.renderer = new THREE.WebGLRenderer({ 
    antialias: PERFORMANCE.antialias,
    powerPreference: 'high-performance',
    alpha: true
  });
  
  const pixelRatio = Math.min(window.devicePixelRatio, PERFORMANCE.maxPixelRatio);
  state.renderer.setPixelRatio(pixelRatio);
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Configure renderer for performance
  state.renderer.shadowMap.enabled = PERFORMANCE.shadows;
  state.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  state.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  state.renderer.toneMappingExposure = 1.2;
  state.renderer.outputColorSpace = THREE.SRGBColorSpace;
  
  // Enable WebGL 2.0 features if available
  if (state.renderer.capabilities.isWebGL2) {
    console.log('WebGL 2.0 is available');
  }
  
  document.body.appendChild(state.renderer.domElement);
  
  // Add stats
  document.body.appendChild(state.stats.dom);
  state.stats.dom.style.position = 'absolute';
  state.stats.dom.style.top = '10px';
  state.stats.dom.style.left = '10px';
}

function setupScene() {
  // Set a very dark background color
  state.scene.background = new THREE.Color(0x050508);
  
  // Add fog with a subtle blue tint
  state.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.06);
  
  // Set initial camera position
  state.camera.position.set(0, 1.6, 5);
  
  // Set renderer to work with fog
  state.renderer.setClearColor(state.scene.fog.color, 1);
  
  // Add a subtle ambient light to help with fog visibility
  const ambientLight = new THREE.AmbientLight(0x404060, 0.3);
  state.scene.add(ambientLight);
  
  // Add a subtle blue point light in the distance for atmosphere
  const pointLight = new THREE.PointLight(0x1a1a2e, 1, 50);
  pointLight.position.set(0, 5, -20);
  state.scene.add(pointLight);
}

function updateLighting() {
  // Clear existing lights
  const lights = [];
  state.scene.traverse((object) => {
    if (object.isLight) {
      lights.push(object);
    }
  });
  lights.forEach(light => state.scene.remove(light));
  
  // Main key light - simulates a soft gallery spotlight
  const keyLight = new THREE.DirectionalLight(0xfff9e6, 1.2);
  keyLight.position.set(5, 10, 5);
  keyLight.castShadow = true;
  
  // Optimized shadow properties
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 30;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.radius = 2; // Softer shadows
  
  // Adjust shadow camera frustum to cover only what's needed
  keyLight.shadow.camera.top = 15;
  keyLight.shadow.camera.bottom = -15;
  keyLight.shadow.camera.left = -15;
  keyLight.shadow.camera.right = 15;
  keyLight.shadow.camera.updateProjectionMatrix();
  
  // Fill light for softer shadows (no shadow casting)
  const fillLight = new THREE.DirectionalLight(0xe6f7ff, 0.6);
  fillLight.position.set(-5, 3, 5);
  
  // Rim/back light for better depth (no shadow casting)
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
  rimLight.position.set(0, 5, -10);
  
  // Ambient light for base illumination
  const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
  
  // Add all lights to the scene
  state.scene.add(keyLight, fillLight, rimLight, ambientLight);
  
  // Helpers for debugging shadows (uncomment if needed)
  // const helper = new THREE.CameraHelper(keyLight.shadow.camera);
  // state.scene.add(helper);
}

function setupLighting() {
  // Initial lighting setup (will be updated after model loads)
  updateLighting();
  
  // Add a subtle ambient occlusion effect
  const ambientOcclusion = new THREE.AmbientLight(0x404060, 0.2);
  state.scene.add(ambientOcclusion);
}

function setupFloor() {
  // Create a large plane for the floor with fog interaction
  const floorGeometry = new THREE.PlaneGeometry(100, 100);
  
  // Create a dark floor with some reflectivity
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.8,
    roughness: 0.2,
    envMapIntensity: 0.5
  });
  
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2; // Rotate to be horizontal
  
  // Position the floor slightly below ground level for better fog interaction
  floor.position.y = -0.1;
  
  // Enable fog for the floor
  floor.frustumCulled = false;
  floor.receiveShadow = true;
  state.scene.add(floor);
  
  // Add a subtle gradient to the floor to enhance depth perception
  const gradientTexture = new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==');
  gradientTexture.wrapS = gradientTexture.wrapT = THREE.RepeatWrapping;
  gradientTexture.repeat.set(10, 10);
  floorMaterial.map = gradientTexture;
  
  // Add a subtle grid helper
  const gridHelper = new THREE.GridHelper(60, 60, 0x444444, 0x222222);
  gridHelper.position.y = 0.01; // Slightly above the floor to avoid z-fighting
  state.scene.add(gridHelper);
  
  // Add a reflective plane for better reflections
  const reflector = new Reflector(floorGeometry, {
    clipBias: 0.003,
    textureWidth: window.innerWidth * window.devicePixelRatio,
    textureHeight: window.innerHeight * window.devicePixelRatio,
    color: 0x333333,
    recursion: 1
  });
  
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.y = 0.05; // Slightly above the floor
  state.scene.add(reflector);
  state.mirror = reflector; // Store reference for resizing
}

function createArtworks() {
  ARTWORKS.forEach((artworkData, index) => {
    const artwork = new Artwork(artworkData, index, ARTWORKS.length);
    state.artworks.push(artwork);
    state.scene.add(artwork.getGroup());
  });
}

function setupPlayer() {
  state.player = new PlayerController(state.camera, state.renderer.domElement);
}

function setupEventListeners() {
  window.addEventListener('resize', onWindowResize);
  const canvas = state.renderer.domElement;

  // Handle canvas click for pointer lock and artwork selection
  canvas.addEventListener('click', (event) => {
    // Handle left click for pointer lock
    if (event.button === 0) {
      if (!state.player.isLocked) {
        state.player.lock().catch(err => {
          console.error('Failed to lock pointer:', err);
        });
      } else {
        // If already locked, handle artwork click
        handleArtworkClick(event);
      }
    }
  }, false);
  
  // Handle right click for artwork info
  canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault(); // Prevent context menu
    if (state.player.isLocked) {
      handleArtworkClick(event);
    } else {
      state.player.lock().catch(console.error);
    }
    return false;
  });

  // Handle escape key to unlock
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.player.isLocked) {
      state.player.unlock().catch(console.error);
    }
  });

  // Handle keyboard events
  document.addEventListener('keydown', onKeyDown, false);
  document.addEventListener('keyup', onKeyUp, false);
  
  // Handle mouse move for hover effects
  document.addEventListener('mousemove', onPointerMove, false);

  // Instructions click handler
  const instructions = document.getElementById('instructions');
  if (instructions) {
    instructions.addEventListener('click', (event) => {
      if (event.button === 0) { // Left click only
        event.preventDefault();
        if (document.activeElement !== document.body) {
          document.body.focus();
        }
        if (state.player && !state.player.isLocked) {
          state.player.lock().catch(console.error);
        }
      }
    });
  }

  // Make canvas focusable
  canvas.tabIndex = 1000;
  canvas.style.outline = 'none';
  canvas.addEventListener('click', () => canvas.focus());
}

function onWindowResize() {
  // Update camera
  state.camera.aspect = window.innerWidth / window.innerHeight;
  state.camera.updateProjectionMatrix();
  
  // Update renderer
  state.renderer.setSize(window.innerWidth, window.innerHeight);
  
  // Update reflector texture size if it exists
  if (state.mirror) {
    state.mirror.getRenderTarget().setSize(
      window.innerWidth * window.devicePixelRatio,
      window.innerHeight * window.devicePixelRatio
    );
  }
}

function onKeyDown(event) {
  // Forward keydown events to the player controller if it exists and is locked
  if (state.player && state.player.isLocked) {
    state.player.onKeyDown(event);
  }
}

function onKeyUp(event) {
  // Forward keyup events to the player controller if it exists
  if (state.player) {
    state.player.onKeyUp(event);
  }
}

function onPointerMove(event) {
  if (!state.player || !state.player.isLocked) return;
  
  // Update the mouse position
  state.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  state.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Update the raycaster
  state.raycaster.setFromCamera(state.mouse, state.camera);
  
  // Reset all highlights
  state.artworks.forEach(artwork => artwork.setHighlight(false));
  
  // Check for intersections with all objects in the scene
  const intersects = state.raycaster.intersectObjects(state.scene.children, true);
  
  // Find the first intersection with an artwork
  let isHoveringArtwork = false;
  for (const intersect of intersects) {
    if (intersect.object.userData && intersect.object.userData.type === 'artwork') {
      // Find which artwork this belongs to
      const artwork = state.artworks.find(art => 
        art.getGroup().children.some(child => child === intersect.object || child.children.includes(intersect.object))
      );
      
      if (artwork) {
        artwork.setHighlight(true);
        isHoveringArtwork = true;
        break;
      }
    }
  }
  
  // Update cursor style
  document.body.style.cursor = isHoveringArtwork ? 'pointer' : 'default';
}

function handleArtworkClick(event) {
  if (!state.player || !state.player.isLocked) return;
  
  // Update the mouse position
  state.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  state.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
  // Update the raycaster
  state.raycaster.setFromCamera(state.mouse, state.camera);
  
  // Check for intersections with all objects in the scene
  const intersects = state.raycaster.intersectObjects(state.scene.children, true);
  
  // Find the first intersection with an artwork
  for (const intersect of intersects) {
    // Check if the intersected object is part of an artwork
    if (intersect.object.userData && intersect.object.userData.type === 'artwork') {
      const artworkData = intersect.object.userData.data;
      showArtworkInfo(artworkData.title, artworkData.artist);
      break;
    }
  }
}

function showArtworkInfo(title, artist) {
  const titleElement = document.getElementById('title');
  const artistElement = document.getElementById('artist');
  const infoPanel = document.getElementById('info-panel');
  
  if (!titleElement || !artistElement || !infoPanel) return;
  
  // Clear any existing timeouts to prevent hiding the panel too soon
  if (state.infoTimeout) {
    clearTimeout(state.infoTimeout);
    state.infoTimeout = null;
  }
  
  // Update the content with proper text handling
  titleElement.textContent = title || 'Untitled';
  artistElement.textContent = artist || 'Unknown Artist';
  
  // Show the panel with smooth transition
  infoPanel.classList.add('visible');
  
  // Auto-hide the panel after 5 seconds
  state.infoTimeout = setTimeout(() => {
    infoPanel.classList.remove('visible');
    state.infoTimeout = null;
  }, 5000);
}



/**
 * Main animation loop
 * Handles rendering and updates for each frame
 */
function animate() {
  requestAnimationFrame(animate);
  
  const delta = state.clock.getDelta();
  
  // Update player
  if (state.player) {
    state.player.update(delta);
  }
  
  // Update stats
  state.stats.update();
  
  // Update all visitors
  if (state.visitors) {
    state.visitors.forEach(visitor => visitor.update());
  }
  
  // Render the scene
  state.renderer.render(state.scene, state.camera);
  
  if (state.stats) state.stats.update();
}

// Start the application
init();

// Initialize title and artist with first artwork
document.getElementById('title').textContent = ARTWORKS[0].title;
document.getElementById('artist').textContent = ARTWORKS[0].artist;
