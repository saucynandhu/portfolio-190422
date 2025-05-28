import * as THREE from 'three';

/**
 * Handles player movement and camera controls
 * Manages keyboard/mouse input and updates camera position/orientation
 */
export class PlayerController {
  /**
   * Create a new PlayerController
   * @param {THREE.PerspectiveCamera} camera - The camera to control
   * @param {HTMLElement} domElement - The DOM element for event listeners
   */
  constructor(camera, domElement) {
    // Camera and DOM references
    this.camera = camera;
    this.domElement = domElement || document.body;
    
    // Movement parameters
    this.moveSpeed = 0.1;         // Movement speed in units per frame
    this.rotationSpeed = 0.002;    // Mouse look sensitivity
    
      // Movement state flags
    this.moveForward = false;   // W/Up arrow pressed
    this.moveBackward = false;  // S/Down arrow pressed
    this.moveLeft = false;      // A/Left arrow pressed
    this.moveRight = false;     // D/Right arrow pressed
    this.isLocked = false;      // Pointer lock active
    
      // Movement vectors
    this.velocity = new THREE.Vector3();   // Current movement vector
    this.direction = new THREE.Vector3();  // Current look direction
    this.target = new THREE.Vector3();     // Camera look-at target
    
    // Initialize camera position and target
    this.camera.position.set(0, 1.6, 5);
    
    // Bind methods
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.lock = this.lock.bind(this);
    this.unlock = this.unlock.bind(this);
    this.onPointerlockChange = this.onPointerlockChange.bind(this);
    this.onPointerlockError = this.onPointerlockError.bind(this);
    
    this.initEventListeners();
    this.updateTarget();
  }
  
  initEventListeners() {
    this.domElement.addEventListener('click', this.lock);
    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerlockChange);
    document.addEventListener('pointerlockerror', this.onPointerlockError);
  }
  
  onKeyDown(event) {
    switch (event.code) {
      case 'KeyW': case 'ArrowUp':    this.moveForward = true; break;
      case 'KeyS': case 'ArrowDown':  this.moveBackward = true; break;
      case 'KeyA': case 'ArrowLeft':  this.moveRight = true; break;
      case 'KeyD': case 'ArrowRight': this.moveLeft = true; break;
      case 'Escape': this.unlock(); break;
    }
  }
  
  onKeyUp(event) {
    switch (event.code) {
      case 'KeyW': case 'ArrowUp':    this.moveForward = false; break;
      case 'KeyS': case 'ArrowDown':  this.moveBackward = false; break;
      case 'KeyA': case 'ArrowLeft':  this.moveRight = false; break;
      case 'KeyD': case 'ArrowRight': this.moveLeft = false; break;
    }
  }
  
  lock() {
    return new Promise((resolve, reject) => {
      this.domElement.requestPointerLock = this.domElement.requestPointerLock ||
        this.domElement.mozRequestPointerLock ||
        this.domElement.webkitRequestPointerLock;
      
      if (this.domElement.requestPointerLock) {
        const onLock = () => {
          this.isLocked = true;
          resolve();
          this.domElement.removeEventListener('pointerlockchange', onLock);
        };
        
        this.domElement.addEventListener('pointerlockchange', onLock, { once: true });
        this.domElement.requestPointerLock();
      } else {
        reject(new Error('Pointer Lock API not supported'));
      }
    });
  }
  
  unlock() {
    return new Promise((resolve) => {
      document.exitPointerLock = document.exitPointerLock ||
        document.mozExitPointerLock ||
        document.webkitExitPointerLock;
      
      if (document.exitPointerLock) {
        const onUnlock = () => {
          this.isLocked = false;
          resolve();
          document.removeEventListener('pointerlockchange', onUnlock);
        };
        
        document.addEventListener('pointerlockchange', onUnlock, { once: true });
        document.exitPointerLock();
      } else {
        this.isLocked = false;
        resolve();
      }
    });
  }

  onPointerlockChange() {
    const wasLocked = this.isLocked;
    this.isLocked = document.pointerLockElement === this.domElement;
    
    // Only update UI if the lock state actually changed
    if (wasLocked !== this.isLocked) {
      // Show/hide UI elements
      const blocker = document.getElementById('blocker');
      if (blocker) {
        blocker.style.display = this.isLocked ? 'none' : 'block';
      }
      
      // Show/hide crosshair
      const crosshair = document.getElementById('crosshair');
      if (crosshair) {
        crosshair.style.display = this.isLocked ? 'block' : 'none';
      }
    }
  }
  
  onPointerlockError() {
    console.error('PointerLockControls: Unable to use Pointer Lock API');
  }

  onMouseMove(event) {
    if (!this.isLocked) return;
    
    const movementX = event.movementX || 0;
    
    // Rotate around Y axis (yaw)
    // Instead of modifying camera.rotation directly, we'll use a target vector
    this.yaw = (this.yaw || 0) - movementX * this.rotationSpeed;
    
    // Update the camera's look direction based on yaw
    this.updateTarget();
  }
  
  updateTarget() {
    // Calculate direction based on yaw
    this.direction.set(
      Math.sin(this.yaw || 0),
      0,
      Math.cos(this.yaw || 0)
    ).normalize();
    
    // Update target point in front of camera
    this.target.copy(this.camera.position).add(this.direction);
    
    // Use lookAt to point the camera at the target
    this.camera.lookAt(this.target);
  }

  update(delta) {
    if (!this.isLocked) return;
    
    // Reset velocity
    this.velocity.set(0, 0, 0);
    
    // Calculate movement direction based on yaw
    const forward = new THREE.Vector3(
      Math.sin(this.yaw || 0),
      0,
      Math.cos(this.yaw || 0)
    ).normalize();
    
    const right = new THREE.Vector3(
      Math.sin((this.yaw || 0) + Math.PI/2),
      0,
      Math.cos((this.yaw || 0) + Math.PI/2)
    ).normalize();
    
    // Apply movement based on key states
    if (this.moveForward) this.velocity.add(forward);
    if (this.moveBackward) this.velocity.sub(forward);
    if (this.moveLeft) this.velocity.sub(right);
    if (this.moveRight) this.velocity.add(right);
    
    // Normalize and scale by speed if moving
    if (this.velocity.lengthSq() > 0) {
      this.velocity.normalize();
      this.velocity.multiplyScalar(this.moveSpeed);
      
      // Update camera position
      this.camera.position.add(this.velocity);
      
      // Update target to maintain look direction
      this.updateTarget();
    }
  }
  
  dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerlockChange);
    document.removeEventListener('pointerlockerror', this.onPointerlockError);
    this.domElement.removeEventListener('click', this.lock);
    this.unlock();
  }
}
