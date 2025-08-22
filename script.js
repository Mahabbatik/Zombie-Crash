class ZombieGame {
    constructor() {
        console.log('ZombieGame constructor called');
        
        // Сначала сохраняем ссылки на основные элементы, которые точно существуют
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
        
        // Отложим инициализацию остальных элементов до полной загрузки DOM
        this.delayedInit();
    }

    delayedInit() {
        // Ждем полной загрузки DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.finishInit());
        } else {
            this.finishInit();
        }
    }

    finishInit() {
        console.log('Finishing initialization...');
        
        // Теперь ищем остальные элементы
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
            backgroundOptions: document.querySelectorAll('.background-option'),
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
            currentRankXP: document.getElementById('currentRankXP')
        };

        console.log('Elements found:', this.elements);

        this.audio = {
            backgroundMusic: document.getElementById('backgroundMusic'),
            hitSound: document.getElementById('hitSound'),
            coinSound: document.getElementById('coinSound'),
            explosionSound: document.getElementById('explosionSound'),
            rankUpSound: new Audio('https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3')
        };

        this.ranks = [
           { name: "Iron I", xpRequired: 0, image: "images/ranks/iron_I.png" },
           { name: "Iron II", xpRequired: 100, image: "images/ranks/iron_II.png" },
            { name: "Iron III", xpRequired: 300, image: "images/ranks/iron_III.png" },
            { name: "Gold I", xpRequired: 600, image: "images/ranks/gold_I.png" },
            { name: "Gold II", xpRequired: 1000, image: "images/ranks/gold_II.png" },
            { name: "Gold III", xpRequired: 1500, image: "images/ranks/gold_III.png" },
            { name: "Emerald I", xpRequired: 2600, image: "images/ranks/emerald_I.png" },
            { name: "Emerald II", xpRequired: 3800, image: "images/ranks/emerald_II.png" },
            { name: "Emerald III", xpRequired: 5100, image: "images/ranks/emerald_III.png" },
            { name: "Sapphire I", xpRequired: 6500, image: "images/ranks/sapphire_I.png" },
            { name: "Sapphire II", xpRequired: 8000, image: "images/ranks/sapphire_II.png" },
            { name: "Sapphire III", xpRequired: 9600, image: "images/ranks/sapphire_III.png" },
            { name: "Ruby I", xpRequired: 11300, image: "images/ranks/ruby_I.png" },
            { name: "Ruby II", xpRequired: 13100, image: "images/ranks/ruby_II.png" },
            { name: "Ruby III", xpRequired: 15000, image: "images/ranks/ruby_III.png" }
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
                zombieMove: []
            },
            zombieSpawnRate: 500, // начальная скорость появления зомби (мс)
            minSpawnRate: 200,    // минимальная скорость появления
            purchasedSkins: JSON.parse(localStorage.getItem('purchasedSkins')) || ["🤪"],
            purchasedColors: JSON.parse(localStorage.getItem('purchasedColors')) || ["#e74c3c"],
            purchasedBackgrounds: JSON.parse(localStorage.getItem('purchasedBackgrounds')) || ["default"],
            currentMusicVolume: parseFloat(localStorage.getItem('musicVolume')) || 0.3,
            currentSoundVolume: parseFloat(localStorage.getItem('soundVolume')) || 1,
            currentColor: localStorage.getItem('selectedColor') || "#e74c3c",
            selectedSkin: localStorage.getItem('selectedSkin') || "🤪",
            selectedBackground: localStorage.getItem('selectedBackground') || "default"
        };

        this.init();
    }

    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.updateMenuScores();
        this.tryPlayMusic();
        this.updateRank();
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
    gameContainer.className = 'game-container';
    gameContainer.classList.add(`${this.state.selectedBackground}-bg`);
    
    this.elements.musicVolume.value = this.state.currentMusicVolume;
    this.elements.soundVolume.value = this.state.currentSoundVolume;
    this.updateVolumeDisplay();
    
    // ИСПРАВЛЕННЫЕ СТРОКИ:
    this.audio.backgroundMusic.volume = this.state.currentMusicVolume;
    this.audio.hitSound.volume = this.state.currentSoundVolume;
    this.audio.coinSound.volume = this.state.currentSoundVolume;
    this.audio.explosionSound.volume = this.state.currentSoundVolume;
    this.audio.rankUpSound.volume = this.state.currentSoundVolume;
}
    setupEventListeners() {
        this.elements.gameArea.addEventListener('mousemove', (e) => this.movePlayer(e));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.togglePause();
        });

        // Добавляем проверки на существование элементов перед добавлением обработчиков
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
        
        // Touch events для мобильных
        if (this.elements.startGameBtn) {
            this.elements.startGameBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startFromMenu();
            });
        }
        
        if (this.elements.menuShopBtn) {
            this.elements.menuShopBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.openShop();
            });
        }
        
        if (this.elements.menuSettingsBtn) {
            this.elements.menuSettingsBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.openSettings();
            });
        }
        
        if (this.elements.menuRanksBtn) {
            this.elements.menuRanksBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.showRanks();
            });
        }
        
        if (this.elements.backToMenuBtn) {
            this.elements.backToMenuBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.showMainMenu();
            });
        }
        
        if (this.elements.pauseToMenuBtn) {
            this.elements.pauseToMenuBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.showMainMenu();
            });
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
        
        if (this.elements.backgroundOptions) {
            this.elements.backgroundOptions.forEach(background => {
                background.addEventListener('click', () => this.handleBackgroundClick(background));
            });
        }
        if (this.elements.closeRanks) {
            this.elements.closeRanks.addEventListener('click', () => this.closeRanks());
    }
        if (this.elements.menuRanksBtn) {
            this.elements.menuRanksBtn.addEventListener('click', () => this.showRanksModal());
}
    }
    // Остальные методы остаются без изменений...
    startFromMenu() {
    this.hideModal(this.elements.mainMenu);
    this.startGame();
}

    showMainMenu() {
        this.updateMenuScores();
        this.showModal(this.elements.mainMenu);
        this.stopGame(); // Останавливаем игру
        this.updateMenuScores();
        this.showModal(this.elements.mainMenu);
    }
    stopGame() {
    // Останавливаем все интервалы
    this.clearAllIntervals();
    
    // Удаляем всех зомби
    this.state.zombies.forEach(zombie => zombie.remove());
    this.state.zombies = [];
    
    // Сбрасываем состояние игры
    this.state.gameOver = false;
    this.state.isPaused = false;
    
    // Скрываем все модальные окна игры
    this.hideModal(this.elements.gameOverScreen);
    this.hideModal(this.elements.pauseScreen);
    
    // Останавливаем музыку
    this.audio.backgroundMusic.pause();
}

    showRanksModal() {
    this.updateRanksModal();
    this.showModal(this.elements.ranksModal);
}

