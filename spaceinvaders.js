let app = new PIXI.Application(1366, 768, {backgroundColor : 0x00});
PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
document.body.appendChild(app.view);
let shaderCode = document.getElementById("shader").innerHTML
let shader = new PIXI.AbstractFilter('',shaderCode);

let state = "NEWGAME" //NEWGAME, INGAME, ENDGAME
let enemyState = "LEFT";
let sprites = {};
let score = 0;

let movementHelperLeft = null;
let movementHelperRight = null;

let scoreText = null;

let playerEntity = null;
let playerController = 0b00000000; //0 - Down 1 - Right 2 - Up 3 - Left 7 - Shoot
let playerShootingTimeout = 60;
let enemyEntities = [];
let bulletEntities = [];
let explosionEntities = [];
let powerupEntities = [];

let ticker = new PIXI.ticker.Ticker();

const INPUT_LEFT_MASK = 0b00001000;
const INPUT_UP_MASK = 0b00000100;
const INPUT_RIGHT_MASK = 0b00000010;
const INPUT_DOWN_MASK = 0b00000001;

const INPUT_SHOOT_MASK = 0b10000000;

const KEY_LEFT = 37;
const KEY_UP = 38;
const KEY_RIGHT = 39;
const KEY_DOWN = 40;

const KEY_A = 65;
const KEY_S = 83;
const KEY_D = 68;
const KEY_W = 87;

const KEY_SPACE = 32;
const KEY_X = 88
const KEY_SHIFT = 16;
const KEY_CTRL = 17;

const KEY_ENTER = 13;

let ENEMY_SHOOTING_PROB;
let POWERUP_CHANCE =      0.0012;

PIXI.loader
    .add('assets/spritesheet.png')
    .add('assets/heart.png')
    .add('assets/background.jpg')
    .add('assets/shield.png')
    .load(processSprites);

window.onkeydown = function (e) {
    var key = e.keyCode ? e.keyCode : e.which;
    processKey(key);
}

window.onkeyup = function (e){
    var key = e.keyCode ? e.keyCode : e.which;
    processKey(-key);
}

function processKey(key){
    modKey = Math.abs(key);
    if(modKey == KEY_A || modKey == KEY_LEFT){
        (key > 0) ? playerController |= INPUT_LEFT_MASK : playerController &= 255-INPUT_LEFT_MASK;
    }else if(modKey == KEY_W || modKey == KEY_UP){
        (key > 0) ? playerController |= INPUT_UP_MASK : playerController &= 255-INPUT_UP_MASK;
    }else if(modKey == KEY_D || modKey == KEY_RIGHT){
        (key > 0) ? playerController |= INPUT_RIGHT_MASK : playerController &= 255-INPUT_RIGHT_MASK;
    }else if(modKey == KEY_S || modKey == KEY_DOWN){
        (key > 0) ? playerController |= INPUT_DOWN_MASK : playerController &= 255-INPUT_DOWN_MASK;
    }else if(modKey == KEY_SPACE || modKey == KEY_SHIFT || modKey == KEY_CTRL || modKey == KEY_X){
        (key > 0) ? playerController |= INPUT_SHOOT_MASK : playerController &= 255-INPUT_SHOOT_MASK;
    }else if(modKey == KEY_ENTER && key > 0 && state == "ENDGAME"){
        restartGame();
    }
}

function update(){
    
    if(ticker.FPS < 58){
        console.warn("Low fps: " + ticker.FPS);
    }

    if(playerShootingTimeout > 0){
        playerShootingTimeout--;
    }
        
    switch(state){
        case "NEWGAME":
            startNewGame();
            break;
        case "INGAME":
            gameLoop();
            break;
        case "ENDGAME":
            gameLoop();
            break;
    }
    
    // requestAnimationFrame(update);
}

