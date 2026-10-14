const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// نظام الصعوبة
const difficulties = {
    easy: { enemyHealth: 0.7, enemyDamage: 0.7, coinMultiplier: 1.5 },
    normal: { enemyHealth: 1, enemyDamage: 1, coinMultiplier: 1 },
    hard: { enemyHealth: 1.5, enemyDamage: 1.5, coinMultiplier: 0.7 }
};

// حالة اللعبة
const game = {
    state: 'menu', // menu, playing, paused, upgrade, gameover, shop, achievements
    selectedWeapon: 'sword',
    level: 1,
    exp: 0,
    expToNext: 100,
    coins: parseInt(localStorage.getItem('coins') || '0'),
    time: 0,
    wave: 1,
    bossActive: false,
    boss: null,
    currentDifficulty: 'normal',
    coopMode: false,
    maxEnemies: 1, // بداية بعدد وحش واحد
    enemySpawnRate: 0.01, // معدل توليد أبطأ
    currentWave: 0, // تتبع الموجة الحالية
    waveProgress: [1, 3, 9, 12, 15, 20], // أعداد الوحوش لكل موجة
    isFullscreen: false // حالة ملء الشاشة
};

// ترقيات اللاعب الدائمة
const permanentUpgrades = {
    maxHealth: parseInt(localStorage.getItem('maxHealth') || '100'),
    damage: parseInt(localStorage.getItem('damage') || '10'),
    speed: parseInt(localStorage.getItem('speed') || '3'),
    healRate: parseInt(localStorage.getItem('healRate') || '1'),
    shield: parseInt(localStorage.getItem('shield') || '0')
};

// خاصية تكبير الشاشة
let zoomLevel = 1;
const minZoom = 0.5;
const maxZoom = 2;

// نظام الشخصيات
const characters = {
    warrior: {
        name: "المحارب",
        description: "شخصية متوازنة مع قوة هجوم متوسطة",
        icon: "⚔️",
        health: 100,
        damage: 10,
        speed: 3,
        color: "#4169E1",
        owned: true,
        price: 0,
        stats: {
            healthBonus: 0,
            damageBonus: 0,
            speedBonus: 0
        }
    },
    mage: {
        name: "الساحر",
        description: "شخصية سحرية مع ضرر عالي وصحة منخفضة",
        icon: "🔮",
        health: 80,
        damage: 15,
        speed: 2.5,
        color: "#9370DB",
        owned: false,
        price: 500,
        stats: {
            healthBonus: -20,
            damageBonus: 5,
            speedBonus: -0.5
        }
    },
    assassin: {
        name: "القاتل",
        description: "شخصية سريعة مع ضرر عالي وصحة منخفضة جداً",
        icon: "🗡️",
        health: 70,
        damage: 18,
        speed: 4,
        color: "#32CD32",
        owned: false,
        price: 1000,
        stats: {
            healthBonus: -30,
            damageBonus: 8,
            speedBonus: 1
        }
    }
};

// الشخصية المحددة حالياً
let selectedCharacter = localStorage.getItem('selectedCharacter') || 'warrior';

// اللاعب
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    health: 100, // تم التعديل إلى 100
    maxHealth: 100,
    speed: permanentUpgrades.speed,
    damage: permanentUpgrades.damage,
    weapon: 'sword',
    attackCooldown: 0,
    attackSpeed: 1,
    projectileSpeed: 8,
    healRate: permanentUpgrades.healRate,
    shield: permanentUpgrades.shield,
    skills: {
        multishot: 0,
        piercing: 0,
        speedBoost: 0,
        damageBoost: 0,
        lifeSteal: 0,
        explosion: 0
    },
    moveUp: false,
    moveDown: false,
    moveLeft: false,
    moveRight: false,
    icon: characters[selectedCharacter].icon,
    color: characters[selectedCharacter].color
};

// اللاعب الثاني (للعبة التعاونية)
const player2 = {
    x: canvas.width / 2 + 50,
    y: canvas.height / 2,
    radius: 20,
    health: 100, // تم التعديل إلى 100
    maxHealth: 100,
    speed: 3,
    damage: 10,
    weapon: 'sword',
    attackCooldown: 0,
    attackSpeed: 1,
    projectileSpeed: 8,
    healRate: 1,
    shield: 0,
    skills: {
        multishot: 0,
        piercing: 0,
        speedBoost: 0,
        damageBoost: 0,
        lifeSteal: 0,
        explosion: 0
    },
    active: false,
    moveUp: false,
    moveDown: false,
    moveLeft: false,
    moveRight: false,
    icon: "⚔️",
    color: "#FF69B4"
};

// المهارات الخاصة
const playerSpecialSkills = {
    dash: {
        cooldown: 0,
        maxCooldown: 5,
        duration: 0.2,
        speedMultiplier: 5,
        active: false
    },
    shockwave: {
        cooldown: 0,
        maxCooldown: 10,
        damage: 50,
        radius: 150
    }
};

// نظام اليوم والليلة
const dayNightCycle = {
    time: 0,
    dayLength: 120, // ثانية
    isNight: false,
    darknessOpacity: 0
};

// الأعداء
const enemies = [];
const projectiles = [];
const loot = [];
const particles = [];

// أنواع الأعداء - دم متغير حسب الوقت
const enemyTypes = {
    insect: {
        color: '#8B4513',
        baseHealth: 10, // دم أساسي
        speed: 1.5,
        damage: 5, // دم الأعداء على اللاعب
        radius: 15,
        exp: 10,
        coins: 1
    },
    plant: {
        color: '#228B22',
        baseHealth: 10,
        speed: 1.0,
        damage: 5,
        radius: 20,
        exp: 20,
        coins: 2
    },
    pumpkin: {
        color: '#FF6347',
        baseHealth: 10,
        speed: 1.5,
        damage: 5,
        radius: 25,
        exp: 30,
        coins: 3
    },
    crab: {
        color: '#DC143C',
        baseHealth: 10,
        speed: 1.5,
        damage: 5,
        radius: 30,
        exp: 40,
        coins: 4
    },
    bee: {
        color: '#FFD700',
        baseHealth: 10,
        speed: 2.0,
        damage: 5,
        radius: 12,
        exp: 25,
        coins: 2
    }
};

// أنواع الزعماء
const bossTypes = {
    giant: {
        name: "العملاق",
        health: 100, // دم الزعماء
        speed: 0.75,
        damage: 10, // دم الزعماء على اللاعب
        radius: 70,
        color: "#8B0000",
        attacks: ["stomp", "summon"]
    },
    wizard: {
        name: "الساحر",
        health: 100,
        speed: 1.5,
        damage: 10,
        radius: 50,
        color: "#4B0082",
        attacks: ["projectiles", "teleport"]
    },
    beast: {
        name: "الوحش",
        health: 100,
        speed: 1.5,
        damage: 10,
        radius: 60,
        color: "#2F4F4F",
        attacks: ["charge", "spikes"]
    }
};

// أنواع الأسلحة
const weaponTypes = {
    sword: {
        name: "السيف الفولاذي",
        description: "هجمات قوية عن قرب",
        projectileSpeed: 0,
        attackSpeed: 1,
        color: "#4169E1"
    },
    staff: {
        name: "العصا السحرية",
        description: "هجمات سحرية متوسطة المدى",
        projectileSpeed: 8,
        attackSpeed: 1,
        color: "#9370DB"
    },
    bow: {
        name: "القوس السحري",
        description: "هجمات دقيقة بعيدة المدى",
        projectileSpeed: 12,
        attackSpeed: 0.8,
        color: "#32CD32"
    }
};

// نظام تحسين الأسلحة
const weaponUpgrades = {
    sword: {
        name: "السيف الفولاذي",
        levels: [
            { damage: 10, name: "سيف عادي" },
            { damage: 15, name: "سيف حاد", cost: 100 },
            { damage: 25, name: "سيف لهب", cost: 250 },
            { damage: 40, name: "سيف جليدي", cost: 500 },
            { damage: 60, name: "سيف الأسطورة", cost: 1000 }
        ],
        currentLevel: parseInt(localStorage.getItem('sword_level') || '0')
    },
    staff: {
        name: "العصا السحرية",
        levels: [
            { damage: 8, projectileSpeed: 8, name: "عصا عادية" },
            { damage: 12, projectileSpeed: 10, name: "عصا النار", cost: 100 },
            { damage: 18, projectileSpeed: 12, name: "عصا البرق", cost: 250 },
            { damage: 28, projectileSpeed: 14, name: "عصا الجليد", cost: 500 },
            { damage: 40, projectileSpeed: 16, name: "عصا الخراب", cost: 1000 }
        ],
        currentLevel: parseInt(localStorage.getItem('staff_level') || '0')
    },
    bow: {
        name: "القوس السحري",
        levels: [
            { damage: 12, projectileSpeed: 12, name: "قوس عادي" },
            { damage: 18, projectileSpeed: 14, name: "قوس الريح", cost: 100 },
            { damage: 25, projectileSpeed: 16, name: "قوس الغابة", cost: 250 },
            { damage: 35, projectileSpeed: 18, name: "قوس الظل", cost: 500 },
            { damage: 50, projectileSpeed: 20, name: "قوس الآلهة", cost: 1000 }
        ],
        currentLevel: parseInt(localStorage.getItem('bow_level') || '0')
    }
};

// نظام الإنجازات
const achievements = {
    firstBlood: { 
        name: "أول دم", 
        description: "قتل أول عدو", 
        unlocked: localStorage.getItem('achievement_firstBlood') === 'true' 
    },
    survivor: { 
        name: "ناجي", 
        description: "البقاء على قيد الحياة لمدة دقيقة", 
        unlocked: localStorage.getItem('achievement_survivor') === 'true' 
    },
    hunter: { 
        name: "صياد", 
        description: "قتل 100 عدو", 
        unlocked: false, 
        progress: parseInt(localStorage.getItem('achievement_hunter') || '0'),
        maxProgress: 100
    },
    bossSlayer: { 
        name: "قاتل الزعماء", 
        description: "هزيمة 5 زعماء", 
        unlocked: false, 
        progress: parseInt(localStorage.getItem('achievement_bossSlayer') || '0'),
        maxProgress: 5
    },
    millionaire: { 
        name: "مليونير", 
        description: "جمع 1000 عملة", 
        unlocked: false, 
        progress: parseInt(localStorage.getItem('achievement_millionaire') || '0'),
        maxProgress: 1000
    }
};


// خيارات الترقية الجديدة
const upgradeOptions = [
    { name: 'نيران سريعة', skill: 'attackSpeed', icon: '🔥', description: 'تسريع معدل الهجوم' },
    { name: 'سهم ثلاثي', skill: 'multishot', icon: '🏹', description: 'إطلاق 3 projectiles' },
    { name: 'تجميد', skill: 'freeze', icon: '❄️', description: 'إبطاء الأعداء مؤقتاً' },
    { name: 'امتصاص الحياة', skill: 'lifeSteal', icon: '🩸', description: 'استعادة الصحة من الضرر' },
    { name: 'انفجار عند القتل', skill: 'explosion', icon: '💥', description: 'انفجار عند موت الأعداء' },
    { name: 'زيادة الصحة', skill: 'maxHealthBoost', icon: '❤️', description: 'زيادة صحة اللاعب' }
];

// عناصر المتجر الجديدة
const shopItems = [
    { name: 'زيادة الصحة', key: 'maxHealth', cost: 300, icon: '❤️', effect: '+50 صحة', maxLevel: 5, type: 'permanent' },
    { name: 'زيادة الهجوم', key: 'damage', cost: 400, icon: '⚔️', effect: '+10 ضرر', maxLevel: 5, type: 'permanent' },
    { name: 'زيادة السرعة', key: 'speed', cost: 250, icon: '💨', effect: '+0.5 سرعة', maxLevel: 5, type: 'permanent' },
    { name: 'استعادة الصحة', key: 'healRate', cost: 200, icon: '🩹', effect: '+1 معدل شفاء', maxLevel: 3, type: 'permanent' },
    { name: 'درع إضافي', key: 'shield', cost: 600, icon: '🛡️', effect: 'يمتص جزء من الضرر', maxLevel: 3, type: 'permanent' }
];


// مستويات الترقيات من التخزين
shopItems.forEach(item => {
    item.level = parseInt(localStorage.getItem(item.key + '_level') || '0');
    item.purchased = item.level > 0;
});

