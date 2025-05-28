import * as THREE from 'three';

/**
 * Collection of random thoughts for gallery visitors
 * These will be displayed in thought bubbles above visitors' heads
 */
const THOUGHTS = [
  "What an interesting piece...",
  "Fascinating artwork!",
  "I love the colors in this one.",
  "This reminds me of something...",
  "How creative!",
  "I could look at this all day.",
  "The artist is very talented.",
  "This speaks to me.",
  "What was the inspiration?",
  "I wonder how long this took "
];

// Default thought (legacy support)
const THOUGHT = THOUGHTS[0];

/**
 * Represents a visitor in the 3D gallery
 * Handles visitor appearance, animations, and thought bubbles
 */
export class GalleryVisitor {
  constructor() {
    this.group = new THREE.Group();
    this.mixer = null;
    this.clock = new THREE.Clock();
    this.thoughtBubble = null;
    this.thoughtTimeout = null;
    this.setupVisitor();
    this.setupThoughtBubble();
    this.showRandomThought();
  }

  setupVisitor() {
    // Create a group for the entire character
    this.character = new THREE.Group();
    
    // Body - Changed to cone
    const bodyGeometry = new THREE.ConeGeometry(0.4, 1.2, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x888888, // Medium grey
      metalness: 0.2,
      roughness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI; // Rotate to point up
    body.position.y = 0.6; // Adjust height
    this.character.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x888888, // Same grey as body
      roughness: 0.8
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.3; // Slightly higher to sit on top of cone
    this.character.add(head);
    
    // Legs - simplified since we have a cone body
    const legGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.15);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    
    
    
    // Add character to group
    this.group.add(this.character);
    
    // Simple head movement
    this.headBob = 0;
    this.head = head; // Store reference to head for animation
  }
  

  
  update() {
    // Simple head bobbing animation
    this.headBob += 0.05;
    
    // Slight body sway
    this.character.rotation.z = Math.sin(this.headBob * 0.5) * 0.02;
    
    // Head movement
    if (this.head) {
      this.head.rotation.z = Math.sin(this.headBob) * 0.1;
      this.head.rotation.x = Math.sin(this.headBob * 0.5) * 0.05;
    }
    
    // Make bubble face camera if it exists
    if (this.thoughtBubble && window.state && window.state.camera) {
      const camera = window.state.camera;
      // Make the bubble face the camera while maintaining upright orientation
      this.thoughtBubble.quaternion.copy(camera.quaternion);
    }
  }
  
  setupThoughtBubble() {
    try {
      console.log('Setting up thought bubble...');
      
      // Create a larger canvas for better text quality
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      
      const context = canvas.getContext('2d');
      if (!context) {
        console.error('Could not get 2D context for thought bubble');
        return;
      }
      
      // Create a texture from the canvas
      const texture = new THREE.CanvasTexture(canvas);
      texture.encoding = THREE.sRGBEncoding;
      texture.anisotropy = 4; // Improve texture quality
      
      // Create sprite material with better rendering settings
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.95,
        depthTest: true,
        depthWrite: false,
        fog: false
      });
      
      // Create the thought bubble sprite
      this.thoughtBubble = new THREE.Sprite(material);
      this.thoughtBubble.scale.set(1.5, 0.8, 1); // Smaller, more compact bubble
      this.thoughtBubble.renderOrder = 999; // Make sure it renders on top
      this.thoughtBubble.visible = false;
      
      // Add to character group so it moves with the character
      this.character.add(this.thoughtBubble);
      
      // Position above the character's head
      this.thoughtBubble.position.y = 1.8; // Adjust this value to position above head
      
      console.log('Thought bubble created');
      
