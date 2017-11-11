"use strict"

let canvas, ctx, canvas_overlay, ctx_overlay, canvas_back, ctx_back, width, height;
let socket, hash, isHost = false, hosted = {};
let bgAudio = undefined, effectAudio = undefined, currentEffect = 0, currentDirection = 1;

let keys = [];

let friction = 0.8;
let gravity = 0.3;
let wallBounce = 1.5;

let COLORS = {
  c: [
    [ '#9b9b9b', '#434343' ],
    [ '#fe0000', '#930202' ],
    [ '#00e110', '#007b09' ],
    [ '#de00ff', '#750086' ],
    [ '#ffb400', '#ad7a00' ],
    [ '#0048ff', '#183171' ],
    [ '#ffff00', '#b5b513' ],
    [ '#ff0078', '#960047' ],
    [ '#fdfdfd', '#bfbfbf' ],
    [ '#000000', '#363636' ],
  ],
  gray: 0,
  red: 1,
  green: 2,
  purple: 3,
  orange: 4,
  blue: 5,
  yellow: 6,
  pink: 7,
  white: 8,
  black: 9,
};
let IMAGES = {};

let player = {
  x: 0,
  y: 0,
  width: 5,
  height: 5,
  color: COLORS.red,
  speed: 3,
  velX: 0,
  velY: 0,
  jumping: false,
  grounded: false,
};
let player2 = {
  x: 0,
  y: 0,
  width: 5,
  height: 5,
  color: COLORS.yellow,
  speed: 3,
  velX: 0,
  velY: 0,
  jumping: false,
  grounded: false,
};
let obstacles = [];
let players = {};
let selectedOb = undefined;


const updateLoop = () => {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx_back.fillStyle = 'black';
  ctx_back.fillRect(0,0,canvas.width,canvas.height);

  checkKeys(player);
  checkKeys2(player2);
  
  calcFriction(player);
  calcGravity(player); 
  calcFriction(player2);
  calcGravity(player2);
  
  handleObstacles(ctx, player);
  handleObstacles(ctx, player2);
  
  movePlayer(player);
  movePlayer(player2);
  
  drawPlayer(ctx, player);
  drawPlayer(ctx, player2);
  
  requestAnimationFrame(updateLoop);
};

const movePlayer = (plr) => {
  if(plr.grounded){
    plr.velY = 0;
  }
  
  plr.x += plr.velX;
  plr.y += plr.velY;
}

const calcFriction = (plr) => {
  plr.velX *= friction;
};

const calcGravity = (plr) => {
  plr.velY += gravity;
}

const keepInBounds = (plr) => {
  if (plr.x >= canvas.width-plr.width) {
    plr.x = canvas.width-player.width;
  } else if (plr.x <= 0) {
    plr.x = 0;
  }
  if(plr.y >= canvas.height-plr.height){
    plr.y = canvas.height - plr.height;
    plr.jumping = false;
  }
}

const drawPlayer = (c, plr) => { 
  if(plr.image){
    c.drawImage(plr.image, plr.x, plr.y);
  } else {
    c.fillStyle = COLORS.c[plr.color][0];
    c.fillRect(plr.x, plr.y, plr.width, plr.height);
  }
  ctx_back.fillStyle = COLORS.c[plr.color][1];
  ctx_back.fillRect(plr.x-2, plr.y+1, plr.width, plr.height);
}

const drawObstacle = (c, ob) => {
  c.fillStyle = COLORS.c[ob.color][0];
  c.fillRect(ob.x, ob.y, ob.width, ob.height);
  ctx_back.fillStyle = COLORS.c[ob.color][1];
  ctx_back.fillRect(ob.x-7, ob.y+5, ob.width, ob.height);
}
const handleObstacles = (c, plr) => {
  
  plr.grounded = false;
  
  for (var i = 0; i < obstacles.length; i++) {
    drawObstacle(c, obstacles[i]);
    handleCollisionOb(plr, obstacles[i]);
    //todo go through plr list here too
  }
  
  /*v2
  ctx.fillStyle = "black";
  ctx.beginPath();
  
  for (var i = 0; i < boxes.length; i++) {
    ctx.rect(boxes[i].x, boxes[i].y, boxes[i].width, boxes[i].height);
  }
 
  ctx.fill();
*/
}