// أحداث الماوس
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

// إضافة أحداث تكبير الشاشة
canvas.addEventListener('wheel', (e) => {
    if (game.state !== 'playing') return;
    
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel * delta));
});

// إضافة زر ملء الشاشة
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
        game.isFullscreen = true;
    } else {
        document.exitFullscreen();
        game.isFullscreen = false;
    }
}

// أحداث المهارات الخاصة
document.addEventListener('keydown', (e) => {
    if (game.state !== 'playing') return;
    
    // مهارات اللاعب الأول
    if (e.key === 'Shift' && playerSpecialSkills.dash.cooldown <= 0) {
        activateDash(player);
    } else if (e.key === ' ' && playerSpecialSkills.shockwave.cooldown <= 0) {
        activateShockwave(player);
    }
    
    // حركة اللاعب الثاني
    if (player2.active) {
        if (e.key === 'w') player2.moveUp = true;
        if (e.key === 's') player2.moveDown = true;
        if (e.key === 'a') player2.moveLeft = true;
        if (e.key === 'd') player2.moveRight = true;
        
        // مهارات اللاعب الثاني
        if (e.key === 'Shift' && playerSpecialSkills.dash.cooldown <= 0) {
            activateDash(player2);
        } else if (e.key === ' ' && playerSpecialSkills.shockwave.cooldown <= 0) {
            activateShockwave(player2);
        }
    }
    
    // زر ملء الشاشة (F)
    if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
    }
});

document.addEventListener('keyup', (e) => {
    if (game.state !== 'playing') return;
    
    // توقف حركة اللاعب الثاني
    if (player2.active) {
        if (e.key === 'w') player2.moveUp = false;
        if (e.key === 's') player2.moveDown = false;
        if (e.key === 'a') player2.moveLeft = false;
        if (e.key === 'd') player2.moveRight = false;
    }
});

// تفعيل اللعب التعاوني
function toggleCoopMode() {
    game.coopMode = !game.coopMode;
    player2.active = game.coopMode;
    
    const button = document.getElementById('coopButton');
    if (button) {
        if (game.coopMode) {
            button.textContent = 'اللعب الفردي';
            button.style.background = 'linear-gradient(45deg, #00ff00, #00cc00)';
        } else {
            button.textContent = 'اللعب الثنائي';
            button.style.background = 'linear-gradient(45deg, #ff0000, #ff6600)';
        }
    }
}

// تفعيل مهارة الانفجارية
function activateDash(playerObj) {
    playerSpecialSkills.dash.active = true;
    playerSpecialSkills.dash.cooldown = playerSpecialSkills.dash.maxCooldown;
    
    setTimeout(() => {
        playerSpecialSkills.dash.active = false;
    }, playerSpecialSkills.dash.duration * 1000);
}

// تفعيل مهارة موجة الصدمة
function activateShockwave(playerObj) {
    playerSpecialSkills.shockwave.cooldown = playerSpecialSkills.shockwave.maxCooldown;
    
    // إنشاء تأثير الموجة
    createShockwaveEffect(playerObj.x, playerObj.y);
    
    // ضرر الأعداء في النطاق
    enemies.forEach(enemy => {
        const dx = enemy.x - playerObj.x;
        const dy = enemy.y - playerObj.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < playerSpecialSkills.shockwave.radius) {
            enemy.health -= playerSpecialSkills.shockwave.damage;
            
            if (enemy.health <= 0) {
                enemyDeath(enemy);
            }
        }
    });
    
    // ضرر الزعيم إذا كان موجوداً
    if (game.bossActive && game.boss) {
        const dx = game.boss.x - playerObj.x;
        const dy = game.boss.y - playerObj.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < playerSpecialSkills.shockwave.radius) {
            game.boss.health -= playerSpecialSkills.shockwave.damage;
            
            if (game.boss.health <= 0) {
                bossDeath();
            }
        }
    }
}

// إنشاء تأثير موجة الصدمة
function createShockwaveEffect(x, y) {
    for (let i = 0; i < 30; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.8,
            color: '#00ffff',
            radius: 6
        });
    }
}

// بدء اللعبة
function startGame() {
    game.state = 'playing';
    game.level = 1;
    game.exp = 0;
    game.expToNext = 100;
    game.time = 0;
    game.wave = 1;
    game.bossActive = false;
    game.currentWave = 0;
    game.maxEnemies = game.waveProgress[0];
    game.enemySpawnRate = 0.01;
    zoomLevel = 1; // إعادة تعيين التكبير
    
    // إعادة تعيين اللاعب
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    player.health = player.maxHealth;
    player.weapon = game.selectedWeapon;
    player.skills = {
        multishot: 0,
        piercing: 0,
        speedBoost: 0,
        damageBoost: 0,
        lifeSteal: 0,
        explosion: 0
    };
    
    // تطبيق الترقيات الدائمة
    shopItems.forEach(item => {
        if (item.purchased) {
            applyUpgrade(item);
        }
    });
    
    // الحفاظ على سرعة اللاعب الطبيعية إذا لم يشترِ شيئًا من المتجر
    if (!shopItems.find(item => item.key === 'speed' && item.purchased)) {
        player.speed = 3; // السرعة الطبيعية
    }
    
    // إعادة تعيين اللاعب الثاني إذا كان نشطاً
    if (player2.active) {
        player2.x = canvas.width / 2 + 50;
        player2.y = canvas.height / 2;
        player2.health = player2.maxHealth;
        player2.weapon = game.selectedWeapon;
        player2.skills = {
            multishot: 0,
            piercing: 0,
            speedBoost: 0,
            damageBoost: 0,
            lifeSteal: 0,
            explosion: 0
        };
        
        // الحفاظ على سرعة اللاعب الثاني الطبيعية إذا لم يشترِ شيئًا من المتجر
        if (!shopItems.find(item => item.key === 'speed' && item.purchased)) {
            player2.speed = 3; // السرعة الطبيعية
        }
    }
    
    // مسح المصفوفات
    enemies.length = 0;
    projectiles.length = 0;
    loot.length = 0;
    particles.length = 0;
    
    // إظهار واجهة اللعبة
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    
    // تحديث مستويات الأسلحة
    updateWeaponLevels();
    
    // تحديث الشخصية
    updatePlayerFromCharacter();
    
    updateUI();
    gameLoop();
}

// تحديث مستويات الأسلحة
function updateWeaponLevels() {
    // تحديث إحصائيات السلاح بناءً على المستوى
    const weaponUpgrade = weaponUpgrades[player.weapon];
    if (weaponUpgrade && weaponUpgrade.currentLevel > 0) {
        const levelData = weaponUpgrade.levels[weaponUpgrade.currentLevel];
        player.damage = permanentUpgrades.damage + levelData.damage;
        
        if (player.weapon === 'staff' || player.weapon === 'bow') {
            player.projectileSpeed = levelData.projectileSpeed;
        }
    }
    
    // نفس الشيء للاعب الثاني
    if (player2.active) {
        const weaponUpgrade2 = weaponUpgrades[player2.weapon];
        if (weaponUpgrade2 && weaponUpgrade2.currentLevel > 0) {
            const levelData = weaponUpgrade2.levels[weaponUpgrade2.currentLevel];
            player2.damage = 10 + levelData.damage;
            
            if (player2.weapon === 'staff' || player2.weapon === 'bow') {
                player2.projectileSpeed = levelData.projectileSpeed;
            }
        }
    }
}

// حلقة اللعبة
function gameLoop() {
    if (game.state !== 'playing') return;
    
    // حفظ حالة السياق
    ctx.save();
    
    // تطبيق التكبير بدون تمزق الشاشة
    
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // تحديث الوقت
    game.time += 1/60;
    
    // تحديث نظام اليوم والليلة
    updateDayNightCycle();
    
    // تحديث اللاعب
    updatePlayer(player);
    
    // تحديث اللاعب الثاني إذا كان نشطاً
    if (player2.active) {
        updatePlayer(player2);
    }
    
    // تحديث الأعداء
    updateEnemies();
    
    // تحديث ال projectiles
    updateProjectiles();
    
    // تحديث الغنائم
    updateLoot();
    
    // تحديث الجسيمات
    updateParticles();
    
    // تحديث مهارات خاصة
    updateSpecialSkills();
    
    // توليد الأعداء بمعدل أبطأ
    if (!game.bossActive && Math.random() < game.enemySpawnRate + game.wave * 0.019) {
        spawnEnemy();
    }
    
    // توليد الزعيم كل 30 ثانية
    if (game.time > 0 && game.time % 30 < 1/60 && !game.bossActive) {
        spawnBoss();
    }
    
    // الشفاء التلقائي
    if (player.health < player.maxHealth) {
        player.health = Math.min(player.maxHealth, player.health + player.healRate / 60);
    }
    
    if (player2.active && player2.health < player2.maxHealth) {
        player2.health = Math.min(player2.maxHealth, player2.healRate / 60);
    }
    
    // رسم كل شيء
    drawPlayer(player);
    if (player2.active) {
        drawPlayer(player2);
    }
    drawEnemies();
    drawProjectiles();
    drawLoot();
    drawParticles();
    
    // رسم الزعيم إذا كان نشطاً
    if (game.bossActive && game.boss) {
        drawBoss();
    }
    
    // رسم تأثير الليل
    drawNightEffect();
    
    // استعادة حالة السياق
    ctx.restore();
    
    updateUI();
    requestAnimationFrame(gameLoop);
}

// تحديث نظام اليوم والليلة
function updateDayNightCycle() {
    dayNightCycle.time += 1/60;
    const cycleProgress = (dayNightCycle.time % dayNightCycle.dayLength) / dayNightCycle.dayLength;
    
    // تغيير بين النهار والليل
    if (cycleProgress > 0.5 && !dayNightCycle.isNight) {
        dayNightCycle.isNight = true;
    } else if (cycleProgress <= 0.5 && dayNightCycle.isNight) {
        dayNightCycle.isNight = false;
    }
    
    // تحديث شفافية الظلام
    if (dayNightCycle.isNight) {
        dayNightCycle.darknessOpacity = Math.min(0.7, dayNightCycle.darknessOpacity + 0.01);
    } else {
        dayNightCycle.darknessOpacity = Math.max(0, dayNightCycle.darknessOpacity - 0.01);
    }
}

