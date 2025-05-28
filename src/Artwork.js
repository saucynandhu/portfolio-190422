import * as THREE from 'three';

/**
 * Represents a piece of artwork in the 3D gallery
 * Handles creation, positioning, and interaction of artwork frames and images
 */
export class Artwork {
  /**
   * Create a new Artwork instance
   * @param {Object} data - Artwork metadata (image, title, artist)
   * @param {number} index - Position in the gallery circle
   * @param {number} total - Total number of artworks
   * @param {number} [radius=15] - Radius of the gallery circle
   */
  constructor(data, index, total, radius = 15) {
    this.data = data;
    this.index = index;
    this.total = total;
    this.radius = radius;
    this.group = new THREE.Group();
    this.isHovered = false;
    
    this.createArtwork();
  }
  
  /**
   * Creates the 3D representation of the artwork
   * Includes frame and image plane with proper materials and positioning
   */
  createArtwork() {
    // Calculate position in a circular arrangement
    const angle = (this.index / this.total) * Math.PI * 2;
    const x = Math.sin(angle) * this.radius;
    const z = Math.cos(angle) * this.radius;
    
    this.group.position.set(x, 1.6, z);
    this.group.lookAt(0, 1.6, 0);
    
    // Create artwork frame
    const frameGeometry = new THREE.BoxGeometry(3.2, 2.2, 0.1);
    const frameMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,    // Dark gray frame
      metalness: 0.3,     // Slight metallic sheen
      roughness: 0.8      // Mostly matte finish
    });
    
    this.frame = new THREE.Mesh(frameGeometry, frameMaterial);
    this.frame.castShadow = true;      // Frame casts shadows
    this.frame.receiveShadow = true;    // Frame receives shadows
    this.group.add(this.frame);
    
    // Create artwork image plane
    const artworkGeometry = new THREE.PlaneGeometry(3, 2);
    const texture = new THREE.TextureLoader().load(this.data.image);
    const artworkMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.7
    });
    
    this.artwork = new THREE.Mesh(artworkGeometry, artworkMaterial);
    this.artwork.position.z = 0.06; // Slightly in front of the frame
    this.artwork.castShadow = true;
    this.artwork.userData = { type: 'artwork', data: this.data };
    this.group.add(this.artwork);
    
    // Add hover effect
    this.originalScale = 1;
    this.highlightScale = 1.05;
    this.highlightColor = new THREE.Color(0xffffff);
    this.originalColor = new THREE.Color(0x333333);
  }
  
  update() {
    // Add any animation or update logic here
  }
  
  setHighlight(highlight) {
    if (highlight && !this.isHovered) {
      this.group.scale.set(
        this.highlightScale,
        this.highlightScale,
        this.highlightScale
      );
      this.frame.material.emissive.set(0x333333);
      this.isHovered = true;
    } else if (!highlight && this.isHovered) {
      this.group.scale.set(1, 1, 1);
      this.frame.material.emissive.set(0x000000);
      this.isHovered = false;
    }
  }
  
  showInfo() {
    // This will be called when the artwork is clicked
    return {
      title: this.data.title,
      artist: this.data.artist
    };
  }
  
  getGroup() {
    return this.group;
  }
  
  dispose() {
    // Clean up resources
    this.artwork.geometry.dispose();
    this.artwork.material.dispose();
    this.frame.geometry.dispose();
    this.frame.material.dispose();
    this.group.remove(this.artwork);
    this.group.remove(this.frame);
  }
}
