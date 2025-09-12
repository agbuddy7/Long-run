class DinoGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.gameOverElement = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');
        
        // Game state
        this.gameRunning = false;
        this.gameOver = false;
        this.score = 0;
        this.highScore = localStorage.getItem('dinoHighScore') || 0;
        this.gameSpeed = 4;
        this.gravity = 0.6;
        
        // Dino properties
        this.dino = {
            x: 100,
            y: 120,
            width: 30,
            height: 30,
            normalHeight: 30,
            duckHeight: 15,
            dy: 0,
            jumpPower: 16,
            grounded: false,
            ducking: false,
            currentBuilding: null
        };
        
        // Pacman chaser
        this.pacman = {
            x: -120, // Start mostly off-screen
            y: this.canvas.height / 2,
            size: 80,
            speed: 4, // Same initial speed as game
            mouthPhase: 0, // For mouth animation
            isActive: true,
            cycleCount: 0 // Track how many times it has cycled
        };
        
        // Buildings array
        this.buildings = [];
        this.buildingTimer = 0;
        this.buildingInterval = 100;
        this.lastBuildingEnd = 0;
        
        // Traction beams array
        this.tractionBeams = [];
        
        // Stars array
        this.stars = [];
        this.initStars();
        
        // Initialize first building
        this.initializeBuildings();
        this.updateHighScore();
        this.bindEvents();
        this.gameLoop();
    }
    
    initStars() {
        for (let i = 0; i < 60; i++) {
            this.stars.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height * 0.7,
                size: 1 + Math.random() * 2
            });
        }
    }
    
    // Calculate maximum jumpable gap based on current game speed
    getMaxJumpableGap() {
        const jumpTime = (2 * this.dino.jumpPower) / this.gravity;
        const maxDistance = this.gameSpeed * jumpTime;
        return maxDistance * 0.8;
    }
    
    initializeBuildings() {
        // Create initial buildings to cover the screen
        let currentX = 0;
        while (currentX < this.canvas.width + 200) {
            const building = this.createBuilding(currentX);
            this.buildings.push(building);
            currentX = building.x + building.width;
        }
        this.lastBuildingEnd = currentX;
    }
    
    createBuilding(startX) {
        const minHeight = 80;
        const maxHeight = 160;
        const minWidth = 60;
        const maxWidth = 150;
        
        // Sometimes create a gap (no building)
        const shouldCreateGap = Math.random() < 0.3 && startX > 200;
        
        if (shouldCreateGap) {
            const maxGap = this.getMaxJumpableGap();
            const minGap = Math.min(30, maxGap * 0.4);
            const gapWidth = minGap + Math.random() * (maxGap - minGap);
            
            return {
                x: startX,
                y: this.canvas.height,
                width: gapWidth,
                height: 0,
                isGap: true
            };
        } else {
            const height = minHeight + Math.random() * (maxHeight - minHeight);
            const width = minWidth + Math.random() * (maxWidth - minWidth);
            
            // Sometimes add a traction beam above this building
            if (Math.random() < 0.15 && startX > 300) { // 15% chance after initial area
                this.createTractionBeam(startX, width, height);
            }
            
            return {
                x: startX,
                y: this.canvas.height - height,
                width: width,
                height: height,
                isGap: false
            };
        }
    }
    
    createTractionBeam(buildingX, buildingWidth, buildingHeight) {
        const beamWidth = 20 + Math.random() * 30; // Random beam width
        const beamX = buildingX + (buildingWidth - beamWidth) / 2; // Center on building
        const beamBottom = this.canvas.height - buildingHeight;
        const beamHeight = this.canvas.height; // Height of the beam
        
        this.tractionBeams.push({
            x: beamX,
            y: beamBottom - beamHeight,
            width: beamWidth,
            height: beamHeight,
            opacity: 0.7 + Math.random() * 0.3,
            pulsePhase: Math.random() * Math.PI * 2
        });
    }
    
    bindEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                e.preventDefault();
                if (!this.gameRunning && !this.gameOver) {
                    this.startGame();
                } else if (this.gameRunning) {
                    this.jump();
                }
            }
            
            if (e.code === 'ArrowDown') {
                e.preventDefault();
                if (this.gameRunning) {
                    this.duck(true);
                }
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowDown') {
                e.preventDefault();
                this.duck(false);
            }
        });
        
        this.canvas.addEventListener('click', () => {
            if (!this.gameRunning && !this.gameOver) {
                this.startGame();
            } else if (this.gameRunning) {
                this.jump();
            }
        });
    }
    
    startGame() {
        this.gameRunning = true;
        this.gameOver = false;
        this.score = 0;
        this.gameSpeed = 4;
        this.buildingTimer = 0;
        
        // Reset dino position
        this.dino.y = 120;
        this.dino.dy = 0;
        this.dino.x = 350;
        this.dino.grounded = false;
        this.dino.ducking = false;
        this.dino.height = this.dino.normalHeight;
        this.dino.currentBuilding = null;
        
        // Reset Pacman
        this.pacman.x = -120;
        this.pacman.y = this.canvas.height / 2;
        this.pacman.speed = 4;
        this.pacman.mouthPhase = 0;
        this.pacman.isActive = true;
        this.pacman.cycleCount = 0;
        
        // Reset buildings and beams
        this.buildings = [];
        this.tractionBeams = [];
        this.lastBuildingEnd = 0;
        this.initializeBuildings();
        
        this.gameOverElement.style.display = 'none';
    }
    
    jump() {
        if (this.dino.grounded && !this.dino.ducking) {
            this.dino.dy = -this.dino.jumpPower;
            this.dino.grounded = false;
        }
    }
    
    duck(isDucking) {
        if (this.dino.grounded) {
            this.dino.ducking = isDucking;
            if (isDucking) {
                const heightDifference = this.dino.normalHeight - this.dino.duckHeight;
                this.dino.height = this.dino.duckHeight;
                if (this.dino.currentBuilding) {
                    this.dino.y = this.dino.currentBuilding.y - this.dino.height;
                }
            } else {
                this.dino.height = this.dino.normalHeight;
                if (this.dino.currentBuilding) {
                    this.dino.y = this.dino.currentBuilding.y - this.dino.height;
                }
            }
        }
    }
    
    updatePacman() {
        if (!this.pacman.isActive) return;
        
        // Update Pacman speed to match game speed
        this.pacman.speed = this.gameSpeed;
        
        // Move Pacman forward
        this.pacman.x += this.pacman.speed;
        
        // Check if Pacman has gone off-screen to the right
        if (this.pacman.x > this.canvas.width + this.pacman.size) {
            // Reset Pacman to start from the left again
            this.pacman.x = -this.pacman.size - 50; // Start further off-screen
            this.pacman.cycleCount++;
            
            // Optional: Change Pacman's vertical position for variety
            const positions = [
                this.canvas.height * 0.3,   // Upper position
                this.canvas.height * 0.5,   // Middle position
                this.canvas.height * 0.7    // Lower position
            ];
            this.pacman.y = positions[this.pacman.cycleCount % positions.length];
        }
        
        // Animate mouth
        this.pacman.mouthPhase += 0.2;
        
        // Add slight vertical bobbing effect
        const baseY = this.pacman.y;
        this.pacman.y = baseY + Math.sin(this.pacman.mouthPhase * 0.5) * 10;
    }
    
    updateDino() {
        // Apply gravity
        this.dino.dy += this.gravity;
        this.dino.y += this.dino.dy;
        
        // Find current building under dino
        this.dino.currentBuilding = null;
        for (let building of this.buildings) {
            if (!building.isGap &&
                this.dino.x + this.dino.width > building.x &&
                this.dino.x < building.x + building.width) {
                this.dino.currentBuilding = building;
                break;
            }
        }
        
        // Ground collision with buildings
        if (this.dino.currentBuilding) {
            const buildingTop = this.dino.currentBuilding.y;
            if (this.dino.y + this.dino.height >= buildingTop && this.dino.dy >= 0) {
                this.dino.y = buildingTop - this.dino.height;
                this.dino.dy = 0;
                this.dino.grounded = true;
            }
        } else {
            // No building under dino - falling!
            this.dino.grounded = false;
            // Check if fallen below screen
            if (this.dino.y > this.canvas.height) {
                this.endGame();
            }
        }
    }
    
    updateBuildings() {
        // Move buildings
        for (let building of this.buildings) {
            building.x -= this.gameSpeed;
        }
        
        // Move traction beams
        for (let beam of this.tractionBeams) {
            beam.x -= this.gameSpeed;
            beam.pulsePhase += 0.1; // Animate the pulsing effect
        }
        
        // Remove off-screen buildings and add score
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            if (this.buildings[i].x + this.buildings[i].width < 0) {
                if (!this.buildings[i].isGap) {
                    this.score += 20;
                } else {
                    this.score += 50;
                }
                this.buildings.splice(i, 1);
            }
        }
        
        // Remove off-screen traction beams
        for (let i = this.tractionBeams.length - 1; i >= 0; i--) {
            if (this.tractionBeams[i].x + this.tractionBeams[i].width < 0) {
                this.tractionBeams.splice(i, 1);
            }
        }
        
        // Add new buildings
        const lastBuilding = this.buildings[this.buildings.length - 1];
        if (lastBuilding && lastBuilding.x + lastBuilding.width < this.canvas.width + 100) {
            const newBuilding = this.createBuilding(lastBuilding.x + lastBuilding.width);
            this.buildings.push(newBuilding);
        }
        
        // Increase game speed gradually
        this.gameSpeed += 0.003;
    }
    
    checkCollisions() {
        // Check collision with building walls
        for (let building of this.buildings) {
            if (!building.isGap) {
                if (this.dino.x + this.dino.width > building.x &&
                    this.dino.x < building.x + building.width &&
                    this.dino.y + this.dino.height > building.y &&
                    this.dino.y < building.y + building.height &&
                    !this.dino.grounded) {
                    this.gameSpeed = 2;
                    if(this.dino.y + this.dino.height <  building.y + 10) {
                         this.gameSpeed += 0.00;
                    }
                    return;
                }
            }
        }
        
        // Check collision with traction beams
        for (let beam of this.tractionBeams) {
            if (this.dino.x + this.dino.width > beam.x &&
                this.dino.x < beam.x + beam.width &&
                this.dino.y + this.dino.height > beam.y &&
                this.dino.y < beam.y + beam.height) {
                
                // If dino is not ducking, game over
                if (!this.dino.ducking) {
                    this.endGame();
                    return;
                }
            }
        }
        
        // Check collision with Pacman (only when visible on screen)
        if (this.pacman.isActive && this.pacman.x > -this.pacman.size && this.pacman.x < this.canvas.width) {
            const pacmanCenterX = this.pacman.x + this.pacman.size / 2;
            const pacmanCenterY = this.pacman.y + this.pacman.size / 2;
            const dinoCenterX = this.dino.x + this.dino.width / 2;
            const dinoCenterY = this.dino.y + this.dino.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(pacmanCenterX - dinoCenterX, 2) + 
                Math.pow(pacmanCenterY - dinoCenterY, 2)
            );
            
            // If Pacman touches dino, game over
            if (distance < (this.pacman.size / 2 + Math.max(this.dino.width, this.dino.height) / 2)) {
                this.endGame();
                return;
            }
        }
    }
    
    drawPacman() {
        if (!this.pacman.isActive) return;
        
        const centerX = this.pacman.x + this.pacman.size / 2;
        const centerY = this.pacman.y + this.pacman.size / 2;
        const radius = this.pacman.size / 2;
        
        // Calculate mouth opening (0 to 0.8 radians)
        const mouthOpenness = 0.4 + 0.4 * Math.abs(Math.sin(this.pacman.mouthPhase));
        
        this.ctx.fillStyle = '#FFD700'; // Pacman yellow
        this.ctx.beginPath();
        
        // Draw Pacman circle with mouth
        if (mouthOpenness > 0.1) {
            // Mouth is open
            this.ctx.arc(centerX, centerY, radius, mouthOpenness, 2 * Math.PI - mouthOpenness);
            this.ctx.lineTo(centerX, centerY);
        } else {
            // Mouth is closed (full circle)
            this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        }
        
        this.ctx.fill();
        
        // Draw eye
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(centerX - radius * 0.2, centerY - radius * 0.3, radius * 0.1, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Add some glow effect
        this.ctx.shadowColor = '#FFD700';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        if (mouthOpenness > 0.1) {
            this.ctx.arc(centerX, centerY, radius * 0.9, mouthOpenness, 2 * Math.PI - mouthOpenness);
            this.ctx.lineTo(centerX, centerY);
        } else {
            this.ctx.arc(centerX, centerY, radius * 0.9, 0, 2 * Math.PI);
        }
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }
    
    endGame() {
        this.gameRunning = false;
        this.gameOver = true;
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('dinoHighScore', this.highScore);
            this.updateHighScore();
        }
        
        this.finalScoreElement.textContent = this.score;
        this.gameOverElement.style.display = 'block';
    }
    
    updateScore() {
        this.scoreElement.textContent = `Score: ${this.score}`;
    }
    
    updateHighScore() {
        this.highScoreElement.textContent = `High: ${this.highScore}`;
    }
    
    draw() {
        // Clear canvas with sky color
        this.ctx.fillStyle = '#000000ff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw stars as simple white shapes
        this.ctx.fillStyle = '#ffffff';
        for (let star of this.stars) {
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        }
        
        // Draw traction beams (behind buildings)
        for (let beam of this.tractionBeams) {
            const pulseIntensity = 0.5 + 0.3 * Math.sin(beam.pulsePhase);
            this.ctx.globalAlpha = beam.opacity * pulseIntensity;
            
            // Create gradient for beam effect
            const gradient = this.ctx.createLinearGradient(beam.x, beam.y, beam.x + beam.width, beam.y);
            gradient.addColorStop(0, 'rgba(255, 255, 0, 0.2)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 255, 0, 0.2)');
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(beam.x, beam.y, beam.width, beam.height);
            
            // Add beam edges
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
            this.ctx.fillRect(beam.x, beam.y, 2, beam.height); // Left edge
            this.ctx.fillRect(beam.x + beam.width - 2, beam.y, 2, beam.height); // Right edge
        }
        this.ctx.globalAlpha = 1;
        
        // Draw buildings
        this.ctx.fillStyle = '#333';
        for (let building of this.buildings) {
            if (!building.isGap) {
                this.ctx.fillRect(building.x, building.y, building.width, building.height);
                
                // Add some building details (windows)
                this.ctx.fillStyle = '#FFD700';
                const windowRows = Math.floor(building.height / 25);
                const windowCols = Math.floor(building.width / 20);
                
                for (let row = 0; row < windowRows; row++) {
                    for (let col = 0; col < windowCols; col++) {
                        if (Math.random() > 0.3) {
                            const windowX = building.x + col * 20 + 5;
                            const windowY = building.y + row * 25 + 5;
                            this.ctx.fillRect(windowX, windowY, 8, 12);
                        }
                    }
                }
                this.ctx.fillStyle = '#333';
            }
        }
        
        // Draw Pacman (overlaps everything)
        this.drawPacman();
        
        // Draw dino
        this.ctx.fillStyle = '#fffcfcff';
        this.ctx.fillRect(this.dino.x, this.dino.y, this.dino.width, this.dino.height);
        
        // Add simple dino details
        this.ctx.fillStyle = '#000000ff';
        this.ctx.fillRect(this.dino.x + 5, this.dino.y + 5, 3, 3); // eye
        
        // Draw start message
        if (!this.gameRunning && !this.gameOver) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Rooftop Runner', this.canvas.width / 2, 60);
            this.ctx.font = '16px Arial';
            this.ctx.fillText('Jump gaps, duck beams, avoid Pacman!', this.canvas.width / 2, 85);
            this.ctx.fillText('Press SPACE to start', this.canvas.width / 2, 105);
        }
        
        // Draw game info
        if (this.gameRunning) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`Speed: ${this.gameSpeed.toFixed(1)}`, 10, 20);
            this.ctx.fillText(`Max Gap: ${this.getMaxJumpableGap().toFixed(0)}px`, 10, 35);
            this.ctx.fillText(`Pacman Cycle: ${this.pacman.cycleCount}`, 10, 50);
        }
    }
    
    gameLoop() {
        if (this.gameRunning) {
            this.updateDino();
            this.updateBuildings();
            this.updatePacman();
            this.checkCollisions();
            this.updateScore();
        }
        
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game
const game = new DinoGame();

// Restart function for the button
function restartGame() {
    game.startGame();
}