// رسم تأثير الليل
function drawNightEffect() {
    if (dayNightCycle.darknessOpacity > 0) {
        ctx.fillStyle = `rgba(0, 0, 20, ${dayNightCycle.darknessOpacity})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // رسم دائرة ضوء حول اللاعبين
        if (dayNightCycle.isNight) {
            // ضوء اللاعب الأول
            const gradient1 = ctx.createRadialGradient(
                player.x, player.y, 50,
                player.x, player.y, 200
            );
            gradient1.addColorStop(0, `rgba(100, 100, 255, ${0.3 * (1 - dayNightCycle.darknessOpacity)})`);
            gradient1.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = gradient1;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // ضوء اللاعب الثاني إذا كان نشطاً
            if (player2.active) {
                const gradient2 = ctx.createRadialGradient(
                    player2.x, player2.y, 50,
                    player2.x, player2.y, 200
                );
                gradient2.addColorStop(0, `rgba(255, 100, 100, ${0.3 * (1 - dayNightCycle.darknessOpacity)})`);
                gradient2.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = gradient2;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }
    }
}

// تحديث المهارات الخاصة
function updateSpecialSkills() {
    // تحديث مهارة الانفجارية
    if (playerSpecialSkills.dash.cooldown > 0) {
        playerSpecialSkills.dash.cooldown -= 1/60;
        const dashSkill = document.getElementById('dashSkill');
        if (dashSkill) {
            dashSkill.disabled = true;
            dashSkill.textContent = `انفجارية (${Math.ceil(playerSpecialSkills.dash.cooldown)}s)`;
        }
    } else {
        const dashSkill = document.getElementById('dashSkill');
        if (dashSkill) {
            dashSkill.disabled = false;
            dashSkill.textContent = 'انفجارية (Shift)';
        }
    }
    
    // تحديث مهارة موجة الصدمة
    if (playerSpecialSkills.shockwave.cooldown > 0) {
        playerSpecialSkills.shockwave.cooldown -= 1/60;
        const shockwaveSkill = document.getElementById('shockwaveSkill');
        if (shockwaveSkill) {
            shockwaveSkill.disabled = true;
            shockwaveSkill.textContent = `موجة صدمية (${Math.ceil(playerSpecialSkills.shockwave.cooldown)}s)`;
        }
    } else {
        const shockwaveSkill = document.getElementById('shockwaveSkill');
        if (shockwaveSkill) {
            shockwaveSkill.disabled = false;
            shockwaveSkill.textContent = 'موجة صدمية (Space)';
        }
    }
    
    // تحديث لوحة القدرات إذا كانت مفتوحة
    if (inventory.classList.contains('show')) {
        updateInventoryDisplay();
    }
}

// تحديث اللاعب
function updatePlayer(playerObj) {
    // الحركة بناءً على الماوس أو المفاتيح
    if (playerObj === player) {
        // اللاعب الأول يتحرك نحو الماوس
        const dx = mouseX - playerObj.x;
        const dy = mouseY - playerObj.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            let moveX = (dx / distance) * playerObj.speed * (1 + playerObj.skills.speedBoost * 0.15);
            let moveY = (dy / distance) * playerObj.speed * (1 + playerObj.skills.speedBoost * 0.15);
            
            if (playerSpecialSkills.dash.active) {
                moveX *= playerSpecialSkills.dash.speedMultiplier;
                moveY *= playerSpecialSkills.dash.speedMultiplier;
            }
            
            playerObj.x += moveX;
            playerObj.y += moveY;
        }
    } else {
        // اللاعب الثاني يتحرك بالمفاتيح كما هو
        let moveX = 0;
        let moveY = 0;
        
        if (playerObj.moveUp) moveY -= 1;
        if (playerObj.moveDown) moveY += 1;
        if (playerObj.moveLeft) moveX -= 1;
        if (playerObj.moveRight) moveX += 1;
        
        if (moveX !== 0 || moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= length;
            moveY /= length;
            
            let speed = playerObj.speed * (1 + playerObj.skills.speedBoost * 0.15);
            
            if (playerSpecialSkills.dash.active) {
                speed *= playerSpecialSkills.dash.speedMultiplier;
            }
            
            playerObj.x += moveX * speed;
            playerObj.y += moveY * speed;
        }
    }
    
    // الحفاظ على اللاعب داخل الشاشة
    playerObj.x = Math.max(playerObj.radius, Math.min(canvas.width - playerObj.radius, playerObj.x));
    playerObj.y = Math.max(playerObj.radius, Math.min(canvas.height - playerObj.radius, playerObj.y));
    
    // الهجوم التلقائي
    playerObj.attackCooldown -= 1/60;
    if (playerObj.attackCooldown <= 0) {
        attack(playerObj);
        playerObj.attackCooldown = 1 / playerObj.attackSpeed;
    }
}

// الهجوم
function attack(playerObj) {
    const weapon = weaponTypes[playerObj.weapon];
    
    if (playerObj.weapon === 'sword') {
        // هجوم بالسيف (دائرة حول اللاعب)
        createSlashEffect(playerObj.x, playerObj.y);
        
        // التحقق من الأعداء في النطاق
        enemies.forEach(enemy => {
            const dx = enemy.x - playerObj.x;
            const dy = enemy.y - playerObj.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 80) {
                const damage = playerObj.damage * (1 + playerObj.skills.damageBoost * 0.2);
                enemy.health -= damage;
                
                // امتصاص الحياة
                if (playerObj.skills.lifeSteal > 0) {
                    playerObj.health = Math.min(playerObj.maxHealth, playerObj.health + damage * playerObj.skills.lifeSteal * 0.05);
                }
                
                // إنشاء جسيمات
                createHitParticles(enemy.x, enemy.y);
                
                if (enemy.health <= 0) {
                    enemyDeath(enemy);
                }
            }
        });
    } else if (playerObj.weapon === 'staff' || playerObj.weapon === 'bow') {
        // هجوم بالعصا أو القوس (projectiles) - يتجه لأقرب عدو
        const numProjectiles = 1 + playerObj.skills.multishot * 2;
        
        // البحث عن أقرب عدو
        let closestEnemy = null;
        let closestDistance = Infinity;
        
        enemies.forEach(enemy => {
            const dx = enemy.x - playerObj.x;
            const dy = enemy.y - playerObj.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        });
        
        // إطلاق المقذوفات نحو العدو الأقرب
        for (let i = 0; i < numProjectiles; i++) {
            let angle;
            
            if (closestEnemy) {
                // التوجه نحو العدو الأقرب
                const dx = closestEnemy.x - playerObj.x;
                const dy = closestEnemy.y - playerObj.y;
                angle = Math.atan2(dy, dx);
                
                // إضافة بعض التشتت للإطلاق المتعدد
                if (numProjectiles > 1) {
                    const spread = 0.2;
                    angle += (i - (numProjectiles - 1) / 2) * spread;
                }
            } else {
                // إذا لم يوجد أعداء، أطلق نحو الماوس
                const dx = mouseX - playerObj.x;
                const dy = mouseY - playerObj.y;
                angle = Math.atan2(dy, dx);
            }
            
            projectiles.push({
                x: playerObj.x,
                y: playerObj.y,
                vx: Math.cos(angle) * playerObj.projectileSpeed,
                vy: Math.sin(angle) * playerObj.projectileSpeed,
                damage: playerObj.damage * (1 + playerObj.skills.damageBoost * 0.2),
                piercing: playerObj.skills.piercing > 0,
                radius: playerObj.weapon === 'bow' ? 6 : 8,
                color: playerObj.weapon === 'bow' ? '#32CD32' : '#00ffff',
                owner: playerObj
            });
        }
    }
}

// إنشاء تأثير السيف
function createSlashEffect(x, y) {
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 80;
        particles.push({
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2,
            life: 0.3,
            color: '#ffff00',
            radius: 5
        });
    }
}

// توليد العدو
function spawnEnemy() {
    if (enemies.length >= game.maxEnemies) return;
    
    const types = Object.keys(enemyTypes);
    const type = types[Math.floor(Math.random() * types.length)];
    const enemyData = enemyTypes[type];
    
    // تطبيق صعوبة اللعبة
    const difficulty = difficulties[game.currentDifficulty];
    
    // حساب دم العدو حسب الوقت
    let healthMultiplier = 1;
    if (game.time >= 360) { // بعد 6 دقائق
        healthMultiplier = 4; // 40 دم
    } else if (game.time >= 180) { // بعد 3 دقائق
        healthMultiplier = 3; // 30 دم
    } else { // في البداية
        healthMultiplier = 1; // 10 دم
    }
    
    // توليد من حافة الشاشة
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch(side) {
        case 0: x = Math.random() * canvas.width; y = -30; break;
        case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + 30; break;
        case 3: x = -30; y = Math.random() * canvas.height; break;
    }
    
    enemies.push({
        x: x,
        y: y,
        ...enemyData,
        health: enemyData.baseHealth * healthMultiplier * (1 + game.wave * 0.1) * difficulty.enemyHealth,
        maxHealth: enemyData.baseHealth * healthMultiplier * (1 + game.wave * 0.1) * difficulty.enemyHealth,
        damage: enemyData.damage * difficulty.enemyDamage,
        coins: Math.floor(enemyData.coins * difficulty.coinMultiplier)
    });
}

// توليد الزعيم
function spawnBoss() {
    game.bossActive = true;
    
    // إخفاء جميع الوحوش الصغيرة
    enemies.length = 0;
    
    // اختيار نوع الزعيم عشوائياً
    const bossTypeKeys = Object.keys(bossTypes);
    const bossTypeKey = bossTypeKeys[Math.floor(Math.random() * bossTypeKeys.length)];
    const bossType = bossTypes[bossTypeKey];
    
    const difficulty = difficulties[game.currentDifficulty];
    
    game.boss = {
        x: canvas.width / 2,
        y: 100,
        ...bossType,
        health: bossType.health * (1 + game.wave * 0.2) * difficulty.enemyHealth,
        maxHealth: bossType.health * (1 + game.wave * 0.2) * difficulty.enemyHealth,
        damage: bossType.damage * difficulty.enemyDamage,
        attackCooldown: 0,
        phase: 1
    };
    
    // تقلص ساحة المعركة
    createArenaShrink();
}

// إنشاء تأثير تقلص الساحة
function createArenaShrink() {
    const shrinkRadius = 250;
    for (let i = 0; i < 50; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.push({
            x: canvas.width / 2 + Math.cos(angle) * shrinkRadius,
            y: canvas.height / 2 + Math.sin(angle) * shrinkRadius,
            vx: 0,
            vy: 0,
            life: 2,
            color: '#ff0000',
            radius: 3
        });
    }
}

// تحديث الأعداء
function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // الحركة نحو أقرب لاعب
        let targetPlayer = player;
        let minDistance = Math.sqrt(Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2));
        
        if (player2.active) {
            const distanceToPlayer2 = Math.sqrt(Math.pow(enemy.x - player2.x, 2) + Math.pow(enemy.y - player2.y, 2));
            if (distanceToPlayer2 < minDistance) {
                minDistance = distanceToPlayer2;
                targetPlayer = player2;
            }
        }
        
        const dx = targetPlayer.x - enemy.x;
        const dy = targetPlayer.y - enemy.y;
        
        if (minDistance > 0) {
            enemy.x += (dx / minDistance) * enemy.speed;
            enemy.y += (dy / minDistance) * enemy.speed;
        }
        
        // التحقق من التصادم مع اللاعبين
        // مع اللاعب الأول
        const distanceToPlayer = Math.sqrt(Math.pow(enemy.x - player.x, 2) + Math.pow(enemy.y - player.y, 2));
        if (distanceToPlayer < player.radius + enemy.radius) {
            const damage = Math.max(0, enemy.damage - player.shield);
            player.health -= damage;
            createHitParticles(player.x, player.y);
            
            if (player.health <= 0) {
                gameOver();
            }
        }
        
        // مع اللاعب الثاني إذا كان نشطاً
        if (player2.active) {
            const distanceToPlayer2 = Math.sqrt(Math.pow(enemy.x - player2.x, 2) + Math.pow(enemy.y - player2.y, 2));
            if (distanceToPlayer2 < player2.radius + enemy.radius) {
                const damage = Math.max(0, enemy.damage - player2.shield);
                player2.health -= damage;
                createHitParticles(player2.x, player2.y);
                
                if (player2.health <= 0) {
                    player2.active = false;
                }
            }
        }
    }
    
    // تحديث الزعيم
    if (game.bossActive) {
        updateBoss();
    }
}

// تحديث الزعيم
function updateBoss() {
    if (!game.boss) return;
    
    const boss = game.boss;
    
    // الحركة نحو أقرب لاعب
    let targetPlayer = player;
    let minDistance = Math.sqrt(Math.pow(boss.x - player.x, 2) + Math.pow(boss.y - player.y, 2));
    
    if (player2.active) {
        const distanceToPlayer2 = Math.sqrt(Math.pow(boss.x - player2.x, 2) + Math.pow(boss.y - player2.y, 2));
        if (distanceToPlayer2 < minDistance) {
            minDistance = distanceToPlayer2;
            targetPlayer = player2;
        }
    }
    
    const dx = targetPlayer.x - boss.x;
    const dy = targetPlayer.y - boss.y;
    
    if (minDistance > 100) {
        boss.x += (dx / minDistance) * boss.speed;
        boss.y += (dy / minDistance) * boss.speed;
    }
    
    // هجمات الزعيم
    boss.attackCooldown -= 1/60;
    if (boss.attackCooldown <= 0) {
        updateBossAttacks();
    }
    
    // التحقق من التصادم مع اللاعبين
    // مع اللاعب الأول
    const distanceToPlayer = Math.sqrt(Math.pow(boss.x - player.x, 2) + Math.pow(boss.y - player.y, 2));
    if (distanceToPlayer < player.radius + boss.radius) {
        const damage = Math.max(0, boss.damage - player.shield);
        player.health -= damage;
        createHitParticles(player.x, player.y);
        
        if (player.health <= 0) {
            gameOver();
        }
    }
    
    // مع اللاعب الثاني إذا كان نشطاً
    if (player2.active) {
        const distanceToPlayer2 = Math.sqrt(Math.pow(boss.x - player2.x, 2) + Math.pow(boss.y - player2.y, 2));
        if (distanceToPlayer2 < player2.radius + boss.radius) {
            const damage = Math.max(0, boss.damage - player2.shield);
            player2.health -= damage;
            createHitParticles(player2.x, player2.y);
            
            if (player2.health <= 0) {
                player2.active = false;
            }
        }
    }
    
    // التحقق من موت الزعيم
    if (boss.health <= 0) {
        bossDeath();
    }
}

// تحديث هجمات الزعيم
function updateBossAttacks() {
    if (!game.boss || game.boss.attackCooldown > 0) return;
    
    const boss = game.boss;
    const attackType = boss.attacks[Math.floor(Math.random() * boss.attacks.length)];
    
    switch(attackType) {
        case "stomp":
            bossAttackStomp();
            boss.attackCooldown = 4;
            break;
        case "summon":
            bossAttackSummon();
            boss.attackCooldown = 6;
            break;
        case "projectiles":
            bossAttackProjectiles();
            boss.attackCooldown = 3;
            break;
        case "teleport":
            bossAttackTeleport();
            boss.attackCooldown = 5;
            break;
        case "charge":
            bossAttackCharge();
            boss.attackCooldown = 4;
            break;
        case "spikes":
            bossAttackSpikes();
            boss.attackCooldown = 7;
            break;
    }
}

// هجوم stomping للزعيم
function bossAttackStomp() {
    if (!game.boss) return;
    
    createShockwaveEffect(game.boss.x, game.boss.y);
    
    // ضرر اللاعبين في النطاق
    const distanceToPlayer = Math.sqrt(Math.pow(game.boss.x - player.x, 2) + Math.pow(game.boss.y - player.y, 2));
    if (distanceToPlayer < 200) {
        const damage = Math.max(0, 30 - player.shield);
        player.health -= damage;
        createHitParticles(player.x, player.y);
        
        if (player.health <= 0) {
            gameOver();
        }
    }
    
    if (player2.active) {
        const distanceToPlayer2 = Math.sqrt(Math.pow(game.boss.x - player2.x, 2) + Math.pow(game.boss.y - player2.y, 2));
        if (distanceToPlayer2 < 200) {
            const damage = Math.max(0, 30 - player2.shield);
            player2.health -= damage;
            createHitParticles(player2.x, player2.y);
            
            if (player2.health <= 0) {
                player2.active = false;
            }
        }
    }
}

// هجوم استدعاء للزعيم
function bossAttackSummon() {
    if (!game.boss) return;
    
    // استدعاء 3-5 أعداء
    const numEnemies = Math.floor(Math.random() * 6) + 6;
    
    for (let i = 0; i < numEnemies; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 100 + 50;
        
        const types = Object.keys(enemyTypes);
        const type = types[Math.floor(Math.random() * types.length)];
        const enemyData = enemyTypes[type];
        
        enemies.push({
            x: game.boss.x + Math.cos(angle) * distance,
            y: game.boss.y + Math.sin(angle) * distance,
            ...enemyData,
            health: enemyData.baseHealth * 0.7,
            maxHealth: enemyData.baseHealth * 0.7
        });
    }
}

// هجوم مقذوفات للزعيم
function bossAttackProjectiles() {
    if (!game.boss) return;
    
    // إطلاق 8 مقذوفات في اتجاهات مختلفة
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        projectiles.push({
            x: game.boss.x,
            y: game.boss.y,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            damage: 15,
            piercing: true,
            radius: 10,
            color: '#ff00ff',
            isEnemy: true
        });
    }
}

// هجوم انتقال للزعيم
function bossAttackTeleport() {
    if (!game.boss) return;
    
    // إنشاء تأثير اختفاء
    createExplosion(game.boss.x, game.boss.y, false);
    
    // الانتقال إلى موقع عشوائي
    game.boss.x = Math.random() * (canvas.width - 100) + 50;
    game.boss.y = Math.random() * (canvas.height - 100) + 50;
    
    // إنشاء تأثير ظهور
    createExplosion(game.boss.x, game.boss.y, false);
}

// هجوم انقضاض للزعيم
function bossAttackCharge() {
    if (!game.boss) return;
    
    // تحديد الهدف
    let targetPlayer = player;
    let minDistance = Math.sqrt(Math.pow(game.boss.x - player.x, 2) + Math.pow(game.boss.y - player.y, 2));
    
    if (player2.active) {
        const distanceToPlayer2 = Math.sqrt(Math.pow(game.boss.x - player2.x, 2) + Math.pow(game.boss.y - player2.y, 2));
        if (distanceToPlayer2 < minDistance) {
            minDistance = distanceToPlayer2;
            targetPlayer = player2;
        }
    }
    
    // الانقضاض نحو الهدف
    const dx = targetPlayer.x - game.boss.x;
    const dy = targetPlayer.y - game.boss.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
        const chargeSpeed = 10;
        const chargeX = (dx / distance) * chargeSpeed;
        const chargeY = (dy / distance) * chargeSpeed;
        
        // تحريك الزعيم بسرعة
        game.boss.x += chargeX;
        game.boss.y += chargeY;
        
        // التحقق من التصادم
        const newDistanceToPlayer = Math.sqrt(Math.pow(game.boss.x - player.x, 2) + Math.pow(game.boss.y - player.y, 2));
        if (newDistanceToPlayer < player.radius + game.boss.radius) {
            const damage = Math.max(0, 40 - player.shield);
            player.health -= damage;
            createHitParticles(player.x, player.y);
            
            if (player.health <= 0) {
                gameOver();
            }
        }
        
        if (player2.active) {
            const newDistanceToPlayer2 = Math.sqrt(Math.pow(game.boss.x - player2.x, 2) + Math.pow(game.boss.y - player2.y, 2));
            if (newDistanceToPlayer2 < player2.radius + game.boss.radius) {
                const damage = Math.max(0, 40 - player2.shield);
                player2.health -= damage;
                createHitParticles(player2.x, player2.y);
                
                if (player2.health <= 0) {
                    player2.active = false;
                }
            }
        }
    }
}

// هجوم أشواك للزعيم
function bossAttackSpikes() {
    if (!game.boss) return;
    
    // إنشاء أشواك في أماكن عشوائية
    const numSpikes = Math.floor(Math.random() * 5) + 5;
    
    for (let i = 0; i < numSpikes; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        
        // إنشاء تأثير تحذير
        for (let j = 0; j < 10; j++) {
            const angle = Math.random() * Math.PI * 2;
            particles.push({
                x: x + Math.cos(angle) * 20,
                y: y + Math.sin(angle) * 20,
                vx: 0,
                vy: 0,
                life: 1,
                color: '#ff0000',
                radius: 3
            });
        }
        
        // بعد ثانية، إنشاء الضرر
        setTimeout(() => {
            // التحقق من اللاعبين في النطاق
            const distanceToPlayer = Math.sqrt(Math.pow(x - player.x, 2) + Math.pow(y - player.y, 2));
            if (distanceToPlayer < 50) {
                const damage = Math.max(0, 25 - player.shield);
                player.health -= damage;
                createHitParticles(player.x, player.y);
                
                if (player.health <= 0) {
                    gameOver();
                }
            }
            
            if (player2.active) {
                const distanceToPlayer2 = Math.sqrt(Math.pow(x - player2.x, 2) + Math.pow(y - player2.y, 2));
                if (distanceToPlayer2 < 50) {
                    const damage = Math.max(0, 25 - player2.shield);
                    player2.health -= damage;
                    createHitParticles(player2.x, player2.y);
                    
                    if (player2.health <= 0) {
                        player2.active = false;
                    }
                }
            }
            
            // إنشاء تأثير الانفجار
            createExplosion(x, y, false);
        }, 1000);
    }
}

// تحديث ال projectiles
function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        
        proj.x += proj.vx;
        proj.y += proj.vy;
        
        // التحقق من الخروج من الشاشة
        if (proj.x < 0 || proj.x > canvas.width || proj.y < 0 || proj.y > canvas.height) {
            projectiles.splice(i, 1);
            continue;
        }
        
        // التحقق من التصادم مع الأعداء
        if (!proj.isEnemy) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                const dx = proj.x - enemy.x;
                const dy = proj.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < proj.radius + enemy.radius) {
                    enemy.health -= proj.damage;
                    
                    // امتصاص الحياة
                    if (proj.owner && proj.owner.skills.lifeSteal > 0) {
                        proj.owner.health = Math.min(proj.owner.maxHealth, proj.owner.health + proj.damage * proj.owner.skills.lifeSteal * 0.05);
                    }
                    
                    createHitParticles(enemy.x, enemy.y);
                    
                    if (enemy.health <= 0) {
                        enemyDeath(enemy);
                    }
                    
                    if (!proj.piercing) {
                        projectiles.splice(i, 1);
                    }
                    break;
                }
            }
            
            // التحقق من التصادم مع الزعيم
            if (game.bossActive && game.boss && proj) {
                const dx = proj.x - game.boss.x;
                const dy = proj.y - game.boss.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < proj.radius + game.boss.radius) {
                    game.boss.health -= proj.damage;
                    createHitParticles(game.boss.x, game.boss.y);
                    
                    if (!proj.piercing) {
                        projectiles.splice(i, 1);
                    }
                }
            }
        } else {
            // projectiles العدو
            // مع اللاعب الأول
            const dx1 = proj.x - player.x;
            const dy1 = proj.y - player.y;
            const distance1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
            
            if (distance1 < proj.radius + player.radius) {
                const damage = Math.max(0, proj.damage - player.shield);
                player.health -= damage;
                createHitParticles(player.x, player.y);
                projectiles.splice(i, 1);
                
                if (player.health <= 0) {
                    gameOver();
                }
                continue;
            }
            
            // مع اللاعب الثاني إذا كان نشطاً
            if (player2.active) {
                const dx2 = proj.x - player2.x;
                const dy2 = proj.y - player2.y;
                const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                
                if (distance2 < proj.radius + player2.radius) {
                    const damage = Math.max(0, proj.damage - player2.shield);
                    player2.health -= damage;
                    createHitParticles(player2.x, player2.y);
                    projectiles.splice(i, 1);
                    
                    if (player2.health <= 0) {
                        player2.active = false;
                    }
                }
            }
        }
    }
}

// موت العدو
function enemyDeath(enemy) {
    const index = enemies.indexOf(enemy);
    if (index > -1) {
        enemies.splice(index, 1);
        
        // إضافة خبرة
        game.exp += enemy.exp;
        
        // إضافة عملات
        game.coins += enemy.coins;
        
        // إنشاء غنيمة
        loot.push({
            x: enemy.x,
            y: enemy.y,
            type: 'exp',
            value: enemy.exp,
            radius: 10,
            color: '#00ff00'
        });
        
        loot.push({
            x: enemy.x + 10,
            y: enemy.y + 10,
            type: 'coin',
            value: enemy.coins,
            radius: 8,
            color: '#ffd700'
        });
        
        // تأثير الانفجار
        const owner = player.skills.explosion > 0 ? player : (player2.active && player2.skills.explosion > 0 ? player2 : null);
        if (owner) {
            createExplosion(enemy.x, enemy.y);
        }
        
        // تحديث الإنجازات
        updateAchievements('enemyKilled');
        
        // التحقق من رفع المستوى
        checkLevelUp();
    }
}

// موت الزعيم
function bossDeath() {
    game.bossActive = false;
    
    // مكافآت الزعيم
    game.exp += 200;
    game.coins += 50;
    
    
    // إنشاء غنائم كثيرة
    for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 50;
        loot.push({
            x: game.boss.x + Math.cos(angle) * distance,
            y: game.boss.y + Math.sin(angle) * distance,
            type: 'exp',
            value: 10,
            radius: 10,
            color: '#00ff00'
        });
    }
    
    for (let i = 0; i < 10; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 50;
        loot.push({
            x: game.boss.x + Math.cos(angle) * distance,
            y: game.boss.y + Math.sin(angle) * distance,
            type: 'coin',
            value: 5,
            radius: 8,
            color: '#ffd700'
        });
    }
    
    // تأثير انفجار كبير
    createExplosion(game.boss.x, game.boss.y, true);
    
    game.boss = null;
    game.wave++;
    
    // زيادة عدد الوحوش للموجة التالية
    if (game.currentWave < game.waveProgress.length - 1) {
        game.currentWave++;
        game.maxEnemies = game.waveProgress[game.currentWave];
    } else {
        game.maxEnemies = game.waveProgress[game.waveProgress.length - 1];
    }
    
    // تحديث الإنجازات
    updateAchievements('bossKilled');
    
    checkLevelUp();
}

// إنشاء انفجار
function createExplosion(x, y, big = false) {
    const numParticles = big ? 30 : 15;
    const radius = big ? 100 : 50;
    
    for (let i = 0; i < numParticles; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: big ? 1 : 0.5,
            color: big ? '#ff6600' : '#ff0000',
            radius: big ? 8 : 5
        });
    }
    
    // ضرر الانفجار
    const owner = player.skills.explosion > 0 ? player : (player2.active && player2.skills.explosion > 0 ? player2 : null);
    if (owner) {
        const explosionDamage = owner.damage * owner.skills.explosion * 0.5;
        enemies.forEach(enemy => {
            const dx = enemy.x - x;
            const dy = enemy.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < radius) {
                enemy.health -= explosionDamage;
                if (enemy.health <= 0) {
                    enemyDeath(enemy);
                }
            }
        });
    }
}

// تحديث الغنائم
function updateLoot() {
    for (let i = loot.length - 1; i >= 0; i--) {
        const item = loot[i];
        
        // جذب الغنيمة نحو اللاعبين
        let attracted = false;
        
        // جذب نحو اللاعب الأول
        const dx1 = player.x - item.x;
        const dy1 = player.y - item.y;
        const distance1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
        
        if (distance1 < 100) {
            item.x += (dx1 / distance1) * 5;
            item.y += (dy1 / distance1) * 5;
            attracted = true;
        }
        
        // جذب نحو اللاعب الثاني إذا كان نشطاً
        if (player2.active) {
            const dx2 = player2.x - item.x;
            const dy2 = player2.y - item.y;
            const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            
            if (distance2 < 100 && distance2 < distance1) {
                item.x += (dx2 / distance2) * 5;
                item.y += (dy2 / distance2) * 5;
                attracted = true;
            }
        }
        
        // التحقص من جمع الغنيمة
        if (distance1 < player.radius + item.radius) {
            if (item.type === 'exp') {
                game.exp += item.value;
                checkLevelUp();
            } else if (item.type === 'coin') {
                game.coins += item.value;
                updateAchievements('coinsCollected', item.value);
            }
            
            loot.splice(i, 1);
            createCollectParticles(item.x, item.y, item.color);
        } else if (player2.active) {
            const dx2 = player2.x - item.x;
            const dy2 = player2.y - item.y;
            const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            
            if (distance2 < player2.radius + item.radius) {
                if (item.type === 'exp') {
                    game.exp += item.value;
                    checkLevelUp();
                } else if (item.type === 'coin') {
                    game.coins += item.value;
                    updateAchievements('coinsCollected', item.value);
                }
                
                loot.splice(i, 1);
                createCollectParticles(item.x, item.y, item.color);
            }
        }
    }
}

// تحديث الجسيمات
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 1/60;
        
        if (particle.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// إنشاء جسيمات ضرب
function createHitParticles(x, y) {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 0.3,
            color: '#ff0000',
            radius: 3
        });
    }
}

// إنشاء جسيمات جمع
function createCollectParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * 2,
            vy: Math.sin(angle) * 2,
            life: 0.5,
            color: color,
            radius: 4
        });
    }
}

// التحقص من رفع المستوى
function checkLevelUp() {
    while (game.exp >= game.expToNext) {
        game.exp -= game.expToNext;
        game.level++;
        game.expToNext = game.level * 100;
        
        // فتح قائمة الترقيات
        showUpgradeMenu();
    }
}

// إظهار قائمة الترقيات
function showUpgradeMenu() {
    game.state = 'upgrade';
    const menu = document.getElementById('upgradeMenu');
    const options = document.getElementById('upgradeOptions');
    
    options.innerHTML = '';
    
    // اختيار 3 ترقيات عشوائية
    const availableUpgrades = [...upgradeOptions];
    const selectedUpgrades = [];
    
    for (let i = 0; i < 3 && availableUpgrades.length > 0; i++) {
        const index = Math.floor(Math.random() * availableUpgrades.length);
        selectedUpgrades.push(availableUpgrades[index]);
        availableUpgrades.splice(index, 1);
    }
    
    selectedUpgrades.forEach(upgrade => {
        const option = document.createElement('div');
        option.className = 'upgrade-option';
        option.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 5px;">${upgrade.icon}</div>
            <div style="font-weight: bold;">${upgrade.name}</div>
            <div style="font-size: 14px; color: #ccc;">${upgrade.description}</div>
        `;
        option.addEventListener('click', () => {
            player.skills[upgrade.skill]++;
            if (player2.active) {
                player2.skills[upgrade.skill]++;
            }
            updateSkills(); // تحديث لوحة القدرات
            menu.style.display = 'none';
            game.state = 'playing';
            gameLoop();
        });
        options.appendChild(option);
    });
    
    menu.style.display = 'block';
}

