import * as THREE from 'three';

export class AudioManager {
  constructor() {
    this.audioLoader = new THREE.AudioLoader();
    this.listener = new THREE.AudioListener();
    this.backgroundMusic = null;
    this.html5Audio = document.getElementById('background-music');
    this.isMuted = false;
    this.audioContext = null;
    this.useHtml5Fallback = false;
    
    // Create UI elements
    this.createUI();
    
    // Try to use Web Audio API first, fall back to HTML5 Audio if needed
    this.initializeAudio();
  }
  
  initializeAudio() {
    // First try to use Web Audio API
    try {
      // Create audio context on user interaction
      const initAudio = () => {
        if (this.audioContext) return;
        
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.backgroundMusic = new THREE.Audio(this.listener);
        this.loadWebAudio();
        
        // Remove event listeners after first interaction
        window.removeEventListener('click', initAudio);
        window.removeEventListener('keydown', initAudio);
      };
      
      // Add event listeners for user interaction
      window.addEventListener('click', initAudio, { once: true });
      window.addEventListener('keydown', initAudio, { once: true });
      
      // Set a timeout to fall back to HTML5 Audio if Web Audio fails
      setTimeout(() => {
        if (!this.backgroundMusic || !this.backgroundMusic.buffer) {
          console.log('Falling back to HTML5 Audio');
          this.useHtml5Fallback = true;
          this.setupHtml5Audio();
        }
      }, 1000);
    } catch (error) {
      console.error('Error initializing Web Audio, falling back to HTML5 Audio:', error);
      this.useHtml5Fallback = true;
      this.setupHtml5Audio();
    }
  }
  
  setupHtml5Audio() {
    if (!this.html5Audio) {
      console.error('HTML5 Audio element not found');
      return;
    }
    
    // Set volume to 50%
    this.html5Audio.volume = 0.5;
    
    // Try to play the audio
    const playPromise = this.html5Audio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Error playing HTML5 audio:', error);
      });
    }
  }
  
  loadWebAudio() {
    if (this.useHtml5Fallback) return;
    
    console.log('Loading Web Audio...');
    
    // Try different paths to find the music file
    const possiblePaths = [
      '/music.mp3',
      './music.mp3',
      'public/music.mp3',
      '/public/music.mp3',
      `${window.location.origin}/music.mp3`,
      `${window.location.origin}/public/music.mp3`
    ];
    
    console.log('Attempting to load music from possible paths:', possiblePaths);
    
    // Try loading from each path until one works
    const tryLoadMusic = (index = 0) => {
      if (index >= possiblePaths.length) {
        console.error('Failed to load music from all paths, falling back to HTML5 Audio');
        this.useHtml5Fallback = true;
        this.setupHtml5Audio();
        return;
      }
      
      const path = possiblePaths[index];
      console.log(`Trying to load music from: ${path}`);
      
      this.audioLoader.load(
        path,
        (buffer) => {
          console.log(`Successfully loaded music from: ${path}`);
          this.backgroundMusic.setBuffer(buffer);
          this.backgroundMusic.setLoop(true);
          this.backgroundMusic.setVolume(0.1);
          
          if (!this.isMuted) {
            console.log('Playing Web Audio...');
            const playPromise = this.backgroundMusic.play();
            
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.error('Error playing Web Audio, falling back to HTML5 Audio:', error);
                this.useHtml5Fallback = true;
                this.setupHtml5Audio();
              });
            }
          }
        },
        undefined, // Progress callback
        (error) => {
          console.error(`Failed to load from ${path}:`, error);
          // Try next path on error
          tryLoadMusic(index + 1);
        }
      );
    };
    
    // Start trying to load the music
    tryLoadMusic();
  }
  
  createUI() {
    // Create mute button container
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '1000';
    
    // Create mute button
    this.muteButton = document.createElement('button');
    this.muteButton.innerHTML = '🔊 Mute';
    this.muteButton.style.padding = '10px 15px';
    this.muteButton.style.borderRadius = '20px';
    this.muteButton.style.border = 'none';
    this.muteButton.style.background = 'rgba(0, 0, 0, 0.6)';
    this.muteButton.style.color = 'white';
    this.muteButton.style.cursor = 'pointer';
    this.muteButton.style.fontSize = '14px';
    this.muteButton.style.transition = 'all 0.3s ease';
    
    // Add hover effect
    this.muteButton.addEventListener('mouseover', () => {
      this.muteButton.style.background = 'rgba(0, 0, 0, 0.8)';
      this.muteButton.style.transform = 'scale(1.05)';
    });
    
    this.muteButton.addEventListener('mouseout', () => {
      this.muteButton.style.background = 'rgba(0, 0, 0, 0.6)';
      this.muteButton.style.transform = 'scale(1)';
    });
    
    // Toggle mute on click
    this.muteButton.addEventListener('click', () => this.toggleMute());
    
    container.appendChild(this.muteButton);
    document.body.appendChild(container);
  }
  
  toggleMute() {
    this.isMuted = !this.isMuted;
    
    if (this.useHtml5Fallback) {
      // Handle HTML5 Audio
      if (!this.html5Audio) return;
      
      if (this.isMuted) {
        this.html5Audio.pause();
        this.muteButton.innerHTML = '🔇 Unmute';
      } else {
        this.html5Audio.play().catch(error => {
          console.error('Error playing HTML5 audio:', error);
        });
        this.muteButton.innerHTML = '🔊 Mute';
      }
    } else {
      // Handle Web Audio
      if (!this.backgroundMusic) return;
      
      if (this.isMuted) {
        this.backgroundMusic.pause();
        this.muteButton.innerHTML = '🔇 Unmute';
      } else {
        // If audio context is suspended, resume it
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        this.backgroundMusic.play().catch(error => {
          console.error('Error playing Web Audio, falling back to HTML5 Audio:', error);
          this.useHtml5Fallback = true;
          this.setupHtml5Audio();
        });
        this.muteButton.innerHTML = '🔊 Mute';
      }
    }
  }
}

// Create a singleton instance
export const audioManager = new AudioManager();