      // Initial draw
      this.updateThoughtBubble(THOUGHT);
    } catch (error) {
      console.error('Error setting up thought bubble:', error);
    }
  }
  
  updateThoughtBubble(text) {
    try {
      if (!this.thoughtBubble || !this.thoughtBubble.material || !this.thoughtBubble.material.map) {
        console.warn('Thought bubble or its material not ready');
        return;
      }
      
      const canvas = this.thoughtBubble.material.map.image;
      const ctx = canvas.getContext('2d');
      
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set up text styling
      const fontSize = 24; // Slightly larger font for better readability
      const padding = 30;  // More padding around text
      const maxWidth = 300; // Maximum width for text
      const lineHeight = fontSize * 1.4; // Line spacing
      const maxLines = 3; // Maximum number of lines to display
      
      // Set font for measurement
      ctx.font = `500 ${fontSize}px 'Arial', sans-serif`;
      
      // Split text into words and create lines
      const words = text.split(' ');
      let line = '';
      const lines = [];
      
      // Create lines of text that fit within maxWidth
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        
        if ((metrics.width <= maxWidth) || line === '') {
          line = testLine;
        } else {
          lines.push(line);
          line = word;
          
          // Don't process more lines than needed
          if (lines.length >= maxLines) break;
        }
      }
      
      // Add the last line if we have space
      if (line && lines.length < maxLines) {
        lines.push(line);
      } else if (lines.length >= maxLines) {
        // Truncate last line with ellipsis if needed
        const lastLine = lines[lines.length - 1];
        if (lastLine.length > 15) {
          lines[lines.length - 1] = lastLine.substring(0, 15) + '...';
        }
      }
      
      // Calculate bubble dimensions
      const textHeight = lines.length * lineHeight;
      const bubbleWidth = Math.min(Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2, 400);
      const bubbleHeight = Math.max(textHeight + padding * 2, 80);
      
      // Update bubble size
      this.thoughtBubble.scale.set(bubbleWidth / 100, bubbleHeight / 100, 1);
      
      // Draw bubble background with shadow
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radiusX = bubbleWidth / 2.5;
      const radiusY = bubbleHeight / 2.5;
      
      // Draw bubble with shadow and highlight
      ctx.save();
      
      // Outer glow
      ctx.shadowColor = 'rgba(100, 149, 237, 0.6)';
      ctx.shadowBlur = 15;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      
      // Bubble fill with gradient
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radiusX
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      gradient.addColorStop(1, 'rgba(240, 248, 255, 0.95)');
      
      // Draw bubble
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Bubble border
      ctx.strokeStyle = 'rgba(200, 220, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw text with subtle shadow for better readability
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      
      ctx.fillStyle = '#2c3e50'; // Dark blue-gray for better contrast
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
      
      // Draw each line of text
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], centerX, startY + (i * lineHeight));
      }
      
      ctx.restore(); // Restore shadow settings
      ctx.restore(); // Restore from bubble drawing
      
      // Update the texture
      this.thoughtBubble.material.map.needsUpdate = true;
      
    } catch (error) {
      console.error('Error updating thought bubble:', error);
    }
  }
  
  // Helper function to draw rounded rectangles
  drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke, strokeWidth) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    
    if (stroke && strokeWidth) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = strokeWidth;
      ctx.stroke();
    }
  }
  
  // Show a random thought from the THOUGHTS array
  showRandomThought() {
    if (!this.thoughtBubble || !THOUGHTS || !Array.isArray(THOUGHTS) || THOUGHTS.length === 0) {
      console.warn('Thought bubble or thoughts not available');
      return;
    }
    
    const thought = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)];
    this.updateThoughtBubble(thought);
    
    // Schedule next thought
    clearTimeout(this.thoughtTimeout);
    this.thoughtTimeout = setTimeout(() => {
      this.showRandomThought();
    }, 5000 + Math.random() * 5000); // 5-10 seconds between thoughts
  }
  
  // Initialize the visitor
  init() {
    try {
      // Clear any existing timeout
      if (this.thoughtTimeout) {
        clearTimeout(this.thoughtTimeout);
      }
      
      // Make sure thought bubble exists
      if (!this.thoughtBubble) {
        console.warn('Thought bubble not initialized, recreating...');
        this.setupThoughtBubble();
        
        // If still no thought bubble after recreation, give up
        if (!this.thoughtBubble) {
          console.error('Failed to create thought bubble');
          return;
        }
      }
      
      // Update and show the thought bubble
      this.updateThoughtBubble(THOUGHT);
      this.thoughtBubble.visible = true;
      console.log('Showing thought bubble');
      
      // Schedule next thought (using the same thought)
      this.thoughtTimeout = setTimeout(() => {
        try {
          if (this.thoughtBubble) {
            this.thoughtBubble.visible = false;
          }
          // Schedule next thought
          this.showRandomThought();
        } catch (e) {
          console.error('Error in thought timeout handler:', e);
        }
      }, 5000);
      
    } catch (error) {
      console.error('Error in showRandomThought:', error);
    }
  }
  
  getMesh() {
    return this.group;
  }
  
  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }
  
  lookAt(target) {
    this.group.lookAt(target);
  }
}