// نهاية اللعبة
function gameOver() {
    // التحقق من وجود ترقية الإحياء
    const reviveUpgrade = shopItems.find(item => item.key === 'revive');
    
    if (reviveUpgrade && reviveUpgrade.purchased) {
        // استخدام الإحياء
        reviveUpgrade.purchased = false;
        reviveUpgrade.level = 0;
        localStorage.setItem('revive_level', '0');
        
        // إعادة حياة اللاعب
        player.health = player.maxHealth;
        
        // إظهار إشعار
        showNotification('تم إحيائك ! استمر في القتال!');
        
        return;
    }
    
    // إذا لم يكن هناك إحياء، إنهاء اللعبة كالمعتاد
    game.state = 'Gameover.';
    
    // حفظ العملات
    localStorage.setItem('coins', game.coins.toString());
    
    // تحديث الإنجازات
    updateAchievements('GameOver');
    
    // إظهار شاشة النهاية
    document.getElementById('finalLevel').textContent = game.level;
    document.getElementById('survivalTime').textContent = Math.floor(game.time);
    document.getElementById('coinsEarned').textContent = game.coins;
    document.getElementById('GameOver').style.display = 'block';
}

// تحديث واجهة المستخدم
function updateUI() {
    // شريط صحة اللاعب الأول
    const healthPercent = (player.health / player.maxHealth) * 100;
    const healthFill = document.getElementById('healthFill');
    if (healthFill) {
        healthFill.style.width = healthPercent + '%';
    }

    // شريط الخبرة
    const expPercent = (game.exp / game.expToNext) * 100;
    const expFill = document.getElementById('expFill');
    if (expFill) {
        expFill.style.width = expPercent + '%';
    }
    // المستوى
    const levelDisplay = document.getElementById('levelDisplay');
    if (levelDisplay) {
        levelDisplay.textContent = game.level;
    }
    
    // العملات
    const coinsDisplay = document.getElementById('coinsDisplay');
    if (coinsDisplay) {
        coinsDisplay.textContent = game.coins;
    }
    
    // إضافة مؤشر التكبير
    if (!document.getElementById('zoomIndicator')) {
        const zoomIndicator = document.createElement('div');
        zoomIndicator.id = 'zoomIndicator';
        zoomIndicator.style.position = 'absolute';
        zoomIndicator.style.top = '10px';
        zoomIndicator.style.right = '10px';
        zoomIndicator.style.background = 'rgba(0, 0, 0, 0.7)';
        zoomIndicator.style.color = 'white';
        zoomIndicator.style.padding = '5px 10px';
        zoomIndicator.style.borderRadius = '5px';
        zoomIndicator.style.fontSize = '14px';
        const gameUI = document.getElementById('gameUI');
        if (gameUI) {
            gameUI.appendChild(zoomIndicator);
        }
    }
    const zoomIndicator = document.getElementById('zoomIndicator');
    if (zoomIndicator) {
        zoomIndicator.textContent = `التكبير: ${Math.round(zoomLevel * 100)}%`;
    }

    
    // إضافة زر ملء الشاشة
    if (!document.getElementById('fullscreenButton')) {
        const fullscreenButton = document.createElement('button');
        fullscreenButton.id = 'fullscreenButton';
        fullscreenButton.className = 'skill-button';
        fullscreenButton.textContent = 'ملء الشاشة (F)';
        fullscreenButton.style.position = 'absolute';
        fullscreenButton.style.bottom = '20px';
        fullscreenButton.style.left = '50%';
        fullscreenButton.style.transform = 'translateX(-50%)';
        fullscreenButton.addEventListener('click', toggleFullscreen);
        const gameUI = document.getElementById('gameUI');
        if (gameUI) {
            gameUI.appendChild(fullscreenButton);
        }
    }
}

