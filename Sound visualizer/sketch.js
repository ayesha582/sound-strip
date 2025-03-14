let mic, fft;
let strips = [];
let stripTemplate;
let glowBuffer;
let energy = {
  low: 0,
  mid: 0,
  high: 0,
};

// Configuration constants
const BASE_SPEED = 0.1; // Extremely slow base scrolling speed
const MAX_SPEED = 80; // Very high maximum speed with audio
const SPEED_SMOOTHING = 0.2; // Higher value for more responsive movement
const SOUND_THRESHOLD = 0.01; // Minimum sound level to trigger animation
const NUM_STRIPS = 11; // Number of vertical strips
const GLOW_OPACITY = 100; // Original glow opacity
const AUDIO_MULTIPLIER = 4.0; // High audio reactivity

function setup() {
  createCanvas(800, 1000);

  // Initialize Audio
  userStartAudio();
  mic = new p5.AudioIn();
  mic.start();

  fft = new p5.FFT(0.1, 512);
  fft.setInput(mic);

  // Create gradient strip template
  createStripTemplate();

  // Create glow buffer
  glowBuffer = createGraphics(width, height);

  // Create strips
  const stripWidth = width / NUM_STRIPS;
  for (let i = 0; i < NUM_STRIPS; i++) {
    strips.push(new Strip(i * stripWidth, stripWidth, i, NUM_STRIPS));
  }
}

function createStripTemplate() {
  stripTemplate = createGraphics(100, height);
  stripTemplate.noStroke();

  const cycleHeight = height / 2;
  const numSteps = 200;
  const stepHeight = cycleHeight / numSteps;

  for (let i = 0; i < numSteps; i++) {
    const pos = i / numSteps;
    let c;

    if (pos < 0.5) {
      if (pos < 0.2) {
        c = lerpColor(color(0), color(255, 60, 0), map(pos, 0, 0.2, 0, 1));
      } else if (pos < 0.35) {
        c = lerpColor(
          color(255, 60, 0),
          color(255, 180, 0),
          map(pos, 0.2, 0.35, 0, 1)
        );
      } else {
        c = lerpColor(
          color(255, 180, 0),
          color(255),
          map(pos, 0.35, 0.5, 0, 1)
        );
      }
    } else {
      if (pos < 0.65) {
        c = lerpColor(
          color(255),
          color(255, 170, 220),
          map(pos, 0.5, 0.65, 0, 1)
        );
      } else if (pos < 0.8) {
        c = lerpColor(
          color(255, 170, 220),
          color(30, 120, 255),
          map(pos, 0.65, 0.8, 0, 1)
        );
      } else {
        c = lerpColor(color(30, 120, 255), color(0), map(pos, 0.8, 1, 0, 1));
      }
    }

    stripTemplate.fill(c);
    stripTemplate.rect(0, i * stepHeight, 100, stepHeight + 1);
    stripTemplate.rect(0, i * stepHeight + cycleHeight, 100, stepHeight + 1);
  }
}

class Strip {
  constructor(x, w, index, totalStrips) {
    this.x = x;
    this.w = w;
    this.h = height;
    this.index = index;
    this.offset = 0;
    this.speed = BASE_SPEED;
    this.phase = random(TWO_PI);
    this.glowIntensity = 0;

    // Center influence calculation
    this.centerX = (totalStrips - 1) / 2;
    this.distFromCenter = (index - this.centerX) / this.centerX;
    this.centerInfluence = 1 - this.distFromCenter * this.distFromCenter;
  }

  update(amplitude) {
    let time = frameCount * 0.02;

    // Calculate speed based on audio input
    const audioInfluence =
      max(0, amplitude - SOUND_THRESHOLD) * 2 * AUDIO_MULTIPLIER;
    const targetSpeed =
      BASE_SPEED +
      (energy.low * 20 + energy.mid * 10 + energy.high * 5) *
        this.centerInfluence *
        audioInfluence;

    // Smooth speed transitions
    this.speed = lerp(
      this.speed,
      constrain(targetSpeed, BASE_SPEED, MAX_SPEED),
      SPEED_SMOOTHING
    );

    // Update position (always moving upward)
    this.offset += this.speed;

    // Update glow intensity with base glow and audio reactivity
    const baseGlow = sin(time + this.phase) * 0.3 + 0.7;
    const audioGlow = audioInfluence * this.centerInfluence;
    this.glowIntensity = lerp(this.glowIntensity, baseGlow + audioGlow, 0.1);
  }

  draw() {
    push();
    // Draw base gradient strips with proper repeating
    const cycleHeight = height / 2;
    const totalHeight = height + cycleHeight * 2; // Add extra height for smooth scrolling
    let yPos = (this.offset % cycleHeight) - cycleHeight;

    // Draw enough copies to fill the screen plus extra for smooth scrolling
    while (yPos < height) {
      image(stripTemplate, this.x, yPos, this.w, cycleHeight);
      yPos += cycleHeight;
    }

    // Draw glow effect
    if (this.glowIntensity > 0) {
      glowBuffer.noStroke();
      const glowColor = color(255, 255, 255, this.glowIntensity * GLOW_OPACITY);
      glowBuffer.fill(glowColor);
      glowBuffer.rect(this.x, 0, this.w, height);
    }
    pop();
  }
}

function draw() {
  background(0);

  // Clear glow buffer
  glowBuffer.clear();

  // Update audio analysis
  let spectrum = fft.analyze();
  energy.low = fft.getEnergy("bass") / 255;
  energy.mid = fft.getEnergy("mid") / 255;
  energy.high = fft.getEnergy("treble") / 255;

  let amplitude = mic.getLevel();

  // Update and draw strips
  for (let strip of strips) {
    strip.update(amplitude);
    strip.draw();
  }

  // Apply glow effect with blur
  push();
  drawingContext.filter = "blur(10px)";
  image(glowBuffer, 0, 0);
  drawingContext.filter = "none";
  pop();
}

function mousePressed() {
    if (!mic.enabled) {
        userStartAudio();
        mic.start();
    }
}