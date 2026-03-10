class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.musicGain = null;
        this.sfxGain = null;
        this.buffers = {};
        this.activeSources = {
            music: null,
            sfx: []
        };
        this.isInitialized = false;
        this.isMuted = false;
        
        this.soundUrls = {
            backgroundMusic: 'sounds/www90.mp3',
            hitSound: 'sounds/hit.mp3',
            coinSound: 'sounds/coin.mp3',
            explosionSound: 'sounds/explosion.mp3',
            rankUpSound: 'sounds/a319a0c853d8550.mp3'
        };
    }

    async init() {
        if (this.isInitialized) return;
        
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContextClass();
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            
            this.musicGain = this.audioContext.createGain();
            this.sfxGain = this.audioContext.createGain();
            
            this.musicGain.connect(this.masterGain);
            this.sfxGain.connect(this.masterGain);
            
            this.musicGain.gain.value = 0.3;
            this.sfxGain.gain.value = 1.0;
            
            await this.preloadSounds();
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize AudioManager:', error);
        }
    }

    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
            } catch (error) {
                console.error('Failed to resume AudioContext:', error);
            }
        }
    }

    async preloadSounds() {
        const loadPromises = Object.entries(this.soundUrls).map(async ([name, url]) => {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.buffers[name] = audioBuffer;
            } catch (error) {
                console.warn(`Failed to load sound ${name}:`, error);
                this.buffers[name] = this.createSilentBuffer(0.1);
            }
        });
        
        await Promise.all(loadPromises);
    }

    createSilentBuffer(duration) {
        const sampleRate = this.audioContext.sampleRate;
        const frameCount = sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
        return buffer;
    }

    playMusic(soundName, loop = true) {
        if (!this.isInitialized || !this.buffers[soundName]) return;
        
        this.stopMusic();
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.buffers[soundName];
        source.loop = loop;
        source.connect(this.musicGain);
        
        source.start(0);
        this.activeSources.music = source;
        
        if (!loop) {
            source.onended = () => {
                if (this.activeSources.music === source) {
                    this.activeSources.music = null;
                }
            };
        }
    }

    stopMusic() {
        if (this.activeSources.music) {
            try {
                this.activeSources.music.stop();
            } catch (e) {}
            this.activeSources.music = null;
        }
    }

    playSound(soundName) {
        if (!this.isInitialized || !this.buffers[soundName]) return;
        
        this.resumeContext();
        
        const source = this.audioContext.createBufferSource();
        source.buffer = this.buffers[soundName];
        source.connect(this.sfxGain);
        
        source.start(0);
        this.activeSources.sfx.push(source);
        
        source.onended = () => {
            const index = this.activeSources.sfx.indexOf(source);
            if (index > -1) {
                this.activeSources.sfx.splice(index, 1);
            }
        };
    }

    setMusicVolume(value) {
        if (this.musicGain) {
            this.musicGain.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.1);
        }
    }

    setSfxVolume(value) {
        if (this.sfxGain) {
            this.sfxGain.gain.setTargetAtTime(value, this.audioContext.currentTime, 0.1);
        }
    }

    mute() {
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.1);
            this.isMuted = true;
        }
    }

    unmute() {
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(1, this.audioContext.currentTime, 0.1);
            this.isMuted = false;
        }
    }

    pause() {
        if (this.audioContext) {
            this.audioContext.suspend();
        }
    }

    resume() {
        if (this.audioContext) {
            this.audioContext.resume();
        }
    }
}

class ZombieGame {
    constructor() {
        this.audioManager = new AudioManager();
        this.userInteracted = false;
        
        this.elements = {
            gameArea: document.getElementById('gameArea'),
            player: document.getElementById('player'),
            scoreDisplay: document.getElementById('score'),
            highScoreDisplay: document.getElementById('highScore'),
            hearts: document.querySelectorAll('.heart'),
            hitEffect: document.getElementById('hitEffect'),
            rankImage: document.getElementById('rankImage'),
            rankName: document.getElementById('rankName'),
            rankProgress: document.getElementById('rankProgress'),
            rankProgressText: document.getElementById('rankProgressText'),
            zombieSpeed: document.getElementById('zombieSpeed'),
            zombieSpawnRate: document.getElementById('zombieSpawnRate')
        };

        this.wasPlaying = false;

        this.bonusTypes = [
            { type: 'star', emoji: '⭐', chance: 0.6, duration: 10000, effect: 'points' },
            { type: 'diamond', emoji: '💎', chance: 0.3, duration: 8000, effect: 'multiplier' },
            { type: 'shield', emoji: '🛡️', chance: 0.1, duration: 5000, effect: 'invincibility' }
        ];
        
        this.delayedInit();
    }