// فتح المتجر
function openShop() {
    game.state = 'shop';
    const mainMenu = document.getElementById('mainMenu');
    const shopMenu = document.getElementById('shopMenu');
    if (mainMenu) mainMenu.style.display = 'none';
    if (shopMenu) {
        shopMenu.style.display = 'block';
        const shopCoins = document.getElementById('shopCoins');
        if (shopCoins) shopCoins.textContent = game.coins;
    }
    
    // تحديث تبويبات المتجر
    updateShopTabs();
    
    // تحديث عناصر المتجر
    updateShopItems();
    
    // تحديث شخصيات المتجر
    updateCharacters();
}

// تحديث تبويبات المتجر
function updateShopTabs() {
    const tabs = document.querySelectorAll('.shop-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // إزالة الفئة النشطة من جميع التبويبات
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // إضافة الفئة النشطة للتبويب المحدد
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab') + '-tab';
            const tabElement = document.getElementById(tabId);
            if (tabElement) {
                tabElement.classList.add('active');
            }
        });
    });
}

// تحديث شخصيات المتجر
function updateCharacters() {
    const container = document.getElementById('charactersContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(characters).forEach(charKey => {
        const character = characters[charKey];
        const card = document.createElement('div');
        card.className = `character-card ${!character.owned ? 'locked' : ''} ${selectedCharacter === charKey ? 'selected' : ''}`;
        
        // شارة الشخصية
        let badge = '';
        if (charKey === 'warrior') {
            badge = '<div class="character-badge">افتراضي</div>';
        } else if (character.stats.damageBonus > 0) {
            badge = '<div class="character-badge">هجوم</div>';
        } else if (character.stats.speedBonus > 0) {
            badge = '<div class="character-badge">سرعة</div>';
        }
        
        card.innerHTML = `
            ${badge}
            <div class="character-icon">${character.icon}</div>
            <div class="character-name">${character.name}</div>
            <div class="character-description">${character.description}</div>
            <div class="character-stats">
                <div>الصحة: <span>${character.health}</span></div>
                <div>الضرر: <span>${character.damage}</span></div>
                <div>السرعة: <span>${character.speed}</span></div>
            </div>
        `;
        
        // زر الشراء أو الاختيار
        if (character.owned) {
            if (selectedCharacter === charKey) {
                card.innerHTML += `<button class="select-character-btn" disabled>محدد</button>`;
            } else {
                const selectBtn = document.createElement('button');
                selectBtn.className = 'select-character-btn';
                selectBtn.textContent = 'اختيار';
                selectBtn.addEventListener('click', () => selectCharacter(charKey));
                card.appendChild(selectBtn);
            }
        } else {
            const priceBtn = document.createElement('button');
            priceBtn.className = 'buy-character-btn';
            priceBtn.textContent = `شراء (${character.price})`;
            priceBtn.disabled = game.coins < character.price;
            priceBtn.addEventListener('click', () => buyCharacter(charKey));
            card.appendChild(priceBtn);
        }
        
        container.appendChild(card);
    });
}

// شراء شخصية
function buyCharacter(characterKey) {
    const character = characters[characterKey];
    
    if (game.coins >= character.price && !character.owned) {
        game.coins -= character.price;
        character.owned = true;
        
        // حفظ حالة الشخصية
        localStorage.setItem(`character_${characterKey}_owned`, 'true');
        localStorage.setItem('coins', game.coins.toString());
        
        // تحديث الواجهة
        updateCharacters();
        const shopCoins = document.getElementById('shopCoins');
        if (shopCoins) shopCoins.textContent = game.coins;
        
        // إظهار إشعار
        showNotification(`تم شراء ${character.name} بنجاح!`);
    }
}

// اختيار شخصية
function selectCharacter(characterKey) {
    selectedCharacter = characterKey;
    localStorage.setItem('selectedCharacter', characterKey);
    
    // تحديث واجهة اللاعب
    updatePlayerFromCharacter();
    
    // تحديث واجهة المتجر
    updateCharacters();
    
    // إظهار إشعار
    showNotification(`تم اختيار ${characters[characterKey].name}!`);
}