function restartGame(){
    state = "NEWGAME" //NEWGAME, INGAME, ENDGAME
    enemyState = "LEFT";
    score = 0;

    movementHelperLeft = null;
    movementHelperRight = null;

    scoreText = null;

    playerEntity = null;
    playerController = 0b00000000; //0 - Down 1 - Right 2 - Up 3 - Left 7 - Shoot
    playerShootingTimeout = 60;
    enemyEntities = [];
    bulletEntities = [];
    explosionEntities = [];
    powerupEntities = [];
}

function startNewGame(){
    app.stage = new PIXI.Stage(0xFF);

    ENEMY_SHOOTING_PROB = 0.00005;

    app.stage.addChild(new PIXI.Sprite(sprites.background.textures[0]));

    state = "INGAME";

    playerEntity = new Entity(app.screen.width/2,app.screen.height - 130,3,true,sprites.player,sprites.playerShots,sprites.playerExplosion,sprites.heart,sprites.shield);
    playerEntity.generateHealthIcons(sprites.heart);

    let entityPerRow = 15;
    let spaceBetweenEntities = 65;
    
    movementHelperLeft = new Entity((app.screen.width-(entityPerRow*spaceBetweenEntities))/2 + 3,0,0,false,null,null,null);
    movementHelperRight = new Entity((app.screen.width-(entityPerRow*spaceBetweenEntities))/2 + (entityPerRow-1)*spaceBetweenEntities + 3,0,0,false,null,null,null);

    for(let i = 0; i < entityPerRow; i++){
        enemyEntities[i] = new Entity((app.screen.width-(entityPerRow*spaceBetweenEntities))/2 + i*spaceBetweenEntities + 3,50,2,false,sprites.badguy3,sprites.badguy3Shots,sprites.badguy3Explosion,sprites.heart,sprites.shield);
        enemyEntities[i].scoreInc = 100;
        enemyEntities[i].generateHealthIcons(sprites.heart);
    }
    for(let i = 0; i < entityPerRow; i++){
        enemyEntities[i + entityPerRow] = new Entity((app.screen.width-(entityPerRow*spaceBetweenEntities))/2 + i*spaceBetweenEntities,110,1,false,sprites.badguy2,sprites.badguy2Shots,sprites.badguy2Explosion,sprites.heart,sprites.shield);
        enemyEntities[i + entityPerRow].scoreInc = 50;
        //enemyEntities[i + entityPerRow].generateHealthIcons(sprites.heart);
    }
    for(let i = 0; i < entityPerRow; i++){
        enemyEntities[i + entityPerRow * 2] = new Entity((app.screen.width-(entityPerRow*spaceBetweenEntities))/2 + i*spaceBetweenEntities,170,2,false,sprites.badguy2,sprites.badguy2Shots,sprites.badguy2Explosion,sprites.heart,sprites.shield);
        enemyEntities[i + entityPerRow * 2].scoreInc = 50;
        enemyEntities[i + entityPerRow * 2].generateHealthIcons(sprites.heart);
    }
    for(let i = 0; i < entityPerRow; i++){
        enemyEntities[i + entityPerRow * 3] = new Entity((app.screen.width-(entityPerRow*spaceBetweenEntities))/2 + i*spaceBetweenEntities,230,1,false,sprites.badguy1,sprites.badguy1Shots,sprites.badguy1Explosion,sprites.heart,sprites.shield);
        enemyEntities[i + entityPerRow * 3].scoreInc = 20;
        //enemyEntities[i + entityPerRow * 3].generateHealthIcons(sprites.heart);
    }
    for(let i = 0; i < entityPerRow; i++){
        enemyEntities[i + entityPerRow * 4] = new Entity((app.screen.width-(entityPerRow*spaceBetweenEntities))/2 + i*spaceBetweenEntities,290,1,false,sprites.badguy1,sprites.badguy1Shots,sprites.badguy1Explosion,sprites.heart,sprites.shield);
        enemyEntities[i + entityPerRow * 4].scoreInc = 20;
        //enemyEntities[i + entityPerRow * 4].generateHealthIcons(sprites.heart);
    }


    let style = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 36,
        fontWeight: 'bold',
        fill: ['#FFFFFF'],
        wordWrap: false,
    });
    
    scoreText = new PIXI.Text('Score: ' + score, style);
    scoreText.x = 0;
    scoreText.y = 0;
    
    app.stage.addChild(scoreText);
}