    delayedInit() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.finishInit());
        } else {
            this.finishInit();
        }
    }

    async finishInit() {
        this.elements = {
            ...this.elements,
            pauseScreen: document.getElementById('pauseScreen'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            finalScoreValue: document.getElementById('finalScoreValue'),
            restartButton: document.getElementById('restartButton'),
            shop: document.getElementById('shop'),
            shopScore: document.getElementById('shopScore'),
            closeShop: document.getElementById('closeShop'),
            openShopButton: document.getElementById('openShopButton'),
            pauseShopButton: document.getElementById('pauseShopButton'),
            resumeButton: document.getElementById('resumeButton'),
            settingsModal: document.getElementById('settingsModal'),
            settingsButton: document.getElementById('settingsButton'),
            closeSettings: document.getElementById('closeSettings'),
            musicVolume: document.getElementById('musicVolume'),
            soundVolume: document.getElementById('soundVolume'),
            musicVolumeValue: document.getElementById('musicVolumeValue'),
            soundVolumeValue: document.getElementById('soundVolumeValue'),
            skins: document.querySelectorAll('.skin'),
            colors: document.querySelectorAll('.color-option'),
            bgColorOptions: document.querySelectorAll('.bg-color-option'),
            pauseButton: document.getElementById('pauseButton'),
            mainMenu: document.getElementById('mainMenu'),
            menuHighScore: document.getElementById('menuHighScore'),
            menuTotalScore: document.getElementById('menuTotalScore'),
            startGameBtn: document.getElementById('startGameBtn'),
            menuShopBtn: document.getElementById('menuShopBtn'),
            menuSettingsBtn: document.getElementById('menuSettingsBtn'),
            menuRanksBtn: document.getElementById('menuRanksBtn'),
            backToMenuBtn: document.getElementById('backToMenuBtn'),
            pauseToMenuBtn: document.getElementById('pauseToMenuBtn'),
            ranksModal: document.getElementById('ranksModal'),
            ranksList: document.getElementById('ranksList'),
            closeRanks: document.getElementById('closeRanks'),
            currentRankName: document.getElementById('currentRankName'),
            currentRankProgress: document.getElementById('currentRankProgress'),
            currentRankXP: document.getElementById('currentRankXP'),
            enableSound: document.getElementById('enableSound')
        };

        this.ranks = [
            { name: "Серебро I", xpRequired: 0, image: "images/ranks/iron_I.png" },
            { name: "Серебро II", xpRequired: 100, image: "images/ranks/iron_II.png" },
            { name: "Серебро III", xpRequired: 300, image: "images/ranks/iron_III.png" },
            { name: "Золото I", xpRequired: 600, image: "images/ranks/gold_I.png" },
            { name: "Золото II", xpRequired: 1000, image: "images/ranks/gold_II.png" },
            { name: "Золото III", xpRequired: 1500, image: "images/ranks/gold_III.png" },
            { name: "Изумруд I", xpRequired: 2600, image: "images/ranks/emerald_I.png" },
            { name: "Изумруд II", xpRequired: 3800, image: "images/ranks/emerald_II.png" },
            { name: "Изумруд III", xpRequired: 5100, image: "images/ranks/emerald_III.png" },
            { name: "Сапфир I", xpRequired: 6500, image: "images/ranks/sapphire_I.png" },
            { name: "Сапфир II", xpRequired: 8000, image: "images/ranks/sapphire_II.png" },
            { name: "Сапфир III", xpRequired: 9600, image: "images/ranks/sapphire_III.png" },
            { name: "Рубин I", xpRequired: 11300, image: "images/ranks/ruby_I.png" },
            { name: "Рубин II", xpRequired: 13100, image: "images/ranks/ruby_II.png" },
            { name: "Рубин III", xpRequired: 15000, image: "images/ranks/ruby_III.png" },
            { name: "Легенда", xpRequired: 20000, image: "images/ranks/legend.png", isMax: true }
        ];

        this.state = {
            lives: 3,
            zombieSpeed: 8,
            score: 0,
            totalScore: parseInt(localStorage.getItem('totalScore')) || 0,
            highScore: parseInt(localStorage.getItem('highScore')) || 0,
            currentXp: parseInt(localStorage.getItem('currentXp')) || 0,
            currentRank: parseInt(localStorage.getItem('currentRank')) || 0,
            gameOver: false,
            isPaused: false,
            zombies: [],
            intervals: {
                createZombie: null,
                zombieMove: [],
                createBonus: null,
                bonusMove: []
            },
            zombieSpawnRate: 500,
            minSpawnRate: 200,
            purchasedSkins: JSON.parse(localStorage.getItem('purchasedSkins')) || ["🤪"],
            purchasedColors: JSON.parse(localStorage.getItem('purchasedColors')) || ["#e74c3c"],
            purchasedBgColors: JSON.parse(localStorage.getItem('purchasedBgColors')) || ["#0c3d6d"],
            currentMusicVolume: parseFloat(localStorage.getItem('musicVolume')) || 0.3,
            currentSoundVolume: parseFloat(localStorage.getItem('soundVolume')) || 1,
            currentColor: localStorage.getItem('selectedColor') || "#e74c3c",
            selectedSkin: localStorage.getItem('selectedSkin') || "🤪",
            selectedBgColor: localStorage.getItem('selectedBgColor') || "#0c3d6d",
            bonuses: [],
            activeEffects: {
                multiplier: { active: false, value: 1, timeout: null },
                invincibility: { active: false, timeout: null }
            }
        };

        this.init();
    }

    async init() {
        this.loadSettings();
        this.setupEventListeners();
        this.updateMenuScores();
        this.updateRank();
        document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    }

    async enableSound() {
        if (!this.userInteracted) {
            this.userInteracted = true;
            
            await this.audioManager.init();
            await this.audioManager.resumeContext();
            
            this.audioManager.setMusicVolume(this.state.currentMusicVolume);
            this.audioManager.setSfxVolume(this.state.currentSoundVolume);
            
            if (this.elements.mainMenu.classList.contains('show')) {
                this.tryPlayMusic();
            }
            
            if (this.elements.enableSound) {
                this.elements.enableSound.textContent = '🔊 Звук включен';
                this.elements.enableSound.disabled = true;
            }
        }
    }

    updateMenuScores() {
        if (this.elements.menuHighScore && this.elements.menuTotalScore) {
            this.elements.menuHighScore.textContent = this.state.highScore;
            this.elements.menuTotalScore.textContent = this.state.totalScore;
        }
    }

    loadSettings() {
        this.elements.player.textContent = this.state.selectedSkin;
        this.elements.player.style.backgroundColor = this.state.currentColor;
        this.elements.player.style.filter = `drop-shadow(0 0 5px ${this.hexToRGBA(this.state.currentColor, 0.7)})`;
        
        const gameContainer = document.querySelector('.game-container');
        gameContainer.style.backgroundColor = this.state.selectedBgColor;
        
        this.elements.musicVolume.value = this.state.currentMusicVolume;
        this.elements.soundVolume.value = this.state.currentSoundVolume;
        this.updateVolumeDisplay();
    }

    setupEventListeners() {
        this.elements.gameArea.addEventListener('mousemove', (e) => this.movePlayer(e));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.togglePause();
        });

        if (this.elements.resumeButton) {
            this.elements.resumeButton.addEventListener('click', () => this.togglePause());
        }
        
        if (this.elements.restartButton) {
            this.elements.restartButton.addEventListener('click', () => this.restartGame());
        }
        
        if (this.elements.pauseButton) {
            this.elements.pauseButton.addEventListener('click', () => this.togglePause());
        }
        
        if (this.elements.openShopButton) {
            this.elements.openShopButton.addEventListener('click', () => this.openShop());
        }
        
        if (this.elements.pauseShopButton) {
            this.elements.pauseShopButton.addEventListener('click', () => this.openShop());
        }
        
        if (this.elements.closeShop) {
            this.elements.closeShop.addEventListener('click', () => this.closeShop());
        }
        
        if (this.elements.settingsButton) {
            this.elements.settingsButton.addEventListener('click', () => this.openSettings());
        }
        
        if (this.elements.closeSettings) {
            this.elements.closeSettings.addEventListener('click', () => this.closeSettings());
        }
        
        if (this.elements.musicVolume) {
            this.elements.musicVolume.addEventListener('input', () => this.updateMusicVolume());
        }
        
        if (this.elements.soundVolume) {
            this.elements.soundVolume.addEventListener('input', () => this.updateSoundVolume());
        }
        
        if (this.elements.startGameBtn) {
            this.elements.startGameBtn.addEventListener('click', () => this.startFromMenu());
        }
        
        if (this.elements.menuShopBtn) {
            this.elements.menuShopBtn.addEventListener('click', () => this.openShop());
        }
        
        if (this.elements.menuSettingsBtn) {
            this.elements.menuSettingsBtn.addEventListener('click', () => this.openSettings());
        }
        
        if (this.elements.menuRanksBtn) {
            this.elements.menuRanksBtn.addEventListener('click', () => this.showRanks());
        }
        
        if (this.elements.backToMenuBtn) {
            this.elements.backToMenuBtn.addEventListener('click', () => this.showMainMenu());
        }
        
        if (this.elements.pauseToMenuBtn) {
            this.elements.pauseToMenuBtn.addEventListener('click', () => this.showMainMenu());
        }
        
        if (this.elements.skins) {
            this.elements.skins.forEach(skin => {
                skin.addEventListener('click', () => this.handleSkinClick(skin));
            });
        }
        
        if (this.elements.colors) {
            this.elements.colors.forEach(color => {
                color.addEventListener('click', () => this.handleColorClick(color));
            });
        }
        
        if (this.elements.bgColorOptions) {
            this.elements.bgColorOptions.forEach(bgColor => {
                bgColor.addEventListener('click', () => this.handleBgColorClick(bgColor));
            });
        }
        
        if (this.elements.closeRanks) {
            this.elements.closeRanks.addEventListener('click', () => this.closeRanks());
        }
        
        if (this.elements.menuRanksBtn) {
            this.elements.menuRanksBtn.addEventListener('click', () => this.showRanksModal());
        }

        if (this.elements.enableSound) {
            this.elements.enableSound.addEventListener('click', () => this.enableSound());
        }
    }

    async startFromMenu() {
        if (!this.userInteracted) {
            await this.enableSound();
        }
        
        this.hideModal(this.elements.mainMenu);
        this.startGame();
        
        if (window.ysdk && window.ysdk.features && window.ysdk.features.GameplayAPI) {
            window.ysdk.features.GameplayAPI.start();
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            this.wasPlaying = !this.state.isPaused && !this.state.gameOver;
            
            if (this.audioManager.isInitialized) {
                this.audioManager.pause();
            }
            
            if (!this.state.isPaused && !this.state.gameOver) {
                this.togglePause();
            }
        } else if (this.wasPlaying && this.state.isPaused) {
            if (this.audioManager.isInitialized) {
                this.audioManager.resume();
            }
        }
    }

    createBonus() {
        if (this.state.isPaused || this.state.gameOver) return;
        
        if (Math.random() > 0.05) return;
        
        const bonusType = this.getRandomBonusType();
        const bonus = document.createElement('div');
        bonus.className = `bonus ${bonusType.type}`;
        bonus.textContent = bonusType.emoji;
        bonus.dataset.type = bonusType.type;
        bonus.style.position = 'absolute';
        bonus.style.left = `${Math.random() * (this.elements.gameArea.clientWidth - 30)}px`;
        bonus.style.top = '0px';
        
        this.elements.gameArea.appendChild(bonus);
        this.state.bonuses.push(bonus);
        
        const intervalId = setInterval(() => this.moveBonus(bonus), 30);
        this.state.intervals.bonusMove.push(intervalId);
    }

    getRandomBonusType() {
        const rand = Math.random();
        let cumulativeChance = 0;
        
        for (const bonus of this.bonusTypes) {
            cumulativeChance += bonus.chance;
            if (rand <= cumulativeChance) {
                return bonus;
            }
        }
        return this.bonusTypes[0];
    }

    moveBonus(bonus) {
        if (this.state.gameOver || this.state.isPaused) return;
        
        const bonusRect = bonus.getBoundingClientRect();
        const gameAreaRect = this.elements.gameArea.getBoundingClientRect();
        
        if (bonusRect.top > gameAreaRect.bottom) {
            this.removeBonus(bonus);
            return;
        }
        
        const currentTop = parseInt(bonus.style.top) || 0;
        bonus.style.top = `${currentTop + 7}px`;
        
        const newBonusRect = bonus.getBoundingClientRect();
        const playerRect = this.elements.player.getBoundingClientRect();
        
        if (this.checkBonusCollision(newBonusRect, playerRect)) {
            this.collectBonus(bonus);
        }
    }
    
    checkBonusCollision(bonusRect, playerRect) {
        const collisionX = bonusRect.left <= playerRect.right && 
                          bonusRect.right >= playerRect.left;
        const collisionY = bonusRect.top <= playerRect.bottom && 
                          bonusRect.bottom >= playerRect.top;
        
        return collisionX && collisionY;
    }

    collectBonus(bonus) {
        const type = bonus.dataset.type;
        const bonusData = this.bonusTypes.find(b => b.type === type);
        
        this.showBonusNotification(bonusData.emoji, this.getBonusName(type));
        this.playSound('coinSound');
        
        switch (type) {
            case 'star':
                this.applyStarBonus();
                break;
            case 'diamond':
                this.applyDiamondBonus();
                break;
            case 'shield':
                this.applyShieldBonus();
                break;
        }
        
        this.removeBonus(bonus);
    }

    getBonusName(type) {
        const names = {
            'star': 'Бонусные очки',
            'diamond': 'Множитель x2',
            'shield': 'Неуязвимость'
        };
        return names[type] || 'Бонус';
    }

    applyStarBonus() {
        const points = 50 + Math.floor(this.state.score / 10);
        this.state.score += points;
        this.state.totalScore += points;
        
        this.showFloatingText(`+${points} очков!`, '#f1c40f');
        this.updateScoreDisplay();
    }

    applyDiamondBonus() {
        if (this.state.activeEffects.multiplier.timeout) {
            clearTimeout(this.state.activeEffects.multiplier.timeout);
        }
        
        this.state.activeEffects.multiplier = {
            active: true,
            value: 2,
            timeout: setTimeout(() => {
                this.state.activeEffects.multiplier.active = false;
                this.showFloatingText('Множитель закончился!', '#3498db');
            }, 10000)
        };
        
        this.showFloatingText('x2 множитель активирован!', '#3498db');
    }

    applyShieldBonus() {
        if (this.state.activeEffects.invincibility.timeout) {
            clearTimeout(this.state.activeEffects.invincibility.timeout);
        }
        
        this.state.activeEffects.invincibility = {
            active: true,
            timeout: setTimeout(() => {
                this.state.activeEffects.invincibility.active = false;
                this.elements.player.classList.remove('shielded');
                this.showFloatingText('Щит закончился!', '#2ecc71');
            }, 5000)
        };
        
        this.elements.player.classList.add('shielded');
        this.showFloatingText('Щит активирован!', '#2ecc71');
    }

    showBonusNotification(emoji, text) {
        const notification = document.createElement('div');
        notification.className = 'bonus-notification';
        notification.innerHTML = `${emoji} ${text}`;
        notification.style.left = `${this.elements.player.offsetLeft}px`;
        notification.style.top = `${this.elements.player.offsetTop - 30}px`;
        
        this.elements.gameArea.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    showFloatingText(text, color) {
        const floatingText = document.createElement('div');
        floatingText.className = 'bonus-notification';
        floatingText.textContent = text;
        floatingText.style.color = color;
        floatingText.style.left = `${this.elements.player.offsetLeft}px`;
        floatingText.style.top = `${this.elements.player.offsetTop - 20}px`;
        floatingText.style.fontWeight = 'bold';
        
        this.elements.gameArea.appendChild(floatingText);
        
        setTimeout(() => {
            floatingText.remove();
        }, 2000);
    }

    removeBonus(bonus) {
        const index = this.state.bonuses.indexOf(bonus);
        if (index !== -1) {
            const intervalIndex = this.state.intervals.bonusMove.findIndex(
                (_, i) => i === index
            );
            if (intervalIndex !== -1) {
                clearInterval(this.state.intervals.bonusMove[intervalIndex]);
                this.state.intervals.bonusMove.splice(intervalIndex, 1);
            }
            this.state.bonuses.splice(index, 1);
            bonus.remove();
        }
    }

    showMainMenu() {
        this.updateMenuScores();
        this.showModal(this.elements.mainMenu);
        this.stopGame();
    }

    stopGame() {
        this.clearAllIntervals();
        
        this.state.zombies.forEach(zombie => zombie.remove());
        this.state.zombies = [];
        
        this.clearAllBonuses();
        
        this.state.gameOver = false;
        this.state.isPaused = false;
        
        this.hideModal(this.elements.gameOverScreen);
        this.hideModal(this.elements.pauseScreen);
        
        if (window.ysdk && window.ysdk.features && window.ysdk.features.GameplayAPI) {
            window.ysdk.features.GameplayAPI.stop();
        }
        
        if (this.audioManager.isInitialized) {
            this.audioManager.stopMusic();
        }
    }

    clearAllBonuses() {
        this.state.intervals.bonusMove.forEach(interval => clearInterval(interval));
        this.state.intervals.bonusMove = [];
        
        this.state.bonuses.forEach(bonus => {
            if (bonus && bonus.parentNode) {
                bonus.remove();
            }
        });
        
        this.state.bonuses = [];
        
        if (this.state.activeEffects.multiplier.timeout) {
            clearTimeout(this.state.activeEffects.multiplier.timeout);
        }
        if (this.state.activeEffects.invincibility.timeout) {
            clearTimeout(this.state.activeEffects.invincibility.timeout);
        }
        
        this.state.activeEffects = {
            multiplier: { active: false, value: 1, timeout: null },
            invincibility: { active: false, timeout: null }
        };
        
        this.elements.player.classList.remove('shielded');
    }

    showRanksModal() {
        this.updateRanksModal();
        this.showModal(this.elements.ranksModal);
    }

    updateRanksModal() {
        this.elements.ranksList.innerHTML = '';
        
        this.ranks.forEach((rank, index) => {
            const rankItem = document.createElement('div');
            rankItem.className = 'rank-item';
            
            const isMax = rank.isMax || index === this.ranks.length - 1;
            if (isMax) {
                rankItem.classList.add('legend-rank');
            }
            
            if (index === this.state.currentRank) {
                rankItem.classList.add('current');
            }
            
            const xpText = isMax ? '★ МАКСИМУМ ★' : `${rank.xpRequired} XP`;
            
            rankItem.innerHTML = `
                <img src="${rank.image}" alt="${rank.name}" class="rank-icon">
                <div class="rank-info">
                    <div class="rank-name">${rank.name}</div>
                    <div class="rank-xp ${isMax ? 'max' : ''}">${xpText}</div>
                </div>
            `;
            
            this.elements.ranksList.appendChild(rankItem);
        });
        
        this.updateCurrentRankInfo();
    }

    startGame() {
        this.resetGameState();
        this.state.intervals.createZombie = setInterval(() => this.createZombie(), this.state.zombieSpawnRate);
        this.state.intervals.createBonus = setInterval(() => this.createBonus(), 2000);
        
        this.tryPlayMusic();
        
        if (window.ysdk && window.ysdk.features && window.ysdk.features.GameplayAPI) {
            window.ysdk.features.GameplayAPI.start();
        }
    }

    resetGameState() {
        this.state.lives = 3;
        this.state.zombieSpeed = 8;
        this.state.score = 0;
        this.state.gameOver = false;
        this.state.isPaused = false;
        this.state.zombies = [];
        this.state.intervals.zombieMove = [];
        
        this.state.bonuses = [];
        this.state.intervals.bonusMove = [];
        
        this.state.activeEffects = {
            multiplier: { active: false, value: 1, timeout: null },
            invincibility: { active: false, timeout: null }
        };
        
        this.elements.scoreDisplay.textContent = `Счёт: ${this.state.score}`;
        this.elements.highScoreDisplay.textContent = `Рекорд: ${this.state.highScore}`;
        this.elements.shopScore.textContent = this.state.totalScore;
        
        this.updateHearts();
        this.hideModal(this.elements.gameOverScreen);
        this.hideModal(this.elements.pauseScreen);
        
        this.state.zombieSpawnRate = 500;
        
        document.querySelectorAll('.zombie').forEach(zombie => zombie.remove());
        document.querySelectorAll('.bonus').forEach(bonus => bonus.remove());
        document.querySelectorAll('.bonus-notification').forEach(el => el.remove());
        
        this.elements.player.style.visibility = 'visible';
        this.elements.player.classList.remove('shielded', 'invincible');
        
        this.updateRank();
        
        document.querySelector('.game-container').style.backgroundColor = this.state.selectedBgColor;
    }

    movePlayer(event) {
        if (this.state.isPaused || this.state.gameOver) return;
        
        const gameAreaRect = this.elements.gameArea.getBoundingClientRect();
        const playerWidth = this.elements.player.offsetWidth;
        
        // Вычисляем позицию относительно gameArea с учетом центра игрока
        let newLeft = event.clientX - gameAreaRect.left - (playerWidth / 2);
        
        // Ограничиваем движение строго внутри gameArea
        const minLeft = 5; // Отступ от левого края
        const maxLeft = this.elements.gameArea.clientWidth - playerWidth - 5; // Отступ от правого края
        
        newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
        
        this.elements.player.style.left = `${newLeft}px`;
    }

    createZombie() {
        if (this.state.isPaused || this.state.gameOver) return;
        
        const zombie = document.createElement('div');
        zombie.className = 'zombie';
        zombie.textContent = '🧟';
        zombie.style.position = 'absolute';
        zombie.style.left = `${Math.random() * (this.elements.gameArea.clientWidth - 40)}px`;
        zombie.style.top = '0px';
        this.elements.gameArea.appendChild(zombie);
        this.state.zombies.push(zombie);
        
        const intervalId = setInterval(() => this.moveZombie(zombie), 30);
        this.state.intervals.zombieMove.push(intervalId);
    }

    moveZombie(zombie) {
        if (this.state.gameOver || this.state.isPaused) return;
        
        const zombieRect = zombie.getBoundingClientRect();
        const playerRect = this.elements.player.getBoundingClientRect();
        
        if (zombieRect.bottom >= this.elements.gameArea.getBoundingClientRect().bottom) {
            this.updateScore();
            this.removeZombie(zombie);
            return;
        }
        
        zombie.style.top = `${zombie.offsetTop + this.state.zombieSpeed}px`;
        
        if (this.checkCollision(zombieRect, playerRect)) {
            this.handleCollision(zombie);
        }
    }

    checkCollision(zombieRect, playerRect) {
        if (this.elements.player.classList.contains('invincible') || 
            this.state.activeEffects.invincibility.active) {
            return false;
        }
        
        const zombieCenterX = zombieRect.left + zombieRect.width / 2;
        const zombieCenterY = zombieRect.top + zombieRect.height / 2;
        const playerCenterX = playerRect.left + playerRect.width / 2;
        const playerCenterY = playerRect.top + playerRect.height / 2;
        
        const dx = zombieCenterX - playerCenterX;
        const dy = zombieCenterY - playerCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const minDistance = (zombieRect.width + playerRect.width) / 2 * 0.8;
        
        return distance < minDistance;
    }

    handleCollision(zombie) {
        this.state.lives--;
        this.updateHearts();
        this.showHitEffect();
        this.removeZombie(zombie);
        
        this.elements.player.classList.add('invincible');
        setTimeout(() => {
            this.elements.player.classList.remove('invincible');
        }, 1000);
        
        if (this.state.lives <= 0) {
            this.endGame();
        }
    }

    updateScore() {
        let points = 1;
        if (this.state.activeEffects.multiplier.active) {
            points *= this.state.activeEffects.multiplier.value;
        }
        
        this.state.score += points;
        this.state.totalScore += points;
        
        let xpEarned = 1;
        
        if (this.state.score % 15 === 0) {
            xpEarned += 5;
            this.state.zombieSpeed += 1;
        }
        
        if (this.state.score > this.state.highScore) {
            xpEarned += 10;
        }
        
        if (this.state.score % 10 === 0 && this.state.zombieSpawnRate > this.state.minSpawnRate) {
            xpEarned += 3;
            this.state.zombieSpawnRate -= 40;
            
            clearInterval(this.state.intervals.createZombie);
            this.state.intervals.createZombie = setInterval(() => this.createZombie(), this.state.zombieSpawnRate);
        }
        
        this.state.currentXp += xpEarned;
        
        localStorage.setItem('totalScore', this.state.totalScore);
        localStorage.setItem('currentXp', this.state.currentXp);
        
        this.elements.scoreDisplay.textContent = `Счёт: ${this.state.score}`;
        this.elements.shopScore.textContent = this.state.totalScore;
        this.animateScore(this.elements.scoreDisplay);
        
        this.elements.zombieSpeed.textContent = this.state.zombieSpeed;
        this.elements.zombieSpawnRate.textContent = Math.round(1000 / this.state.zombieSpawnRate);
        
        if (this.state.score > this.state.highScore) {
            this.state.highScore = this.state.score;
            localStorage.setItem('highScore', this.state.highScore);
            this.elements.highScoreDisplay.textContent = `Рекорд: ${this.state.highScore}`;
            this.animateScore(this.elements.highScoreDisplay);
        }
        
        this.updateRank();
        this.playSound('coinSound');
    }

    updateRank() {
        let rankIncreased = false;
        const previousRank = this.state.currentRank;
        const wasMaxRank = this.state.currentRank >= this.ranks.length - 1;
        
        while (this.state.currentRank < this.ranks.length - 1 && 
               this.state.currentXp >= this.ranks[this.state.currentRank + 1].xpRequired) {
            this.state.currentRank++;
            rankIncreased = true;
            localStorage.setItem('currentRank', this.state.currentRank);
        }
        
        if (wasMaxRank || this.state.currentRank >= this.ranks.length - 1) {
            localStorage.setItem('currentXp', this.state.currentXp);
        }
        
        const currentRank = this.ranks[Math.min(this.state.currentRank, this.ranks.length - 1)];
        const isMaxRank = this.state.currentRank >= this.ranks.length - 1;
        
        this.elements.rankImage.innerHTML = `<img src="${currentRank.image}" alt="${currentRank.name}" class="rank-icon">`;
        this.elements.rankName.textContent = currentRank.name;
        
        if (isMaxRank) {
            this.elements.rankProgress.style.display = 'none';
            this.elements.rankProgressText.textContent = '★ МАКСИМУМ ★';
            this.elements.rankProgressText.style.fontWeight = 'bold';
            this.elements.rankProgressText.style.color = '#f1c40f';
            this.elements.rankProgressText.style.fontSize = '14px';
            this.elements.rankProgressText.style.textShadow = '0 0 10px rgba(241, 196, 15, 0.8)';
        } else {
            this.elements.rankProgress.style.display = 'block';
            const nextRank = this.ranks[this.state.currentRank + 1];
            const xpForNextRank = nextRank.xpRequired - currentRank.xpRequired;
            const xpInCurrentRank = this.state.currentXp - currentRank.xpRequired;
            const progress = Math.min(100, (xpInCurrentRank / xpForNextRank) * 100);
            
            this.elements.rankProgress.value = progress;
            this.elements.rankProgressText.textContent = `${xpInCurrentRank}/${xpForNextRank} XP`;
            this.elements.rankProgressText.style.fontWeight = 'normal';
            this.elements.rankProgressText.style.color = '#ecf0f1';
            this.elements.rankProgressText.style.fontSize = '12px';
            this.elements.rankProgressText.style.textShadow = 'none';
        }
        
        if (this.elements.ranksModal.classList.contains('show')) {
            this.updateRanksModal();
        }
        
        if (rankIncreased && previousRank !== this.state.currentRank) {
            this.showRankUpNotification(currentRank);
        }
    }

    showRankUpNotification(rank) {
        this.playSound('rankUpSound');
        
        const notification = document.createElement('div');
        notification.className = 'rank-up-notification';
        notification.innerHTML = `
            <h3>НОВЫЙ РАНГ!</h3>
            <div class="rank-icon"><img src="${rank.image}" alt="${rank.name}"></div>
            <h2>${rank.name}</h2>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, 3000);
    }

    updateHearts() {
        this.elements.hearts.forEach((heart, index) => {
            const path = heart.querySelector('path');
            if (index < this.state.lives) {
                path.setAttribute('fill', '#ff0000');
                path.style.opacity = '1';
                path.style.transform = 'scale(1)';
            } else {
                path.setAttribute('fill', '#000000');
                path.style.opacity = '0.3';
                path.style.transform = 'scale(0.9)';
            }
        });
    }

    removeZombie(zombie) {
        const index = this.state.zombies.indexOf(zombie);
        if (index !== -1) {
            clearInterval(this.state.intervals.zombieMove[index]);
            this.state.intervals.zombieMove.splice(index, 1);
            this.state.zombies.splice(index, 1);
            zombie.remove();
        }
    }

    showHitEffect() {
        this.elements.hitEffect.classList.add('active');
        setTimeout(() => {
            this.elements.hitEffect.classList.remove('active');
        }, 500);
        
        this.playSound('hitSound');
        this.elements.gameArea.classList.add('shake');
        setTimeout(() => {
            this.elements.gameArea.classList.remove('shake');
        }, 500);
    }

    createExplosion() {
        const playerRect = this.elements.player.getBoundingClientRect();
        const gameAreaRect = this.elements.gameArea.getBoundingClientRect();
        
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        
        const x = playerRect.left - gameAreaRect.left + playerRect.width/2 - 30;
        const y = playerRect.top - gameAreaRect.top + playerRect.height/2 - 30;
        
        explosion.style.left = `${x}px`;
        explosion.style.top = `${y}px`;
        
        this.elements.gameArea.appendChild(explosion);
        
        setTimeout(() => explosion.remove(), 500);
        this.elements.player.style.visibility = 'hidden';
        this.playSound('explosionSound');
    }

    endGame() {
        this.state.gameOver = true;
        
        clearInterval(this.state.intervals.createZombie);
        this.state.intervals.zombieMove.forEach(clearInterval);
        this.state.intervals.zombieMove = [];
        
        this.state.zombies.forEach(zombie => zombie.remove());
        this.state.zombies = [];
        
        this.createExplosion();
        this.elements.finalScoreValue.textContent = this.state.score;
        this.showModal(this.elements.gameOverScreen);
        
        if (this.audioManager.isInitialized) {
            this.audioManager.stopMusic();
        }
        
        this.updateMenuScores();
        
        if (window.ysdk && window.ysdk.features && window.ysdk.features.GameplayAPI) {
            window.ysdk.features.GameplayAPI.stop();
        }
    }

    togglePause() {
        this.state.isPaused = !this.state.isPaused;
        if (this.state.isPaused) {
            this.pauseGame();
        } else {
            this.resumeGame();
        }
    }

    pauseGame() {
        this.showModal(this.elements.pauseScreen);
        
        if (this.audioManager.isInitialized) {
            this.audioManager.pause();
        }
        
        if (window.ysdk && window.ysdk.features && window.ysdk.features.GameplayAPI) {
            window.ysdk.features.GameplayAPI.stop();
        }
    }

    resumeGame() {
        this.hideModal(this.elements.pauseScreen);
        
        if (this.audioManager.isInitialized && !this.state.gameOver) {
            this.audioManager.resume();
            this.tryPlayMusic();
        }
        
        if (window.ysdk && window.ysdk.features && window.ysdk.features.GameplayAPI) {
            window.ysdk.features.GameplayAPI.start();
        }
    }

    restartGame() {
        this.clearAllIntervals();
        this.resetGameState();
        this.hideModal(this.elements.gameOverScreen);
        this.startGame();
        this.tryPlayMusic();
    }

    clearAllIntervals() {
        clearInterval(this.state.intervals.createZombie);
        clearInterval(this.state.intervals.createBonus);
        this.state.intervals.zombieMove.forEach(clearInterval);
        this.state.intervals.bonusMove.forEach(clearInterval);
        this.state.intervals.zombieMove = [];
        this.state.intervals.bonusMove = [];
    }

    openShop() {
        this.updateShop();
        this.elements.shop.style.zIndex = "1002";
        this.showModal(this.elements.shop);
        this.elements.shop.querySelector('.modal-content').scrollTop = 0;
    }

    closeShop() {
        this.hideModal(this.elements.shop);
        if (this.state.gameOver && !this.elements.mainMenu.classList.contains('show')) {
            this.showModal(this.elements.gameOverScreen);
        }
    }

    updateShop() {
        this.elements.shopScore.textContent = this.state.totalScore;
        
        // Скины
        this.elements.skins.forEach(skin => {
            const skinType = skin.dataset.skin;
            const price = parseInt(skin.dataset.price);
            
            skin.classList.toggle('owned', this.state.purchasedSkins.includes(skinType));
            skin.classList.toggle('selected', skinType === this.state.selectedSkin);
            
            skin.textContent = this.state.purchasedSkins.includes(skinType) 
                ? `${skinType} (Куплен)` 
                : `${skinType} (${price} очков)`;
        });
        
        // Цвета игрока
        this.elements.colors.forEach(color => {
            const colorHex = color.dataset.color;
            const price = parseInt(color.dataset.price);
            
            color.classList.toggle('owned', this.state.purchasedColors.includes(colorHex));
            color.classList.toggle('selected', colorHex === this.state.currentColor);
            
            const baseText = color.textContent.split(' (')[0];
            color.textContent = this.state.purchasedColors.includes(colorHex) 
                ? `${baseText} (Куплен)` 
                : `${baseText} (${price} очков)`;
        });
        
        // Цвета фона
        this.elements.bgColorOptions.forEach(bgColor => {
            const bgColorValue = bgColor.dataset.bgcolor;
            const price = parseInt(bgColor.dataset.price);
            
            bgColor.classList.toggle('owned', this.state.purchasedBgColors.includes(bgColorValue));
            bgColor.classList.toggle('selected', bgColorValue === this.state.selectedBgColor);
            
            const baseText = bgColor.textContent.split(' (')[0];
            bgColor.textContent = this.state.purchasedBgColors.includes(bgColorValue) 
                ? `${baseText} (Куплен)` 
                : `${baseText} (${price})`;
        });
    }

    handleSkinClick(skinElement) {
        const skin = skinElement.dataset.skin;
        if (this.state.purchasedSkins.includes(skin)) {
            this.equipSkin(skin);
        } else {
            this.buySkin(skinElement);
        }
        this.updateShop();
    }

    equipSkin(skin) {
        this.state.selectedSkin = skin;
        this.elements.player.textContent = skin;
        localStorage.setItem('selectedSkin', skin);
        this.animateElement(this.elements.player, 'animate__bounce');
    }

    buySkin(skinElement) {
        const price = parseInt(skinElement.dataset.price);
        const skin = skinElement.dataset.skin;
        
        if (price <= this.state.totalScore) {
            this.state.totalScore -= price;
            localStorage.setItem('totalScore', this.state.totalScore);
            
            if (!this.state.purchasedSkins.includes(skin)) {
                this.state.purchasedSkins.push(skin);
                localStorage.setItem('purchasedSkins', JSON.stringify(this.state.purchasedSkins));
            }
            
            this.equipSkin(skin);
            this.playSound('coinSound');
            this.updateShop();
        }
    }

    handleColorClick(colorElement) {
        const color = colorElement.dataset.color;
        if (this.state.purchasedColors.includes(color)) {
            this.equipColor(color);
        } else {
            this.buyColor(colorElement);
        }
        this.updateShop();
    }

    buyColor(colorElement) {
        const price = parseInt(colorElement.dataset.price);
        const color = colorElement.dataset.color;
        
        if (price <= this.state.totalScore) {
            this.state.totalScore -= price;
            localStorage.setItem('totalScore', this.state.totalScore);
            
            if (!this.state.purchasedColors.includes(color)) {
                this.state.purchasedColors.push(color);
                localStorage.setItem('purchasedColors', JSON.stringify(this.state.purchasedColors));
            }
            
            this.equipColor(color);
            this.playSound('coinSound');
            this.updateShop();
        }
    }

    equipColor(color) {
        this.state.currentColor = color;
        this.elements.player.style.backgroundColor = color;
        this.elements.player.style.filter = `drop-shadow(0 0 5px ${this.hexToRGBA(color, 0.7)})`;
        localStorage.setItem('selectedColor', color);
        this.animateElement(this.elements.player, 'animate__pulse');
    }

    handleBgColorClick(bgColorElement) {
        const bgColor = bgColorElement.dataset.bgcolor;
        if (this.state.purchasedBgColors.includes(bgColor)) {
            this.equipBgColor(bgColor);
        } else {
            this.buyBgColor(bgColorElement);
        }
    }

    buyBgColor(bgColorElement) {
        const price = parseInt(bgColorElement.dataset.price);
        const bgColor = bgColorElement.dataset.bgcolor;
        
        if (price <= this.state.totalScore) {
            this.state.totalScore -= price;
            localStorage.setItem('totalScore', this.state.totalScore);
            
            if (!this.state.purchasedBgColors.includes(bgColor)) {
                this.state.purchasedBgColors.push(bgColor);
                localStorage.setItem('purchasedBgColors', JSON.stringify(this.state.purchasedBgColors));
            }
            
            this.equipBgColor(bgColor);
            this.playSound('coinSound');
            this.updateShop();
        }
    }

    equipBgColor(bgColor) {
        this.state.selectedBgColor = bgColor;
        localStorage.setItem('selectedBgColor', bgColor);
        
        const gameContainer = document.querySelector('.game-container');
        gameContainer.style.backgroundColor = bgColor;
        
        this.updateShop();
    }

    openSettings() {
        this.elements.settingsModal.style.zIndex = "1002";
        this.showModal(this.elements.settingsModal);
    }

    closeSettings() {
        this.hideModal(this.elements.settingsModal);
        if (this.state.gameOver && !this.elements.mainMenu.classList.contains('show')) {
            this.showModal(this.elements.gameOverScreen);
        }
    }

    updateMusicVolume() {
        this.state.currentMusicVolume = parseFloat(this.elements.musicVolume.value);
        localStorage.setItem('musicVolume', this.state.currentMusicVolume);
        this.updateVolumeDisplay();
        
        if (this.audioManager.isInitialized) {
            this.audioManager.setMusicVolume(this.state.currentMusicVolume);
        }
    }

    updateSoundVolume() {
        this.state.currentSoundVolume = parseFloat(this.elements.soundVolume.value);
        localStorage.setItem('soundVolume', this.state.currentSoundVolume);
        this.updateVolumeDisplay();
        
        if (this.audioManager.isInitialized) {
            this.audioManager.setSfxVolume(this.state.currentSoundVolume);
        }
    }

    updateVolumeDisplay() {
        this.elements.musicVolumeValue.textContent = `${Math.round(this.state.currentMusicVolume * 100)}%`;
        this.elements.soundVolumeValue.textContent = `${Math.round(this.state.currentSoundVolume * 100)}%`;
    }

    updateCurrentRankInfo() {
        const currentRank = this.ranks[this.state.currentRank];
        const isMaxRank = currentRank.isMax || this.state.currentRank === this.ranks.length - 1;
        
        this.elements.currentRankName.textContent = currentRank.name;
        
        if (isMaxRank) {
            this.elements.currentRankProgress.style.display = 'none';
            this.elements.currentRankXP.textContent = 'МАКСИМАЛЬНЫЙ РАНГ ДОСТИГНУТ!';
            this.elements.currentRankXP.style.color = '#f1c40f';
            this.elements.currentRankXP.style.fontWeight = 'bold';
        } else {
            this.elements.currentRankProgress.style.display = 'block';
            const nextRank = this.ranks[this.state.currentRank + 1];
            const xpForNextRank = nextRank.xpRequired - currentRank.xpRequired;
            const xpInCurrentRank = this.state.currentXp - currentRank.xpRequired;
            const progress = (xpInCurrentRank / xpForNextRank) * 100;
            
            this.elements.currentRankProgress.value = progress;
            this.elements.currentRankXP.textContent = `${xpInCurrentRank}/${xpForNextRank} XP (Всего: ${this.state.currentXp} XP)`;
            this.elements.currentRankXP.style.color = '#bdc3c7';
            this.elements.currentRankXP.style.fontWeight = 'normal';
        }
    }

    closeRanks() {
        this.hideModal(this.elements.ranksModal);
    }

    tryPlayMusic() {
        if (this.audioManager.isInitialized && this.state.currentMusicVolume > 0) {
            this.audioManager.playMusic('backgroundMusic', true);
        }
    }

    playSound(soundName) {
        if (this.audioManager.isInitialized && this.state.currentSoundVolume > 0) {
            this.audioManager.playSound(soundName);
        }
    }

    hexToRGBA(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    animateScore(element) {
        element.classList.add('score-up');
        setTimeout(() => {
            element.classList.remove('score-up');
        }, 300);
    }

    animateElement(element, animation) {
        element.classList.add('animate__animated', animation);
        setTimeout(() => {
            element.classList.remove('animate__animated', animation);
        }, 1000);
    }

    showModal(modal) {
        modal.classList.add('show');
    }

    hideModal(modal) {
        modal.classList.remove('show');
    }
}

document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});

document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
});

document.addEventListener('selectstart', function(e) {
    e.preventDefault();
});

let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new ZombieGame();
    window.game = game;
});