// تحديث اللاعب بناءً على الشخصية المحددة
function updatePlayerFromCharacter() {
    const character = characters[selectedCharacter];
    
    // تحديث خصائص اللاعب الأساسية
    player.maxHealth = permanentUpgrades.maxHealth + character.stats.healthBonus;
    player.health = player.maxHealth;
    player.damage = permanentUpgrades.damage + character.stats.damageBonus;
    player.speed = permanentUpgrades.speed + character.stats.speedBonus;
    player.color = character.color;
    
    // تحديث أيقونة اللاعب
    player.icon = character.icon;
    
    // تحديث واجهة اللعبة
    updateUI();
}

// إظهار إشعارات
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.position = 'absolute';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.background = 'rgba(0, 0, 0, 0.8)';
    notification.style.color = '#ffd700';
    notification.style.padding = '15px 30px';
    notification.style.borderRadius = '10px';
    notification.style.border = '2px solid #ffd700';
    notification.style.fontSize = '18px';
    notification.style.fontWeight = 'bold';
    notification.style.zIndex = '1000';
    notification.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.5)';
    notification.textContent = message;
    
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
        gameContainer.appendChild(notification);
    }
    
    // إزالة الإشعار بعد 3 ثواني
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// تحديث عناصر المتجر
function updateShopItems() {
    const shopContainer = document.getElementById('shopItems');
    if (!shopContainer) return;
    
    shopContainer.innerHTML = '';
    
    shopItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'shop-item';
        
        // عرض الأيقونة والاسم والتكلفة والتأثير
        div.innerHTML = `
            <div class="shop-item-icon">${item.icon}</div>
            <div class="shop-item-name">${item.name}</div>
            <div class="shop-item-effect">${item.effect}</div>
            <div class="shop-item-cost">التكلفة: ${item.cost} عملة</div>
        `;
        
        // التحقق من الشراء
        if (!item.purchased && game.coins >= item.cost) {
            div.style.cursor = 'pointer';
            div.addEventListener('click', () => buyUpgrade(item));
        } else if (item.purchased) {
            div.style.opacity = '0.7';
            div.innerHTML += '<div style="color: #00ff00; margin-top: 5px;">تم الشراء</div>';
        } else {
            div.style.opacity = '0.5';
            div.innerHTML += '<div style="color: #ff0000; margin-top: 5px;">عملات غير كافية</div>';
        }
        
        shopContainer.appendChild(div);
    });
}

// شراء ترقية
function buyUpgrade(item) {
    if (!item.purchased && game.coins >= item.cost) {
        game.coins -= item.cost;
        item.purchased = true;
        item.level = 1;
        
        // حفظ حالة الشراء
        localStorage.setItem(item.key + '_level', '1');
        localStorage.setItem('coins', game.coins.toString());
        
        // تطبيق تأثير الترقية
        applyUpgrade(item);
        
        // تحديث المتجر
        updateShopItems();
        
        // إظهار إشعار
        showNotification(`تم شراء ${item.name} بنجاح!`);
    }
}

// دالة تطبيق تأثيرات الترقيات
function applyUpgrade(item) {
    switch(item.key) {
        case 'shield':
            player.shield = 5; // 5% حماية
            break;
        case 'damage':
            player.damage += 5; // +5 ضرر
            break;
        case 'healing':
            player.maxHealth += 50; // +50 صحة قصوى
            player.health += 50; // شفاء فوري
            break;
        case 'speed':
            player.speed += 1; // +1 سرعة
            break;
        case 'revive':
            // سيتم تطبيق هذا عند موت اللاعب
            break;
    }
}

// إغلاق المتجر
function closeShop() {
    const shopMenu = document.getElementById('shopMenu');
    const mainMenu = document.getElementById('mainMenu');
    if (shopMenu) shopMenu.style.display = 'none';
    if (mainMenu) mainMenu.style.display = 'flex';
    game.state = 'menu';
}

// فتح قائمة تحسين الأسلحة
function openWeaponUpgrade() {
    const shopMenu = document.getElementById('shopMenu');
    const weaponUpgradeMenu = document.getElementById('weaponUpgradeMenu');
    if (shopMenu) shopMenu.style.display = 'none';
    if (weaponUpgradeMenu) {
        weaponUpgradeMenu.style.display = 'block';
        const weaponUpgradeCoins = document.getElementById('weaponUpgradeCoins');
        if (weaponUpgradeCoins) weaponUpgradeCoins.textContent = game.coins;
    }
    
    const container = document.getElementById('weaponUpgradeItems');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(weaponUpgrades).forEach(weaponKey => {
        const weapon = weaponUpgrades[weaponKey];
        const div = document.createElement('div');
        div.className = 'weapon-upgrade-item';
        
        if (weapon.currentLevel < weapon.levels.length) {
            const currentLevel = weapon.levels[weapon.currentLevel];
            const nextLevel = weapon.levels[weapon.currentLevel + 1];
            
            div.innerHTML = `
                <div class="weapon-upgrade-item-name">${weapon.name}</div>
                <div class="weapon-upgrade-item-level">المستوى الحالي: ${currentLevel.name}</div>
                <div class="weapon-upgrade-item-cost">التكلفة: ${nextLevel.cost} عملة</div>
                <div style="font-size: 14px; color: #aaa; margin-top: 5px;">المستوى التالي: ${nextLevel.name}</div>
            `;
            
            if (game.coins >= nextLevel.cost) {
                div.style.cursor = 'pointer';
                div.addEventListener('click', () => upgradeWeapon(weaponKey));
            } else {
                div.style.opacity = '0.5';
                div.innerHTML += '<div style="color: #ff0000; margin-top: 5px;">عملات غير كافية</div>';
            }
        } else {
            div.innerHTML = `
                <div class="weapon-upgrade-item-name">${weapon.name}</div>
                <div class="weapon-upgrade-item-level">المستوى الأقصى: ${weapon.levels[weapon.levels.length - 1].name}</div>
            `;
            div.style.opacity = '0.5';
        }
        
        container.appendChild(div);
    });
}

// تحسين السلاح
function upgradeWeapon(weaponKey) {
    const weapon = weaponUpgrades[weaponKey];
    
    if (weapon.currentLevel < weapon.levels.length - 1) {
        const nextLevel = weapon.levels[weapon.currentLevel + 1];
        
        if (game.coins >= nextLevel.cost) {
            game.coins -= nextLevel.cost;
            weapon.currentLevel++;
            
            localStorage.setItem(weaponKey + '_level', weapon.currentLevel.toString());
            localStorage.setItem('coins', game.coins.toString());
            
            openWeaponUpgrade(); // تحديث القائمة
        }
    }
}

// إغلاق قائمة تحسين الأسلحة
function closeWeaponUpgrade() {
    const weaponUpgradeMenu = document.getElementById('weaponUpgradeMenu');
    const shopMenu = document.getElementById('shopMenu');
    if (weaponUpgradeMenu) weaponUpgradeMenu.style.display = 'none';
    if (shopMenu) shopMenu.style.display = 'block';
}

// فتح قائمة الإنجازات
function openAchievements() {
    game.state = 'achievements';
    const mainMenu = document.getElementById('mainMenu');
    const achievementsMenu = document.getElementById('achievementsMenu');
    if (mainMenu) mainMenu.style.display = 'none';
    if (achievementsMenu) achievementsMenu.style.display = 'block';
    
    const container = document.getElementById('achievementsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(achievements).forEach(key => {
        const achievement = achievements[key];
        const div = document.createElement('div');
        div.className = `achievement ${achievement.unlocked ? 'unlocked' : ''}`;
        
        let progressHtml = '';
        if (achievement.progress !== undefined) {
            progressHtml = `<div class="achievement-progress">${achievement.progress}/${achievement.maxProgress}</div>`;
        }
        
        div.innerHTML = `
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
            ${progressHtml}
        `;
        
        container.appendChild(div);
    });
}

// إغلاق قائمة الإنجازات
function closeAchievements() {
    const achievementsMenu = document.getElementById('achievementsMenu');
    const mainMenu = document.getElementById('mainMenu');
    if (achievementsMenu) achievementsMenu.style.display = 'none';
    if (mainMenu) mainMenu.style.display = 'flex';
    game.state = 'menu';
}

// تحديث الإنجازات
function updateAchievements(type, value = 1) {
    switch(type) {
        case 'enemyKilled':
            // أول دم
            if (!achievements.firstBlood.unlocked) {
                achievements.firstBlood.unlocked = true;
                localStorage.setItem('achievement_firstBlood', 'true');
                showAchievementNotification(achievements.firstBlood);
            }
            
            // صياد
            achievements.hunter.progress += value;
            localStorage.setItem('achievement_hunter', achievements.hunter.progress.toString());
            
            if (achievements.hunter.progress >= achievements.hunter.maxProgress && !achievements.hunter.unlocked) {
                achievements.hunter.unlocked = true;
                showAchievementNotification(achievements.hunter);
            }
            break;
            
        case 'bossKilled':
            achievements.bossSlayer.progress += value;
            localStorage.setItem('achievement_bossSlayer', achievements.bossSlayer.progress.toString());
            
            if (achievements.bossSlayer.progress >= achievements.bossSlayer.maxProgress && !achievements.bossSlayer.unlocked) {
                achievements.bossSlayer.unlocked = true;
                showAchievementNotification(achievements.bossSlayer);
            }
            break;
            
        case 'coinsCollected':
            achievements.millionaire.progress += value;
            localStorage.setItem('achievement_millionaire', achievements.millionaire.progress.toString());
            
            if (achievements.millionaire.progress >= achievements.millionaire.maxProgress && !achievements.millionaire.unlocked) {
                achievements.millionaire.unlocked = true;
                showAchievementNotification(achievements.millionaire);
            }
            break;
            
        case 'gameOver':
            // ناجي
            if (game.time >= 60 && !achievements.survivor.unlocked) {
                achievements.survivor.unlocked = true;
                localStorage.setItem('achievement_survivor', 'true');
                showAchievementNotification(achievements.survivor);
            }
            break;
    }
}