function parseInput(){
    if(playerController & INPUT_DOWN_MASK){
        //playerEntity.y+=2;
    }if (playerController & INPUT_UP_MASK){
        //playerEntity.y-=2;
    }if (playerController & INPUT_RIGHT_MASK){
        if(playerEntity.x + playerEntity.getWidth() + 2.5 < app.screen.width){
            playerEntity.x += 2.5;
        }else{
            playerEntity.x = app.screen.width - playerEntity.getWidth();
        }
    }if (playerController & INPUT_LEFT_MASK){
        if(playerEntity.x > 0){
            playerEntity.x -= 2.5;
        }else{
            playerEntity.x = 0;
        }
    }if (playerController & INPUT_SHOOT_MASK){
        if(playerShootingTimeout <= 0){
            playerEntity.shoot();
            playerShootingTimeout = 60;
        }
    }
}

function enemyMovement(){
    if(movementHelperLeft.x > 0 && enemyState == "LEFT"){
        enemyEntities.forEach(enemy => {
            enemy.x--;
        });
        movementHelperLeft.x--;
        movementHelperRight.x--;
    }else if(movementHelperRight.x + 3*11 < app.screen.width && enemyState == "RIGHT"){
        enemyEntities.forEach(enemy => {
            enemy.x++;
        });
        movementHelperLeft.x++;
        movementHelperRight.x++;
    }else{
        enemyState == "LEFT" ? enemyState = "RIGHT" : enemyState = "LEFT";
    }
}

function enemyShooting(){
    enemyEntities.forEach(entity => {
        if (Math.random() < ENEMY_SHOOTING_PROB){
            entity.shoot();
        }
    });
}

function generatePowerups(){
    if(Math.random() < POWERUP_CHANCE && powerupEntities.length < 3){
        let action = null;
        let sprite = null;
        let scale = null;
        if(Math.random() < 0.5){
            action = (entity) => {
                entity.addHealth();
            };
            sprite = sprites.heart;
            scale = 3;
        }else{
            action = (entity) => {
                entity.addShield();
            };
            sprite = sprites.shield;
            scale = 1.2;
        }
        let powerup = new Powerup(Math.random() * (app.screen.width-sprite.textures[0].width),app.screen.height - 120,sprite,action,scale);
        powerupEntities.push(powerup);
    }
}

function gameLoop(){
    parseInput();

    enemyMovement();
    
    enemyShooting();

    checkCollisions();

    checkHealth();

    generatePowerups();

    bulletEntities.forEach(entity => {
        entity.display();
    });
    if(state != "ENDGAME"){
        playerEntity.display();
    }
    enemyEntities.forEach(entity => {
        entity.display();
    })
    powerupEntities.forEach(entity => {
        entity.display();
    });
    for (let index = 0; index < explosionEntities.length; ) {
        let explosion = explosionEntities[index];
        
        if(explosion.display()){
            explosion.hide();
            explosionEntities.splice(index, 1);
        }else{
            index++;
        }
    }
    
    scoreText.text = "Score: " + score;
}

function checkHealth(){
    if(playerEntity.health <= 0 && state != "ENDGAME") {
        endGame();
        playerEntity.hide();
    }

    for (let index = 0; index < bulletEntities.length; ) {
        let bullet = bulletEntities[index];
        
        if(bullet.health <= 0){
            bullet.hide();
            bulletEntities.splice(index, 1);
        }else{
            index++;
        }
    }

    for (let index = 0; index < enemyEntities.length; ) {
        let enemy = enemyEntities[index];
        
        if(enemy.health <= 0){
            enemy.hide();
            enemyEntities.splice(index, 1);
            score += enemy.scoreInc;
        }else{
            index++;
        }
    }

    for (let index = 0; index < powerupEntities.length; ) {
        let powerup = powerupEntities[index];
        
        if(powerup.health <= 0){
            powerup.hide();
            powerupEntities.splice(index, 1);
        }else{
            index++;
        }
    }
}

