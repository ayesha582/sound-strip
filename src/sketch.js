let mic, fft;
let stripPattern;  // Single strip pattern
let glowBuffer;
let audioInitialized = false;
let strips = [];  // Keep track of individual strip states
let energy = {
    low: 0,
    mid: 0,
    high: 0
};

// Configuration constants - matching original
const BASE_SPEED = 0.1;
const MAX_SPEED = 80;
const SPEED_SMOOTHING = 0.2;
const SOUND_THRESHOLD = 0.01;
const GLOW_OPACITY = 100;
const AUDIO_MULTIPLIER = 4.0;

// Dimensions
let canvasWidth;
let canvasHeight;
let NUM_STRIPS;
let stripWidth;

class Strip {
    constructor(x, w, index, totalStrips) {
        this.x = x;
        this.w = w;
        this.h = height;
        this.index = index;
        this.offset = 0;
        this.speed = BASE_SPEED;
        this.phase = random(TWO_PI);  // Important for floating effect
        this.glowIntensity = 0;

        // Center influence calculation - crucial for arc movement
        this.centerX = (totalStrips - 1) / 2;
        this.distFromCenter = (index - this.centerX) / this.centerX;
        this.centerInfluence = 1 - this.distFromCenter * this.distFromCenter;
    }

    update(amplitude) {
        let time = frameCount * 0.02;

        // Calculate speed based on audio input
        const audioInfluence = max(0, amplitude - SOUND_THRESHOLD) * 2 * AUDIO_MULTIPLIER;
        const targetSpeed = BASE_SPEED +
            (energy.low * 20 + energy.mid * 10 + energy.high * 5) *
            this.centerInfluence *
            audioInfluence;

        // Smooth speed transitions
        this.speed = lerp(
            this.speed,
            constrain(targetSpeed, BASE_SPEED, MAX_SPEED),
            SPEED_SMOOTHING
        );

        // Update position
        this.offset += this.speed;

        // Update glow intensity with base glow and audio reactivity
        const baseGlow = sin(time + this.phase) * 0.3 + 0.7;
        const audioGlow = audioInfluence * this.centerInfluence;
        this.glowIntensity = lerp(this.glowIntensity, baseGlow + audioGlow, 0.1);
    }

    draw() {
        const cycleHeight = height / 2;
        let yPos = (this.offset % cycleHeight) - cycleHeight;

        // Draw the optimized pattern with repeats
        while (yPos < height) {
            image(stripPattern, this.x, yPos, this.w, cycleHeight);
            yPos += cycleHeight;
        }

        // Add glow effect
        if (this.glowIntensity > 0) {
            glowBuffer.noStroke();
            const glowColor = color(255, 255, 255, this.glowIntensity * GLOW_OPACITY);
            glowBuffer.fill(glowColor);
            glowBuffer.rect(this.x, 0, this.w, height);
        }
    }
}

function calculateDimensions() {
    canvasWidth = windowWidth;
    canvasHeight = windowHeight;
    NUM_STRIPS = windowWidth < 768 ? 7 : 11;
    stripWidth = canvasWidth / NUM_STRIPS;
}

function setup() {
    calculateDimensions();
    let canvas = createCanvas(canvasWidth, canvasHeight);
    
    const startButton = document.getElementById('startButton');
    startButton.addEventListener('click', initializeAudio);

    createStripPattern();
    glowBuffer = createGraphics(width, height);
    initializeStrips();

    window.addEventListener('resize', debounce(windowResized, 250));
}

function createStripPattern() {
    stripPattern = createGraphics(100, height);
    stripPattern.noStroke();

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
                c = lerpColor(color(255, 60, 0), color(255, 180, 0), map(pos, 0.2, 0.35, 0, 1));
            } else {
                c = lerpColor(color(255, 180, 0), color(255), map(pos, 0.35, 0.5, 0, 1));
            }
        } else {
            if (pos < 0.65) {
                c = lerpColor(color(255), color(255, 170, 220), map(pos, 0.5, 0.65, 0, 1));
            } else if (pos < 0.8) {
                c = lerpColor(color(255, 170, 220), color(30, 120, 255), map(pos, 0.65, 0.8, 0, 1));
            } else {
                c = lerpColor(color(30, 120, 255), color(0), map(pos, 0.8, 1, 0, 1));
            }
        }

        stripPattern.fill(c);
        stripPattern.rect(0, i * stepHeight, 100, stepHeight + 1);
        stripPattern.rect(0, i * stepHeight + cycleHeight, 100, stepHeight + 1);
    }
}

function initializeStrips() {
    strips = [];
    const stripWidth = width / NUM_STRIPS;
    for (let i = 0; i < NUM_STRIPS; i++) {
        strips.push(new Strip(i * stripWidth, stripWidth, i, NUM_STRIPS));
    }
}

async function initializeAudio() {
    try {
        await getAudioContext().resume();
        mic = new p5.AudioIn();
        await mic.start();
        
        fft = new p5.FFT(0.1, 512);
        fft.setInput(mic);
        
        audioInitialized = true;
        document.getElementById('startButton').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
    } catch (error) {
        console.error('Audio initialization error:', error);
        document.getElementById('errorMessage').textContent = 
            'Error accessing microphone. Please check permissions and try again.';
        document.getElementById('errorMessage').style.display = 'block';
    }
}

function windowResized() {
    calculateDimensions();
    resizeCanvas(canvasWidth, canvasHeight);
    glowBuffer = createGraphics(width, height);
    createStripPattern();
    initializeStrips();
}

function debounce(func, wait) {
    let timeout;
    return function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, arguments), wait);
    };
}

function draw() {
    background(0);
    glowBuffer.clear();

    let amplitude = 0;
    if (audioInitialized && mic.enabled) {
        let spectrum = fft.analyze();
        energy.low = fft.getEnergy("bass") / 255;
        energy.mid = fft.getEnergy("mid") / 255;
        energy.high = fft.getEnergy("treble") / 255;
        amplitude = mic.getLevel();
    }

    // Update and draw strips
    for (let strip of strips) {
        strip.update(amplitude);
        strip.draw();
    }

    // Apply glow effect with original blur
    push();
    drawingContext.filter = 'blur(10px)';
    image(glowBuffer, 0, 0);
    drawingContext.filter = 'none';
    pop();
}