// إظهار إشعار الإنجاز
function showAchievementNotification(achievement) {
    // إنشاء عنصر الإشعار
    const notification = document.createElement('div');
    notification.style.position = 'absolute';
    notification.style.top = '20px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.background = 'rgba(0, 0, 0, 0.8)';
    notification.style.color = '#ffd700';
    notification.style.padding = '15px 30px';
    notification.style.borderRadius = '10px';
    notification.style.border = '2px solid #ffd700';
    notification.style.fontSize = '18px';
    notification.style.fontWeight = 'bold';
    notification.style.zIndex = '100';
    notification.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.5)';
    notification.textContent = `إنجاز جديد: ${achievement.name}!`;
    
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
        gameContainer.appendChild(notification);
    }
    
    // إزالة الإشعار بعد 3 ثواني
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// وظائف الرسم
function drawPlayer(playerObj) {
    ctx.save();
    
    // درع
    if (playerObj.shield > 0) {
        ctx.beginPath();
        ctx.arc(playerObj.x, playerObj.y, playerObj.radius + 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    // جسم اللاعب (شكل بيضاوي)
    ctx.beginPath();
    ctx.ellipse(playerObj.x, playerObj.y, playerObj.radius, playerObj.radius * 1.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = playerObj.color || (playerObj === player ? weaponTypes[playerObj.weapon].color : '#FF69B4');
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // رسم أيقونة الشخصية
    if (playerObj.icon) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(playerObj.icon, playerObj.x, playerObj.y);
    }
    
    // رسم الوجه
    // العيون
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(playerObj.x - 8, playerObj.y - 5, 5, 0, Math.PI * 2);
    ctx.arc(playerObj.x + 8, playerObj.y - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // بؤبؤ العيون
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(playerObj.x - 8, playerObj.y - 5, 2, 0, Math.PI * 2);
    ctx.arc(playerObj.x + 8, playerObj.y - 5, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // الفم المبتسم
    ctx.beginPath();
    ctx.arc(playerObj.x, playerObj.y + 5, 8, 0, Math.PI);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // السلاح
    if (playerObj.weapon === 'sword') {
        ctx.save();
        ctx.translate(playerObj.x, playerObj.y);
        let angle;
        
        if (playerObj === player) {
            angle = Math.atan2(mouseY - playerObj.y, mouseX - playerObj.x);
        } else {
            if (playerObj.moveUp || playerObj.moveDown || playerObj.moveLeft || playerObj.moveRight) {
                let moveX = 0;
                let moveY = 0;
                
                if (playerObj.moveUp) moveY -= 1;
                if (playerObj.moveDown) moveY += 1;
                if (playerObj.moveLeft) moveX -= 1;
                if (playerObj.moveRight) moveX += 1;
                
                angle = Math.atan2(moveY, moveX);
            } else {
                angle = 0;
            }
        }
        
        ctx.rotate(angle);
        // مقبض السيف
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(15, -3, 25, 6);
        // نصل السيف
        ctx.fillStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.moveTo(40, 0);
        ctx.lineTo(60, -8);
        ctx.lineTo(65, 0);
        ctx.lineTo(60, 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    } else if (playerObj.weapon === 'staff') {
        ctx.save();
        ctx.translate(playerObj.x, playerObj.y);
        let angle;
        
        if (playerObj === player) {
            angle = Math.atan2(mouseY - playerObj.y, mouseX - playerObj.x);
        } else {
            if (playerObj.moveUp || playerObj.moveDown || playerObj.moveLeft || playerObj.moveRight) {
                let moveX = 0;
                let moveY = 0;
                
                if (playerObj.moveUp) moveY -= 1;
                if (playerObj.moveDown) moveY += 1;
                if (playerObj.moveLeft) moveX -= 1;
                if (playerObj.moveRight) moveX += 1;
                
                angle = Math.atan2(moveY, moveX);
            } else {
                angle = 0;
            }
        }
        
        ctx.rotate(angle);
        // العصا
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(15, -3, 30, 6);
        // الكرة السحرية
        const gradient = ctx.createRadialGradient(45, 0, 0, 45, 0, 10);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(1, '#FF4500');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(45, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    } else if (playerObj.weapon === 'bow') {
        ctx.save();
        ctx.translate(playerObj.x, playerObj.y);
        let angle;
        
        if (playerObj === player) {
            angle = Math.atan2(mouseY - playerObj.y, mouseX - playerObj.x);
        } else {
            if (playerObj.moveUp || playerObj.moveDown || playerObj.moveLeft || playerObj.moveRight) {
                let moveX = 0;
                let moveY = 0;
                
                if (playerObj.moveUp) moveY -= 1;
                if (playerObj.moveDown) moveY += 1;
                if (playerObj.moveLeft) moveX -= 1;
                if (playerObj.moveRight) moveX += 1;
                
                angle = Math.atan2(moveY, moveX);
            } else {
                angle = 0;
            }
        }
        
        ctx.rotate(angle);
        // القوس
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(20, 0, 20, -Math.PI/3, Math.PI/3);
        ctx.stroke();
        // الوتر
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(20 + 20 * Math.cos(-Math.PI/3), 0 + 20 * Math.sin(-Math.PI/3));
        ctx.lineTo(20 + 20 * Math.cos(Math.PI/3), 0 + 20 * Math.sin(Math.PI/3));
        ctx.stroke();
        // السهم
        ctx.fillStyle = '#654321';
        ctx.beginPath();
        ctx.moveTo(40, -3);
        ctx.lineTo(50, 0);
        ctx.lineTo(40, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    ctx.restore();
}

function drawEnemies() {
    enemies.forEach(enemy => {
        ctx.save();
        
        // جسم العدو (شكل بيضاوي)
        ctx.beginPath();
        ctx.ellipse(enemy.x, enemy.y, enemy.radius, enemy.radius * 1.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = enemy.color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // رسم الوجه الغاضب
        // الحواجب الغاضبة
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(enemy.x - 12, enemy.y - 12);
        ctx.lineTo(enemy.x - 4, enemy.y - 8);
        ctx.moveTo(enemy.x + 12, enemy.y - 12);
        ctx.lineTo(enemy.x + 4, enemy.y - 8);
        ctx.stroke();
        
        // العيون
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(enemy.x - 8, enemy.y - 5, 5, 0, Math.PI * 2);
        ctx.arc(enemy.x + 8, enemy.y - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // بؤبؤ العيون
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(enemy.x - 8, enemy.y - 5, 2, 0, Math.PI * 2);
        ctx.arc(enemy.x + 8, enemy.y - 5, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // الفم الغاضب
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y + 8, 8, Math.PI, 0, true);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // أنياب صغيرة
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(enemy.x - 5, enemy.y + 8);
        ctx.lineTo(enemy.x - 3, enemy.y + 12);
        ctx.lineTo(enemy.x - 1, enemy.y + 8);
        ctx.moveTo(enemy.x + 5, enemy.y + 8);
        ctx.lineTo(enemy.x + 3, enemy.y + 12);
        ctx.lineTo(enemy.x + 1, enemy.y + 8);
        ctx.fill();
        
        // شريط الصحة
        if (enemy.health < enemy.maxHealth) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 15, enemy.radius * 2, 6);
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 15, (enemy.health / enemy.maxHealth) * enemy.radius * 2, 6);
        }
        
        ctx.restore();
    });
}

function drawBoss() {
    if (!game.boss) return;
    
    const boss = game.boss;
    ctx.save();
    
    // جسم الزعيم (شكل بيضاوي كبير)
    ctx.beginPath();
    ctx.ellipse(boss.x, boss.y, boss.radius, boss.radius * 1.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = boss.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // رسم الوجه الشرير
    // العيون الحمراء الكبيرة
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(boss.x - 18, boss.y - 15, 10, 0, Math.PI * 2);
    ctx.arc(boss.x + 18, boss.y - 15, 10, 0, Math.PI * 2);
    ctx.fill();
    
    // بؤبؤ العيون
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(boss.x - 18, boss.y - 15, 5, 0, Math.PI * 2);
    ctx.arc(boss.x + 18, boss.y - 15, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // الحواجب الشريرة
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(boss.x - 30, boss.y - 25);
    ctx.lineTo(boss.x - 10, boss.y - 18);
    ctx.moveTo(boss.x + 30, boss.y - 25);
    ctx.lineTo(boss.x + 10, boss.y - 18);
    ctx.stroke();
    
    // الفم الشرير
    ctx.beginPath();
    ctx.moveTo(boss.x - 25, boss.y + 15);
    ctx.lineTo(boss.x, boss.y + 30);
    ctx.lineTo(boss.x + 25, boss.y + 15);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    // أنياب الزعيم الكبيرة
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(boss.x - 15, boss.y + 15);
    ctx.lineTo(boss.x - 8, boss.y + 35);
    ctx.lineTo(boss.x - 1, boss.y + 15);
    ctx.moveTo(boss.x + 15, boss.y + 15);
    ctx.lineTo(boss.x + 8, boss.y + 35);
    ctx.lineTo(boss.x + 1, boss.y + 15);
    ctx.fill();
    
    // قرون الزعيم
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(boss.x - 25, boss.y - 35);
    ctx.lineTo(boss.x - 20, boss.y - 50);
    ctx.lineTo(boss.x - 15, boss.y - 35);
    ctx.moveTo(boss.x + 25, boss.y - 35);
    ctx.lineTo(boss.x + 20, boss.y - 50);
    ctx.lineTo(boss.x + 15, boss.y - 35);
    ctx.fill();
    
    // شريط الصحة
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(boss.x - 80, boss.y - boss.radius - 30, 160, 15);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(boss.x - 80, boss.y - boss.radius - 30, (boss.health / boss.maxHealth) * 160, 15);
    
    // نص اسم الزعيم
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(boss.name, boss.x, boss.y - boss.radius - 35);
    
    ctx.restore();
}

function drawProjectiles() {
    projectiles.forEach(proj => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fillStyle = proj.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    });
}

function drawLoot() {
    loot.forEach(item => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // رمز
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.type === 'exp' ? 'XP' : '$', item.x, item.y);
        ctx.restore();
    });
}

function drawParticles() {
    particles.forEach(particle => {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
        ctx.restore();
    });
}

// تحديد السلاح الافتراضي
document.addEventListener('DOMContentLoaded', function() {
    const defaultWeapon = document.querySelector('.weapon-option[data-weapon="sword"]');
    if (defaultWeapon) {
        defaultWeapon.classList.add('selected');
    }
    
    // تحميل الشخصيات المملوكة
    Object.keys(characters).forEach(charKey => {
        const owned = localStorage.getItem(`character_${charKey}_owned`);
        if (owned === 'true') {
            characters[charKey].owned = true;
        }
    });
    
    // تحديث اللاعب بناءً على الشخصية المحددة
    updatePlayerFromCharacter();
    
    // تأثيرات تفاعلية للأزرار
    const buttons = document.querySelectorAll('.menu-button, .weapon-option, .difficulty-option, .upgrade-option, .shop-item, .weapon-upgrade-item, .skill-button, .back-button, .menu-icon, .settings-button');
    
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            // إنشاء عنصر الموجة
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            
            // تحديد موقع النقر
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            // تطبيق الأنماط
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            // إضافة الموجة إلى الزر
            this.appendChild(ripple);
            
            // إزالة الموجة بعد انتهاء التأثير
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
    
    // إضافة زر إغلاق للوحة القدرات
    addCloseButton();
    
    // تحميل اللعبة المحفوظة
    loadGame();
    
    // التعامل مع القائمة المنسدلة لاختيار المستوى
    const difficultyButton = document.getElementById('difficultyButton');
    const difficultyDropdown = document.getElementById('difficultyDropdown');
    
    if (difficultyButton) {
        difficultyButton.addEventListener('click', function(e) {
            e.stopPropagation();
            difficultyDropdown.classList.toggle('show');
        });
    }
    
    // إغلاق القائمة المنسدلة عند النقر في أي مكان آخر
    document.addEventListener('click', function() {
        if (difficultyDropdown) {
            difficultyDropdown.classList.remove('show');
        }
    });
    
    // التعامل مع اختيار المستوى
    document.querySelectorAll('.difficulty-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // إزالة الفئة المحددة من جميع الخيارات
            document.querySelectorAll('.difficulty-option').forEach(o => o.classList.remove('selected'));
            
            // إضافة الفئة المحددة للخيار الحالي
            this.classList.add('selected');
            
            // تحديث صعوبة اللعبة
            game.currentDifficulty = this.dataset.difficulty;
            
            // إغلاق القائمة المنسدلة
            if (difficultyDropdown) {
                difficultyDropdown.classList.remove('show');
            }
        });
    });
    
    // التعامل مع زر الإعدادات
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.addEventListener('click', function() {
            showSettingsMenu();
        });
    }
    
    // التعامل مع زر بدء اللعبة
    const startGameButton = document.getElementById('startGame');
    if (startGameButton) {
        startGameButton.addEventListener('click', function() {
            // إظهار اختيار السلاح
            const weaponSelect = document.getElementById('weaponSelect');
            if (weaponSelect) {
                weaponSelect.style.display = 'block';
            }
            
            // إخفاء زر بدء اللعبة مؤقتًا
            this.style.display = 'none';
        });
    }
    
    // التعامل مع اختيار السلاح
    document.querySelectorAll('.weapon-option').forEach(option => {
        option.addEventListener('click', function() {
            // إزالة الفئة المحددة من جميع الخيارات
            document.querySelectorAll('.weapon-option').forEach(o => o.classList.remove('selected'));
            
            // إضافة الفئة المحددة للخيار الحالي
            this.classList.add('selected');
            
            // تحديث سلاح اللعبة
            game.selectedWeapon = this.dataset.weapon;
            
            // بدء اللعبة بعد اختيار السلاح
            startGame();
        });
    });
    
    // أزرار القائمة القديمة (للحفاظ على التوافق)
    const shopButton = document.getElementById('shopButton');
    if (shopButton) {
        shopButton.addEventListener('click', openShop);
    }
    
    const achievementsButton = document.getElementById('achievementsButton');
    if (achievementsButton) {
        achievementsButton.addEventListener('click', openAchievements);
    }
    
    const weaponUpgradeButton = document.getElementById('weaponUpgradeButton');
    if (weaponUpgradeButton) {
        weaponUpgradeButton.addEventListener('click', openWeaponUpgrade);
    }
    
    const restartButton = document.getElementById('restartButton');
    if (restartButton) {
        restartButton.addEventListener('click', () => {
            const gameOver = document.getElementById('gameOver');
            if (gameOver) gameOver.style.display = 'none';
            startGame();
        });
    }
    
    const mainMenuButton = document.getElementById('mainMenuButton');
    if (mainMenuButton) {
        mainMenuButton.addEventListener('click', () => {
            const gameOver = document.getElementById('gameOver');
            if (gameOver) gameOver.style.display = 'none';
            const mainMenu = document.getElementById('mainMenu');
            if (mainMenu) mainMenu.style.display = 'flex';
            game.state = 'menu';
        });
    }
    
    const backFromShop = document.getElementById('backFromShop');
    if (backFromShop) {
        backFromShop.addEventListener('click', closeShop);
    }
    
    const backFromWeaponUpgrade = document.getElementById('backFromWeaponUpgrade');
    if (backFromWeaponUpgrade) {
        backFromWeaponUpgrade.addEventListener('click', closeWeaponUpgrade);
    }
    
    const backFromAchievements = document.getElementById('backFromAchievements');
    if (backFromAchievements) {
        backFromAchievements.addEventListener('click', closeAchievements);
    }
    
    const coopButton = document.getElementById('coopButton');
    if (coopButton) {
        coopButton.addEventListener('click', toggleCoopMode);
    }
});

// نظام حفظ محسن
function saveGame() {
    const gameData = {
        coins: game.coins,
        permanentUpgrades: permanentUpgrades,
        weaponUpgrades: {
            sword: weaponUpgrades.sword.currentLevel,
            staff: weaponUpgrades.staff.currentLevel,
            bow: weaponUpgrades.bow.currentLevel
        },
        achievements: {},
        characters: {},
        selectedCharacter: selectedCharacter
    };
    
    // حفظ الإنجازات
    Object.keys(achievements).forEach(key => {
        gameData.achievements[key] = {
            unlocked: achievements[key].unlocked,
            progress: achievements[key].progress
        };
    });
    
    // حفظ الشخصيات المملوكة
    Object.keys(characters).forEach(charKey => {
        gameData.characters[charKey] = characters[charKey].owned;
    });
    
    localStorage.setItem('monsterSurvivorsSave', JSON.stringify(gameData));
}

// تحميل اللعبة المحفوظة
function loadGame() {
    const savedData = localStorage.getItem('monsterSurvivorsSave');
    if (savedData) {
        const gameData = JSON.parse(savedData);
        
        // استعادة العملات
        game.coins = gameData.coins || 0;
        
        // استعادة الترقيات الدائمة
        if (gameData.permanentUpgrades) {
            Object.keys(gameData.permanentUpgrades).forEach(key => {
                permanentUpgrades[key] = gameData.permanentUpgrades[key];
            });
        }
        
        // استعادة مستويات الأسلحة
        if (gameData.weaponUpgrades) {
            Object.keys(gameData.weaponUpgrades).forEach(weapon => {
                if (weaponUpgrades[weapon]) {
                    weaponUpgrades[weapon].currentLevel = gameData.weaponUpgrades[weapon];
                }
            });
        }
        
        // استعادة الإنجازات
        if (gameData.achievements) {
            Object.keys(gameData.achievements).forEach(key => {
                if (achievements[key]) {
                    achievements[key].unlocked = gameData.achievements[key].unlocked;
                    if (gameData.achievements[key].progress !== undefined) {
                        achievements[key].progress = gameData.achievements[key].progress;
                    }
                }
            });
        }
        
        // استعادة الشخصيات المملوكة
        if (gameData.characters) {
            Object.keys(gameData.characters).forEach(charKey => {
                if (characters[charKey]) {
                    characters[charKey].owned = gameData.characters[charKey];
                }
            });
        }
        
        // استعادة الشخصية المحددة
        if (gameData.selectedCharacter) {
            selectedCharacter = gameData.selectedCharacter;
        }
        
        // تطبيق الترقيات المشتراة
        shopItems.forEach(item => {
            if (localStorage.getItem(item.key + '_level') === '1') {
                item.purchased = true;
                item.level = 1;
                applyUpgrade(item);
            }
        });
        
        // تحديث واجهة المستخدم
        updateUI();
    } else {
        // تحميل الشخصيات المملوكة بشكل فردي
        Object.keys(characters).forEach(charKey => {
            const owned = localStorage.getItem(`character_${charKey}_owned`);
            if (owned === 'true') {
                characters[charKey].owned = true;
            }
        });
        
        // تطبيق الترقيات المشتراة
        shopItems.forEach(item => {
            if (localStorage.getItem(item.key + '_level') === '1') {
                item.purchased = true;
                item.level = 1;
                applyUpgrade(item);
            }
        });
    }
}

// تحديث لوحة القدرات عند تغيير المهارات
function updateSkills() {
    if (inventory.classList.contains('show')) {
        updateInventoryDisplay();
    }
}

// التحكم بزر Tab مع الأنيميشن
const inventory = document.getElementById("inventory");
document.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
        e.preventDefault();
        if (inventory) {
            inventory.classList.toggle("show");
            updateInventoryDisplay(); // تحديث محتويات اللوحة عند فتحها
        }
    }
});