updateRanksModal() {
    // Очищаем список
    this.elements.ranksList.innerHTML = '';
    
    // Добавляем все ранги
    this.ranks.forEach((rank, index) => {
        const rankItem = document.createElement('div');
        rankItem.className = 'rank-item';
        
        // Проверяем, является ли этот ранг текущим
        if (index === this.state.currentRank) {
            rankItem.classList.add('current');
        }
        
        rankItem.innerHTML = `
            <img src="${rank.image}" alt="${rank.name}" class="rank-icon">
            <div class="rank-info">
                <div class="rank-name">${rank.name}</div>
                <div class="rank-xp">${rank.xpRequired} XP</div>
            </div>
        `;
        
        this.elements.ranksList.appendChild(rankItem);
    });
    
    // Обновляем информацию о текущем ранге
    this.updateCurrentRankInfo();
}

    startGame() {
    this.resetGameState();
    this.state.intervals.createZombie = setInterval(() => this.createZombie(), this.state.zombieSpawnRate);
}

    resetGameState() {
        this.state.lives = 3;
        this.state.zombieSpeed = 8;
        this.state.score = 0;
        this.state.gameOver = false;
        this.state.isPaused = false;
        this.state.zombies = [];
        this.state.intervals.zombieMove = [];
        
        this.elements.scoreDisplay.textContent = `Счёт: ${this.state.score}`;
        this.elements.highScoreDisplay.textContent = `Рекорд: ${this.state.highScore}`;
        this.elements.shopScore.textContent = this.state.totalScore;
        
        this.updateHearts();
        this.hideModal(this.elements.gameOverScreen);
        this.hideModal(this.elements.pauseScreen);
        this.state.zombieSpawnRate = 500; // сбрасываем скорость появления
        document.querySelectorAll('.zombie').forEach(zombie => zombie.remove());
        this.elements.player.style.visibility = 'visible';
        this.updateRank();
        document.querySelector('.game-container').className = 'game-container';
        document.querySelector('.game-container').classList.add(`${this.state.selectedBackground}-bg`);
    }

    movePlayer(event) {
        if (this.state.isPaused || this.state.gameOver) return;
        
        const gameAreaRect = this.elements.gameArea.getBoundingClientRect();
        const playerWidth = this.elements.player.offsetWidth;
        let newLeft = event.clientX - gameAreaRect.left;
        
        newLeft = Math.max(0, Math.min(newLeft, this.elements.gameArea.clientWidth - playerWidth));
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
        if (this.elements.player.classList.contains('invincible')) return false;
        
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
        this.state.score++;
        this.state.totalScore++;
        
        let xpEarned = 1;
        if (this.state.score % 15 === 0) {
            xpEarned += 5;
            this.state.zombieSpeed += 1;
        }
        if (this.state.score > this.state.highScore) {
            xpEarned += 10;
        }
         if (this.state.score % 15 === 0) {
        xpEarned += 5;
        this.state.zombieSpeed += 1;
        this.state.currentXp += xpEarned;
        }
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
         if (this.state.score % 10 === 0 && this.state.zombieSpawnRate > this.state.minSpawnRate) {
        xpEarned += 3;
        this.state.zombieSpawnRate -= 40; // уменьшаем интервал = больше зомби
        
        // Перезапускаем интервал создания зомби с новой скоростью
        clearInterval(this.state.intervals.createZombie);
        this.state.intervals.createZombie = setInterval(() => this.createZombie(), this.state.zombieSpawnRate);
    }
    
    if (this.state.score > this.state.highScore) {
        xpEarned += 10;
    }
        
        this.updateRank();
        this.playSound(this.audio.coinSound);
    }

    updateRank() {
    let rankIncreased = false;
    
    while (this.state.currentRank < this.ranks.length - 1 && 
           this.state.currentXp >= this.ranks[this.state.currentRank + 1].xpRequired) {
        this.state.currentRank++;
        rankIncreased = true;
        localStorage.setItem('currentRank', this.state.currentRank);
    }
    
    const currentRank = this.ranks[this.state.currentRank];
    const nextRank = this.state.currentRank < this.ranks.length - 1 ? 
        this.ranks[this.state.currentRank + 1] : currentRank;
    
    const xpForNextRank = nextRank.xpRequired - currentRank.xpRequired;
    const xpInCurrentRank = this.state.currentXp - currentRank.xpRequired;
    const progress = (xpInCurrentRank / xpForNextRank) * 100;
    
    this.elements.rankImage.innerHTML = `<img src="${currentRank.image}" alt="${currentRank.name}" class="rank-icon">`;
    this.elements.rankName.textContent = currentRank.name;
    this.elements.rankProgress.value = progress;
    this.elements.rankProgressText.textContent = 
        `${xpInCurrentRank}/${xpForNextRank} XP`;
    
    // Обновляем модальное окно рангов если оно открыто
    if (this.elements.ranksModal.classList.contains('show')) {
        this.updateRanksModal();
    }
    
    if (rankIncreased) {
        this.showRankUpNotification(currentRank);
    }
}

    showRankUpNotification(rank) {
        this.playSound(this.audio.rankUpSound);
        
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
        
        this.playSound(this.audio.hitSound);
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
        this.playSound(this.audio.explosionSound);
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
        this.audio.backgroundMusic.pause();
        
        this.updateMenuScores();
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
        this.audio.backgroundMusic.pause();
    }

    resumeGame() {
        this.hideModal(this.elements.pauseScreen);
        if (!this.state.gameOver) {
            this.audio.backgroundMusic.play();
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
        this.state.intervals.zombieMove.forEach(clearInterval);
        this.state.intervals.zombieMove = [];
    }

    openShop() {
        this.updateShop();
        this.elements.shop.style.zIndex = "1002";
        this.showModal(this.elements.shop);
    }

    closeShop() {
    this.hideModal(this.elements.shop);
    // Не показываем экран gameOver, если находимся в главном меню
    if (this.state.gameOver && !this.elements.mainMenu.classList.contains('show')) {
        this.showModal(this.elements.gameOverScreen);
    }
}

    updateShop() {
        this.elements.shopScore.textContent = this.state.totalScore;
        
        this.elements.skins.forEach(skin => {
            const skinType = skin.dataset.skin;
            const price = parseInt(skin.dataset.price);
            
            skin.classList.toggle('owned', this.state.purchasedSkins.includes(skinType));
            skin.classList.toggle('selected', skinType === this.state.selectedSkin);
            
            skin.textContent = this.state.purchasedSkins.includes(skinType) 
                ? `${skinType} (Куплен)` 
                : `${skinType} (${price} очков)`;
        });
        
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
        
        this.elements.backgroundOptions.forEach(background => {
            const bgType = background.dataset.background;
            const price = parseInt(background.dataset.price);
            
            background.classList.toggle('owned', this.state.purchasedBackgrounds.includes(bgType));
            background.classList.toggle('selected', bgType === this.state.selectedBackground);
            
            const baseText = background.textContent.split(' (')[0];
            background.textContent = this.state.purchasedBackgrounds.includes(bgType) 
                ? `${baseText} (Куплен)` 
                : `${baseText} (${price} очков)`;
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
        this.playSound(this.audio.coinSound);
        this.updateShop(); // Обновляем магазин
    } else {
        // Можно добавить уведомление, что не хватает очков
        console.log('Недостаточно очков для покупки');
    }
}

    equipColor(color) {
    this.state.currentColor = color;
    this.elements.player.style.backgroundColor = color;
    this.elements.player.style.filter = `drop-shadow(0 0 5px ${this.hexToRGBA(color, 0.7)})`;
    localStorage.setItem('selectedColor', color);
    this.animateElement(this.elements.player, 'animate__pulse');
    
    console.log('Color equipped:', color); // Для отладки
}

    handleBackgroundClick(backgroundElement) {
        const background = backgroundElement.dataset.background;
        if (this.state.purchasedBackgrounds.includes(background)) {
            this.equipBackground(background);
        } else {
            this.buyBackground(backgroundElement);
        }
        this.updateShop();
    }

    buyBackground(backgroundElement) {
        const price = parseInt(backgroundElement.dataset.price);
        const background = backgroundElement.dataset.background;
        
        if (price <= this.state.totalScore) {
            this.state.totalScore -= price;
            localStorage.setItem('totalScore', this.state.totalScore);
            
            if (!this.state.purchasedBackgrounds.includes(background)) {
                this.state.purchasedBackgrounds.push(background);
                localStorage.setItem('purchasedBackgrounds', JSON.stringify(this.state.purchasedBackgrounds));
            }
            
            this.equipBackground(background);
            this.playSound(this.audio.coinSound);
        }
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
        this.playSound(this.audio.coinSound);
        this.updateShop();
    } else {
        console.log('Недостаточно очков для покупки скина');
    }
}

    equipBackground(background) {
        this.state.selectedBackground = background;
        localStorage.setItem('selectedBackground', background);
        
        const gameContainer = document.querySelector('.game-container');
        gameContainer.className = 'game-container';
        gameContainer.classList.add(`${background}-bg`);
        
        this.animateElement(gameContainer, 'animate__pulse');
    }
    
    openSettings() {
        this.elements.settingsModal.style.zIndex = "1002";
        this.showModal(this.elements.settingsModal);
    }

    closeSettings() {
    this.hideModal(this.elements.settingsModal);
    // Не показываем экран gameOver, если находимся в главном меню
    if (this.state.gameOver && !this.elements.mainMenu.classList.contains('show')) {
        this.showModal(this.elements.gameOverScreen);
    }
      }   

    updateMusicVolume() {
        this.state.currentMusicVolume = parseFloat(this.elements.musicVolume.value);
        this.audio.backgroundMusic.volume = this.state.currentMusicVolume;
        localStorage.setItem('musicVolume', this.state.currentMusicVolume);
        this.updateVolumeDisplay();
    }

    updateSoundVolume() {
        this.state.currentSoundVolume = parseFloat(this.elements.soundVolume.value);
        Object.values(this.audio).forEach(sound => {
            if (sound) sound.volume = this.state.currentSoundVolume;
        });
        localStorage.setItem('soundVolume', this.state.currentSoundVolume);
        this.updateVolumeDisplay();
    }

    updateVolumeDisplay() {
        this.elements.musicVolumeValue.textContent = `${Math.round(this.state.currentMusicVolume * 100)}%`;
        this.elements.soundVolumeValue.textContent = `${Math.round(this.state.currentSoundVolume * 100)}%`;
    }
    updateCurrentRankInfo() {
    const currentRank = this.ranks[this.state.currentRank];
    const nextRank = this.state.currentRank < this.ranks.length - 1 ? 
        this.ranks[this.state.currentRank + 1] : currentRank;
    
    const xpForNextRank = nextRank.xpRequired - currentRank.xpRequired;
    const xpInCurrentRank = this.state.currentXp - currentRank.xpRequired;
    const progress = (xpInCurrentRank / xpForNextRank) * 100;
    
    this.elements.currentRankName.textContent = currentRank.name;
    this.elements.currentRankProgress.value = progress;
    this.elements.currentRankXP.textContent = 
        `${xpInCurrentRank}/${xpForNextRank} XP (Всего: ${this.state.currentXp} XP)`;
}
closeRanks() {
    this.hideModal(this.elements.ranksModal);
}

    tryPlayMusic() {
        if (this.state.currentMusicVolume > 0) {
            this.audio.backgroundMusic.play().catch(() => {});
        }
    }

    playSound(sound) {
        if (this.state.currentSoundVolume > 0 && sound) {
            sound.currentTime = 0;
            sound.play().catch(() => {});
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

let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new ZombieGame();
    window.game = game;
});