function checkCollisions() {
    for (let index = 0; index < bulletEntities.length; ) {
        let bullet = bulletEntities[index];
        
        if(bullet.y + bullet.getHeight() <= 0 || bullet.y > app.screen.height){
            bullet.hide();
            bulletEntities.splice(index, 1);
        }else{
            index++;
        }
    }

    bulletEntities.forEach(bullet => {
        if (!bullet.controllable){
            if (bullet.x + bullet.getWidth() > playerEntity.x && bullet.x < playerEntity.x + playerEntity.getWidth() &&
            bullet.y + bullet.getHeight() > playerEntity.y && bullet.y < playerEntity.y + playerEntity.getHeight()){
                bullet.hit();
                playerEntity.hit();

                let explosion = new Entity((bullet.x + playerEntity.x)/2,(bullet.y + playerEntity.y)/2,0,false,bullet.SADataExplosion,null,null,null,null);
                explosion.spriteAnimation.once = true;

                explosionEntities.push(explosion);
            }
        }else if (bullet.controllable){
            enemyEntities.forEach(enemy => {
                if (bullet.x + bullet.getWidth() > enemy.x && bullet.x < enemy.x + enemy.getWidth() &&
                bullet.y + bullet.getHeight() > enemy.y && bullet.y < enemy.y + enemy.getHeight()){
                    bullet.hit();
                    enemy.hit();

                    ENEMY_SHOOTING_PROB += 0.0001;

                    let explosion = new Entity((bullet.x + enemy.x)/2,(bullet.y + enemy.y)/2,0,false,bullet.SADataExplosion,null,null,null,null);
                    explosion.spriteAnimation.once = true;

                    explosionEntities.push(explosion);
                }
            });
        }
    });

    powerupEntities.forEach(powerup => {
        if(powerup.x + powerup.getWidth() > playerEntity.x && powerup.x < playerEntity.x + playerEntity.getWidth() &&
           powerup.y + powerup.getHeight() > playerEntity.y && powerup.y < playerEntity.y + playerEntity.getHeight()){
               powerup.action(playerEntity);

               powerup.hit();
           }
    });
}

function endGame(){    
    state = "ENDGAME";

    app.stage.removeChild(scoreText);
    
    let style = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 36,
        fontWeight: 'bold',
        fill: ['#FFFFFF'],
        wordWrap: false,
    });

    ENEMY_SHOOTING_PROB = 0;

    let rect = PIXI.TextMetrics.measureText('GAME OVER', style);
    
    let gameOver = new PIXI.Text('GAME OVER', style);
    gameOver.x = app.screen.width/2 - rect.width/2;
    gameOver.y = app.screen.height/2 - rect.height/2;

    rect = PIXI.TextMetrics.measureText('Final Score: ' + score, style);

    let finalScoreText = new PIXI.Text('Final Score: ' + score, style);
    finalScoreText.x = app.screen.width/2 - rect.width/2;
    finalScoreText.y = app.screen.height/2 - rect.height/2 + 50;

    rect = PIXI.TextMetrics.measureText('Press Enter to Restart', style);
    
    let restartText = new PIXI.Text('Press Enter to Restart', style);
    restartText.x = app.screen.width/2 - rect.width/2;
    restartText.y = app.screen.height/2 - rect.height/2 + 100;
    
    app.stage.addChild(gameOver);
    app.stage.addChild(finalScoreText);
    app.stage.addChild(restartText);
}