// تحديث محتويات لوحة القدرات
function updateInventoryDisplay() {
    const inventoryList = document.getElementById("inventory-list");
    if (!inventoryList) return;
    
    inventoryList.innerHTML = '';
    
    // عرض مهارات اللاعب الأساسية
    const basicSkills = document.createElement('div');
    basicSkills.className = 'ability-section';
    basicSkills.innerHTML = '<div class="ability-title">المهارات الأساسية</div>';
    
    // إضافة السلاح
    const weaponItem = document.createElement('div');
    weaponItem.className = 'inv-item';
    weaponItem.innerHTML = `
        <div style="width: 28px; height: 28px; background: ${weaponTypes[player.weapon].color}; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
            ${getWeaponIcon(player.weapon)}
        </div>
        <span>${weaponTypes[player.weapon].name}</span>
    `;
    basicSkills.appendChild(weaponItem);
    
    // إضافة الضرر
    const damageItem = document.createElement('div');
    damageItem.className = 'inv-item';
    damageItem.innerHTML = `
        <div style="width: 28px; height: 28px; background: #ff3333; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
            ⚔️
        </div>
        <span>الضرر: ${Math.round(player.damage)}</span>
    `;
    basicSkills.appendChild(damageItem);
    
    // إضافة السرعة
    const speedItem = document.createElement('div');
    speedItem.className = 'inv-item';
    speedItem.innerHTML = `
        <div style="width: 28px; height: 28px; background: #33ccff; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
            💨
        </div>
        <span>السرعة: ${player.speed.toFixed(1)}</span>
    `;
    basicSkills.appendChild(speedItem);
    
    inventoryList.appendChild(basicSkills);
    
    // عرض المهارات الخاصة
    const specialSkills = document.createElement('div');
    specialSkills.className = 'ability-section';
    specialSkills.innerHTML = '<div class="ability-title">المهارات الخاصة</div>';
    
    // مهارة الانفجارية
    const dashItem = document.createElement('div');
    dashItem.className = 'inv-item';
    const dashCooldown = playerSpecialSkills.dash.cooldown > 0 ? 
        `<span class="cooldown">${Math.ceil(playerSpecialSkills.dash.cooldown)}s</span>` : '';
    dashItem.innerHTML = `
        <div style="width: 28px; height: 28px; background: #cc00ff; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
            ⚡
        </div>
        <span>انفجارية</span>
        ${dashCooldown}
    `;
    specialSkills.appendChild(dashItem);
    
    // مهارة موجة الصدمة
    const shockwaveItem = document.createElement('div');
    shockwaveItem.className = 'inv-item';
    const shockwaveCooldown = playerSpecialSkills.shockwave.cooldown > 0 ? 
        `<span class="cooldown">${Math.ceil(playerSpecialSkills.shockwave.cooldown)}s</span>` : '';
    shockwaveItem.innerHTML = `
        <div style="width: 28px; height: 28px; background: #00ccff; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
            💥
        </div>
        <span>موجة صدمية</span>
        ${shockwaveCooldown}
    `;
    specialSkills.appendChild(shockwaveItem);
    
    inventoryList.appendChild(specialSkills);
    
    // عرض المهارات المكتسبة
    const acquiredSkills = document.createElement('div');
    acquiredSkills.className = 'ability-section';
    acquiredSkills.innerHTML = '<div class="ability-title">المهارات المكتسبة</div>';
    
    // إضافة المهارات المكتسبة
    upgradeOptions.forEach(skill => {
        if (player.skills[skill.skill] > 0) {
            const skillItem = document.createElement('div');
            skillItem.className = 'inv-item';
            skillItem.innerHTML = `
                <div style="width: 28px; height: 28px; background: #ff9900; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
                    ${skill.icon}
                </div>
                <span>${skill.name} (مستوى ${player.skills[skill.skill]})</span>
            `;
            acquiredSkills.appendChild(skillItem);
        }
    });
    
    inventoryList.appendChild(acquiredSkills);
}

// الحصول على أيقونة السلاح
function getWeaponIcon(weapon) {
    switch(weapon) {
        case 'sword': return '⚔️';
        case 'staff': return '🔮';
        case 'bow': return '🏹';
        default: return '⚔️';
    }
}

// إضافة زر إغلاق للوحة القدرات
function addCloseButton() {
    if (!inventory) return;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '✕';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '5px';
    closeButton.style.left = '5px';
    closeButton.style.background = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '16px';
    closeButton.style.cursor = 'pointer';
    closeButton.addEventListener('click', () => {
        inventory.classList.remove('show');
    });
    inventory.appendChild(closeButton);
}

// دالة لعرض قائمة الإعدادات
function showSettingsMenu() {
    // إنشاء قائمة الإعدادات
    const settingsMenu = document.createElement('div');
    settingsMenu.id = 'settingsMenu';
    settingsMenu.className = 'settings-menu';
    settingsMenu.innerHTML = `
        <h2 class="settings-title">الإعدادات</h2>
        <div class="settings-content">
            <div class="setting-item">
                <label for="soundToggle">الصوت</label>
                <div class="toggle-switch">
                    <input type="checkbox" id="soundToggle" checked>
                    <span class="toggle-slider"></span>
                </div>
            </div>
            <div class="setting-item">
                <label for="musicToggle">الموسيقى</label>
                <div class="toggle-switch">
                    <input type="checkbox" id="musicToggle" checked>
                    <span class="toggle-slider"></span>
                </div>
            </div>
            <div class="setting-item">
                <label for="qualitySelect">جودة الرسوميات</label>
                <select id="qualitySelect">
                    <option value="low">منخفضة</option>
                    <option value="medium" selected>متوسطة</option>
                    <option value="high">عالية</option>
                </select>
            </div>
        </div>
        <button class="menu-button back-button" id="closeSettings">إغلاق</button>
    `;
    
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
        gameContainer.appendChild(settingsMenu);
    }
    
    // التعامل مع زر الإغلاق
    const closeSettings = document.getElementById('closeSettings');
    if (closeSettings) {
        closeSettings.addEventListener('click', function() {
            settingsMenu.remove();
        });
    }
    
    // التعامل مع مفاتيح التبديل
    document.querySelectorAll('.toggle-switch input').forEach(toggle => {
        toggle.addEventListener('change', function() {
            // حفظ إعدادات الصوت والموسيقى
            localStorage.setItem(this.id, this.checked);
        });
    });
    
    // التعامل مع اختيار الجودة
    const qualitySelect = document.getElementById('qualitySelect');
    if (qualitySelect) {
        qualitySelect.addEventListener('change', function() {
            // حفظ إعداد الجودة
            localStorage.setItem('graphicsQuality', this.value);
        });
    }
    
    // تحميل الإعدادات المحفوظة
    const soundSetting = localStorage.getItem('soundToggle');
    const musicSetting = localStorage.getItem('musicToggle');
    const qualitySetting = localStorage.getItem('graphicsQuality');
    
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle && soundSetting !== null) {
        soundToggle.checked = soundSetting === 'true';
    }
    
    const musicToggle = document.getElementById('musicToggle');
    if (musicToggle && musicSetting !== null) {
        musicToggle.checked = musicSetting === 'true';
    }
    
    if (qualitySelect && qualitySetting !== null) {
        qualitySelect.value = qualitySetting;
    }
}
// زر ملء الشاشة
document.getElementById('fullscreenBtn').addEventListener('click', () => {
    toggleFullscreen();
    resizeCanvas();
});

function resizeCanvas() {
    if (game.isFullscreen) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    } else {
        canvas.width = 1000;
        canvas.height = 700;
    }
}