const checkCollidePlayer = (a, b) => {
  let dir = checkCollision(a, b);
  
  if (dir === "l" || dir === "r") {
    a.velX *= -wallBounce;
    a.jumping = false;
  } else if (dir === "b") {
    a.grounded = true;
    a.jumping = false;
  } else if (dir === "t") {
    a.velY *= -1;
  }
  
  if(a.grounded){
     a.velY = 0;
  }
};
const handleCollisionOb = (plr, ob) => {
  let dir = checkCollision(plr, ob);

  if (dir === "l" || dir === "r") {
    plr.velX *= -wallBounce;
    plr.jumping = false;
  } else if (dir === "b") {
    plr.grounded = true;
    plr.jumping = false;
  } else if (dir === "t") {
    plr.velY *= -1;
  }
};

const playerJump = (plr) => {
  if(!plr.jumping && plr.grounded){
    plr.jumping = true;
    plr.grounded = false;
    plr.velY = -plr.speed*2;
  }
};

const playerMoveRight = (plr) => {
  if (plr.velX < plr.speed) {  
    plr.velX++;  
  }
};

const playerMoveLeft = (plr) => {
  if (plr.velX > -plr.speed) {
    plr.velX--;
  }
};

const checkKeys = (plr) => {
  // check keys
  
  // up arrow
  if (keys[38]) {
    playerJump(plr);
    playEffect();
  }
  // right arrow
  if (keys[39]) {
    playerMoveRight(plr);
  }
  // left arrow                  
  if (keys[37]) {                 
    playerMoveLeft(plr);
  }
}
const checkKeys2 = (plr) => {
    // up arrow
  if (keys[87]) {
    playerJump(plr);
  }
  // right arrow
  if (keys[68]) {
    playerMoveRight(plr);
  }
  // left arrow                  
  if (keys[65]) {                 
    playerMoveLeft(plr);
  }
}

const checkCollision = (a, b) => {
  // get the vectors to check against
  let 
    vX = (a.x + (a.width / 2)) - (b.x + (b.width / 2)),
    vY = (a.y + (a.height / 2)) - (b.y + (b.height / 2)),
    // add the half widths and half heights of the objects
    hWidths = (a.width / 2) + (b.width / 2),
    hHeights = (a.height / 2) + (b.height / 2),
    colDir = null;
  
  // if the x and y vector are less than the half width or half height, they we must be inside the object, causing a collision
  if (Math.abs(vX) < hWidths && Math.abs(vY) < hHeights) {
  // figures out on which side we are colliding (top, bottom, left, or right)
    let
      oX = hWidths - Math.abs(vX),
      oY = hHeights - Math.abs(vY);
    
    if (oX >= oY) {
      if (vY > 0) {
        colDir = "t";
        a.y += oY;
      } else {
        colDir = "b";
        a.y -= oY;
      }
    } else {
      if (vX > 0) {
        colDir = "l";
        a.x += oX;
      } else {
        colDir = "r";
        a.x -= oX;
      }
    }
  }
  return colDir;
};

const setupObstacles = () => {
  obstacles.push({
    x: 0,
    y: height - 5,
    width: width,
    height: 50,
    color: Math.round(Math.random() * 8)
  });
  obstacles.push({
    x: 0,
    y: 0,
    width: 10,
    height: height,
    color: Math.round(Math.random() * 8)
  });
  obstacles.push({
    x: width - 10,
    y: 0,
    width: 50,
    height: height,
    color: Math.round(Math.random() * 8)
  });
  
  
  obstacles.push({
    x: 100,
    y: height-105,
    width: 80,
    height: 80,
    color: Math.round(Math.random() * 9)
  });
  obstacles.push({
    x: 140,
    y: height-155,
    width: 80,
    height: 80,
    color: Math.round(Math.random() * 9)
  });
  obstacles.push({
    x: 220,
    y: height-105,
    width: 80,
    height: 80,
    color: Math.round(Math.random() * 9)
  });
  obstacles.push({
    x: 300,
    y: height-55,
    width: 40,
    height: 40,
    color: Math.round(Math.random() * 9)
  });
};

const init = () => {
  setupCanvas();
  setupSockets();
  
  setupSound();
  
  preloadImages(toLoadImgs, IMAGES);
  requestAnimationFrame(preloadLoop);
};

window.onload = init;