function processSprites(){
    let spriteSheet = PIXI.loader.resources['assets/spritesheet.png'].texture.baseTexture;

    let map = {
        badguy1 : {pos : [[2,3],[18,3],[34,3]], size : [12,11], frames : 6},
        badguy2 : {pos : [[2,18],[18,18],[34,18]], size : [12,11], frames : 6},
        badguy3 : {pos : [[3,34],[19,34],[35,34]], size : [10,12], frames : 6},
        badguy1Shots : {pos : [[51,3],[59,3]], size : [3,13], frames : 3},
        badguy2Shots : {pos : [[50,21],[58,21]], size : [5,11], frames : 3},
        badguy3Shots : {pos : [[49,35],[57,35]], size : [6,13], frames : 3},
        player : {pos : [[2,210],[18,210],[34,210]], size : [12,13], frames : 6},
        playerShots : {pos : [[66,212],[73,212]], size : [5,12], frames : 3},
        playerExplosion : {pos : [[0,513],[16,513],[31,513],[48,513]], size : [14,14], frames: 5},
        badguy1Explosion : {pos : [[0,545],[16,545],[31,545],[48,545]], size : [14,14], frames: 5},
        badguy2Explosion : {pos : [[0,577],[16,577],[31,577],[48,577]], size : [14,14], frames: 5},
        badguy3Explosion : {pos : [[0,497],[16,497],[31,497],[48,497]], size : [14,14], frames: 5}
    };

    for(let key in map){
        sprites[key] = {};
        sprites[key].frames = map[key].frames;
        sprites[key].textures = [];
        map[key].pos.forEach(element => {
            let spriteTexture = new PIXI.Texture(spriteSheet,new PIXI.Rectangle(element[0],element[1],map[key].size[0],map[key].size[1]));

            sprites[key].textures.push(spriteTexture);
        });
    }

    sprites.heart = {};
    sprites.heart.frames = 0;
    sprites.heart.textures = [PIXI.loader.resources['assets/heart.png'].texture];

    sprites.shield = {};
    sprites.shield.frames = 0;
    sprites.shield.textures = [PIXI.loader.resources['assets/shield.png'].texture];

    sprites.background = {};
    sprites.background.frames = 0;
    sprites.background.textures = [PIXI.loader.resources['assets/background.jpg'].texture];

    // requestAnimationFrame(update);
    ticker.stop();
    ticker.add((deltaTime) => {
        update();
    });
    ticker.start();
}

class SpriteAnimation {
    constructor(SAData, scale = 3){
        this.textures = SAData.textures;
        this.sprite = new PIXI.Sprite(this.textures[0]);
        this.currentTexture = 0;
        this.currentFrames = 0;
        if (this.textures == sprites.shield.textures){
            console.warn(scale);
        }
        this.sprite.width *= scale;
        this.sprite.height *= scale;
        this.sprite.filters = [shader];
        this.framesPerTexture = SAData.frames;
        this.visible = false;
        this.once = false;
        app.stage.addChild(this.sprite);
    }

    update() {
        if(this.textures.length > 1){
            if(!this.visible){
                return null;
            }
            this.currentFrames++;
            if(this.currentFrames >= this.framesPerTexture){
                this.currentFrames = 0;
                this.currentTexture++;
                if(this.currentTexture >= this.textures.length && this.once){
                    this.hide();
                    return true;
                }
                this.currentTexture %= this.textures.length;
                this.sprite.setTexture(this.textures[this.currentTexture]);
            }
        }
    }

    hide(){
        this.visible = false;
        app.stage.removeChild(this.sprite);
    }

    getSprite(){
        return this.sprite;
    }
}

class Entity{
    constructor(x,y,health,controllable,SAData,SADataBullet,SADataExplosion,SADataHearts,SADataShields,scale = 3){
        this.x = x;
        this.y = y;
        this.health = health;
        this.shield = 0;
        this.healthIcons = [];
        this.shieldIcons = [];
        this.controllable = controllable;
        this.SADataHearts = SADataHearts;
        this.SADataShields = SADataShields;
        this.scale = scale;
        if(SAData){
            this.spriteAnimation = new SpriteAnimation(SAData, this.scale);
            this.spriteAnimation.update();
        }
        this.SADataBullet = SADataBullet;
        this.SADataExplosion = SADataExplosion;
    }

    generateHealthIcons(){
        for(let i = 0; i < this.health; i++){
            let heart = new SpriteAnimation(this.SADataHearts, 1.3);
            this.healthIcons.push(heart);
        }
        this.updateHearts();
    }
    
    addHealth(){
        if(this.health < 3) {
            let heart = new SpriteAnimation(this.SADataHearts, 1.3);
            this.healthIcons.push(heart);

            this.health++;

            this.updateHearts();
        }
    }

    generateShieldIcons(){
        for(let i = 0; i < this.health; i++){
            let shield = new SpriteAnimation(this.SADataShields, 0.75);
            this.shieldIcons.push(shield);
        }
        this.updateShields();
    }

    addShield(){
        let shield = new SpriteAnimation(this.SADataShields, 0.75);
        this.shieldIcons.push(shield);
        
        this.shield++;

        this.updateShields();
    }

    display(){
        if(this.spriteAnimation.update()){
            return true;
        }

        this.spriteAnimation.visible = true;
        let sprite = this.getSprite();
        sprite.x = this.x;
        sprite.y = this.y;

        this.updateHearts();
        this.updateShields();
    }

    updateHearts(){
        if(this.healthIcons.length > 0){
            let start = this.x;

            let inc = this.healthIcons[0].sprite.width;

            let shift = (this.healthIcons[0].sprite.width * this.healthIcons.length)/2 - this.getWidth()/2;

            for (let i = 0; i < this.healthIcons.length; i++){
                let heart = this.healthIcons[i].getSprite();
                heart.x = start + inc * i;
                heart.x -= shift;
                heart.y = this.y + this.getHeight();
            }
        }
    }

    updateShields(){
        if(this.shieldIcons.length > 0){
            let start = this.x;

            let inc = this.shieldIcons[0].sprite.width;

            let shift = (this.shieldIcons[0].sprite.width * this.shieldIcons.length)/2 - this.getWidth()/2;

            for (let i = 0; i < this.shieldIcons.length; i++){
                let shield = this.shieldIcons[i].getSprite();
                shield.x = start + inc * i;
                shield.x -= shift;
                shield.y = this.y + (this.getHeight() * 1.5);
            }
        }
    }

    hit(){
        if(this.shield > 0){
            this.shield--;

            if(this.shieldIcons.length > 0){
                let shield = this.shieldIcons.pop();
                shield.hide();
                this.updateShields();
            }
        }else{
            this.health--;

            if(this.healthIcons.length > 0){
                let heart = this.healthIcons.pop();
                heart.hide();
                this.updateHearts();
            }
        }
    }

    hide(){
        this.spriteAnimation.hide();
        this.healthIcons.forEach(health => {
            health.hide();
        });
    }

    getSprite(){
        return this.spriteAnimation.getSprite();
    }

    getWidth(){
        return this.spriteAnimation.sprite.width;
    }

    getHeight(){
        return this.spriteAnimation.sprite.height;
    }

    shoot(){
        if(!this.spriteAnimation.visible) return;
        let speed = 1;
        if (this.controllable) {
            speed = 9;
        }else {
            speed = 7;
        }
        if(this.SADataBullet){
            let bodyOffset = this.spriteAnimation.sprite.width / 2;
            let bulletOffset = (this.SADataBullet.textures[0].width)*3 / 2;
            let bullet = new Bullet(this.x + bodyOffset - bulletOffset,this.y,1,this.controllable,this.SADataBullet,this.SADataExplosion,speed);
            bulletEntities.push(bullet);
        }else{
            console.error("Entity with no bullet defined tried to shoot!");
        }
    }
}

class Bullet extends Entity{
    constructor(x,y,health,controllable,SAData,SADataExplosion,speed){
        super(x,y,health,controllable,SAData,null,SADataExplosion,null,null);
        this.speed = speed;
    }

    display(){
        if(this.controllable){
            this.y -= this.speed; 
        }else{
            this.y += this.speed;
        }
        super.display();
    }
}

class Powerup extends Entity{
    constructor(x,y,SAData,action,scale = 3){
        super(x,y,1,false,SAData,null,null,null,null,scale);

        this.action = action;
    }
}
