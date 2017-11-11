"use strict";

let canvas, ctx, canvas_overlay, ctx_overlay, canvas_back, ctx_back, width, height;
let socket,
    hash,
    isHost = false,
    hosted = {};
let bgAudio = undefined,
    effectAudio = undefined,
    currentEffect = 0,
    currentDirection = 1;

let keys = [];

let friction = 0.8;
let gravity = 0.3;
let wallBounce = 1.5;

let COLORS = {
  c: [['#9b9b9b', '#434343'], ['#fe0000', '#930202'], ['#00e110', '#007b09'], ['#de00ff', '#750086'], ['#ffb400', '#ad7a00'], ['#0048ff', '#183171'], ['#ffff00', '#b5b513'], ['#ff0078', '#960047'], ['#fdfdfd', '#bfbfbf'], ['#000000', '#363636']],
  gray: 0,
  red: 1,
  green: 2,
  purple: 3,
  orange: 4,
  blue: 5,
  yellow: 6,
  pink: 7,
  white: 8,
  black: 9
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
  grounded: false
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
  grounded: false
};
let obstacles = [];
let players = {};
let selectedOb = undefined;

const updateLoop = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx_back.fillStyle = 'black';
  ctx_back.fillRect(0, 0, canvas.width, canvas.height);

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

const movePlayer = plr => {
  if (plr.grounded) {
    plr.velY = 0;
  }

  plr.x += plr.velX;
  plr.y += plr.velY;
};

const calcFriction = plr => {
  plr.velX *= friction;
};

const calcGravity = plr => {
  plr.velY += gravity;
};

const keepInBounds = plr => {
  if (plr.x >= canvas.width - plr.width) {
    plr.x = canvas.width - player.width;
  } else if (plr.x <= 0) {
    plr.x = 0;
  }
  if (plr.y >= canvas.height - plr.height) {
    plr.y = canvas.height - plr.height;
    plr.jumping = false;
  }
};

const drawPlayer = (c, plr) => {
  if (plr.image) {
    c.drawImage(plr.image, plr.x, plr.y);
  } else {
    c.fillStyle = COLORS.c[plr.color][0];
    c.fillRect(plr.x, plr.y, plr.width, plr.height);
  }
  ctx_back.fillStyle = COLORS.c[plr.color][1];
  ctx_back.fillRect(plr.x - 2, plr.y + 1, plr.width, plr.height);
};

const drawObstacle = (c, ob) => {
  c.fillStyle = COLORS.c[ob.color][0];
  c.fillRect(ob.x, ob.y, ob.width, ob.height);
  ctx_back.fillStyle = COLORS.c[ob.color][1];
  ctx_back.fillRect(ob.x - 7, ob.y + 5, ob.width, ob.height);
};
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
};

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

  if (a.grounded) {
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

const playerJump = plr => {
  if (!plr.jumping && plr.grounded) {
    plr.jumping = true;
    plr.grounded = false;
    plr.velY = -plr.speed * 2;
  }
};

const playerMoveRight = plr => {
  if (plr.velX < plr.speed) {
    plr.velX++;
  }
};

const playerMoveLeft = plr => {
  if (plr.velX > -plr.speed) {
    plr.velX--;
  }
};

const checkKeys = plr => {
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
};
const checkKeys2 = plr => {
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
};

const checkCollision = (a, b) => {
  // get the vectors to check against
  let vX = a.x + a.width / 2 - (b.x + b.width / 2),
      vY = a.y + a.height / 2 - (b.y + b.height / 2),

  // add the half widths and half heights of the objects
  hWidths = a.width / 2 + b.width / 2,
      hHeights = a.height / 2 + b.height / 2,
      colDir = null;

  // if the x and y vector are less than the half width or half height, they we must be inside the object, causing a collision
  if (Math.abs(vX) < hWidths && Math.abs(vY) < hHeights) {
    // figures out on which side we are colliding (top, bottom, left, or right)
    let oX = hWidths - Math.abs(vX),
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
    y: height - 105,
    width: 80,
    height: 80,
    color: Math.round(Math.random() * 9)
  });
  obstacles.push({
    x: 140,
    y: height - 155,
    width: 80,
    height: 80,
    color: Math.round(Math.random() * 9)
  });
  obstacles.push({
    x: 220,
    y: height - 105,
    width: 80,
    height: 80,
    color: Math.round(Math.random() * 9)
  });
  obstacles.push({
    x: 300,
    y: height - 55,
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
var _this = this;

const getMouse = e => {
  var offset = canvas_top.getBoundingClientRect();
  return {
    x: e.clientX - offset.left,
    y: e.clientY - offset.top
  };
};
const lerp = (v0, v1, alpha) => {
  return (1 - alpha) * v0 + alpha * v1;
};
const calculateDT = () => {
  var now, fps;
  now = performance.now();
  fps = 1000 / (now - _this.lastTime);
  fps = clampValue(fps, 12, 60);
  _this.lastTime = now;
  return 1 / fps;
};
const clampValue = (value, min, max) => {
  return Math.max(min, Math.min(max, value));
};

//--collision---------------------------------------
//check if point is in square [box]: {x, y, height, width}
const isInBounds = (point, box) => {
  if (point.y < box.y || point.y > box.y + box.height || point.x < box.x || point.x > box.x + box.width) {
    return false;
  }
  return true;
};

//check if point is in circle bounds [circle]: {x, y, radius}
const isInCircle = (point, circle) => {
  var dx = point.x - circle.x;
  var dy = point.y - circle.y;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
};

//check circle x circle intersections [circle]: {x, y, radius}
const circlesIntersect = (c1, c2) => {
  var dx = c2.x - c1.x;
  var dy = c2.y - c1.y;
  var distance = Math.sqrt(dx * dx + dy * dy);
  return distance < c1.radius + c2.radius;
};

//--draw--------------------------------------------
const fillText = (targetCtx, string, x, y, font, color, center) => {
  targetCtx.save();
  if (center) {
    targetCtx.textAlign = 'center';
    targetCtx.textBaseline = 'middle';
  };
  targetCtx.font = font;
  targetCtx.fillStyle = color;
  targetCtx.fillText(string, x, y);
  targetCtx.restore();
};

const drawRoundedRect = (x, y, w, h, amt, targetCtx, stroke) => {
  targetCtx.save();
  //targetCtx.fillRect(x,y,w,h);
  if (amt * 2 >= h) {
    amt = h / 2;
  }
  if (amt * 2 >= w) {
    amt = w / 2;
  }

  w -= amt * 2;
  h -= amt * 2;

  targetCtx.beginPath();
  targetCtx.moveTo(x + amt, y); //top left inner

  targetCtx.lineTo(x + w + amt, y); //top side
  targetCtx.quadraticCurveTo(x + w + amt * 2, y, x + w + amt * 2, y + amt); //top right corner

  targetCtx.lineTo(x + w + amt * 2, y + h + amt); //right side
  targetCtx.quadraticCurveTo(x + w + amt * 2, y + h + amt * 2, x + w + amt, y + h + amt * 2); //bottom right corner

  targetCtx.lineTo(x + amt, y + h + amt * 2); //bottom side
  targetCtx.quadraticCurveTo(x, y + h + amt * 2, x, y + h + amt); //bottom right corner

  targetCtx.lineTo(x, y + amt); //left side
  targetCtx.quadraticCurveTo(x, y, x + amt, y); //bottom left corner

  targetCtx.fill();
  if (stroke) targetCtx.stroke();
  targetCtx.restore();
};

//draw a ui (top-canvas) button [button]: {x, y, height, width}
const drawButton = (button, text, color) => {
  ctx_top.fillStyle = color || button.color;
  ctx_top.lineWidth = 1.5;
  drawRoundedRect(button.x, button.y, button.width, button.height, 3, ctx_top, true);
  fillText(ctx_top, text || button.text, button.x + button.width / 2, button.y + button.height / 2, 'bold 13pt Trebuchet MS', button.textColor || 'black', true);
};

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  var words = text.replace(/\n/g, " \n ").split(" ");
  var line = '';

  let totalheight = lineHeight;
  const starty = y;

  for (var n = 0; n < words.length; n++) {
    var testLine = line + words[n] + ' ';
    var metrics = context.measureText(testLine);
    var testWidth = metrics.width;

    if (words[n] === '\n') {
      context.fillText(line, x, y);
      line = '';
      y += lineHeight;
      totalheight += lineHeight;
    } else if (testWidth > maxWidth && n > 0) {
      context.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
      totalheight += lineHeight;
    } else {
      line = testLine;
    }
  }
  context.fillText(line, x, y);
  context.fillRect(x - 5, starty, 3, totalheight);

  return totalheight;
}

//--vars-----------------------------region
let bgTracks = {
  building101: { src: 'assets/audio/101Building (Kerning Square).mp3', lastTime: 0 },
  floralLife: { src: 'assets/audio/Floral Life (Henesys).mp3', lastTime: 0 },
  restNpeace: { src: 'assets/audio/Rest \'N Peace (Henesys).mp3', lastTime: 0 },
  current: {}
};
let effectSounds = ["1.mp3", "2.mp3", "3.mp3", "4.mp3", "5.mp3", "6.mp3", "7.mp3", "8.mp3"];

//image preloading vv
let loadQueue = -1;
let numLoaded = 0;

const toLoadImgs = [{
  name: 'logo',
  url: 'assets/img/logo.png'
}, {
  name: 'red',
  url: 'assets/img/box-red.png'
}, {
  name: 'blue',
  url: 'assets/img/box-blue.png'
}, {
  name: 'green',
  url: 'assets/img/box-green.png'
}, {
  name: 'orange',
  url: 'assets/img/box-orange.png'
}, {
  name: 'yellow',
  url: 'assets/img/box-yellow.png'
}, {
  name: 'black',
  url: 'assets/img/box.png'
}, {
  name: 'purple',
  url: 'assets/img/box-purple.png'
}, {
  name: 'pink',
  url: 'assets/img/box-pink.png'
}];
//endregion

const setupCanvas = () => {
  canvas = document.querySelector('#main');
  ctx = canvas.getContext('2d');
  canvas_overlay = document.querySelector('#overlay');
  ctx_overlay = canvas_overlay.getContext('2d');
  canvas_back = document.querySelector('#back');
  ctx_back = canvas_back.getContext('2d');

  width = canvas.width;
  height = canvas.height;
};

const setupSockets = () => {
  socket = io.connect();

  //socket.on('hostConfirm', confirmHost); //setting this as the host
  //socket.on('joined', setUser); //when this user joins the server
  //socket.on('updatedMovement', update); //when players move
  //socket.on('attackHit', playerDeath); //when a player dies
  //socket.on('attackUpdate', receiveAttack); //when an attack is sent
  //socket.on('left', removeUser); //when a user leaves
  //socket.on('hostLeft', hostLeft); //when the host disconnects
};

const setupEvents = () => {
  document.onkeydown = e => {
    keys[e.keyCode] = true;
    e.preventDefault(); //todo restrict to used keys
  };
  document.onkeyup = e => {
    keys[e.keyCode] = false;
  };
};

const preloadLoop = () => {
  if (loadQueue == numLoaded) {
    startupLoop();
    canvas_overlay.onmousedown = e => {
      setupGame();
    };
    document.onkeyup = e => {
      setupGame();
    };
    return;
  }

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '15pt Courier';
  ctx.fillStyle = 'white';
  ctx.fillText('Loading App...', canvas.width / 2, canvas.height / 2);

  requestAnimationFrame(preloadLoop);
};
const startupLoop = () => {

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.font = '30pt Courier';
  ctx.fillText('BoxLand', canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = '15pt Courier';
  ctx.fillText('- Click or press any button to play! -', canvas.width / 2, canvas.height / 2 + 40);
  ctx.drawImage(IMAGES.logo.img, canvas.width / 2 - 25, canvas.height / 2 - 100);

  requestAnimationFrame(startupLoop);
};

const setupGame = () => {
  setupEvents();
  setupObstacles();

  playBgAudio();
  playEffect();
  requestAnimationFrame(updateLoop);
};

//--image preloader--------------------region
const preloadImages = (imgArr, targetList) => {
  if (loadQueue === -1) loadQueue = 0;
  targetList.toloadcount = 0;
  targetList.loadcount = 0;

  for (let i = 0; i < imgArr.length; i++) {
    let data = imgArr[i];

    let img = new Image();
    img.src = data.url;
    targetList.toloadcount++;
    loadQueue++;
    //console.log(`toloadcount: ${targetList.toloadcount}`);

    img.onload = e => {
      targetList[data.name] = {
        img: img,
        name: data.name,
        height: img.naturalHeight,
        width: img.naturalWidth
      };
      if (data.animData) targetList[data.name].animData = data.animData;

      targetList.loadcount++;
      numLoaded++;
      console.log(`loaded: ${data.name}, loadcount: ${targetList.loadcount}, anim?: ${data.animData}`);
    };
  }
};
//endregion

//--sound---------------------------region
const setupSound = () => {
  bgAudio = document.querySelector("#bgAudio");
  bgAudio.volume = 0.25;
  effectAudio = document.querySelector("#effectAudio");
  effectAudio.volume = 0.3;
  bgAudio.src = bgTracks.floralLife.src;
  bgAudio.current = bgTracks.floralLife;
};

const playBgAudio = () => {
  bgAudio.play();
};

const swapBg = (track, reset) => {
  bgTracks.current.lastTime = bgAudio.currentTime;
  bgTracks.current = bgTracks[track];
  bgAudio.src = bgTracks[track].src;

  bgAudio.currentTime = bgTracks.current.lastTime;
  if (reset) bgAudio.currentTime = bgTracks.current.lastTime = 0;
  bgAudio.play();
};

const stopBgAudio = () => {
  bgAudio.pause();
  bgAudio.currentTime = 0;
};

const playEffect = () => {
  currentEffect = Math.round(Math.random() * 8) - 1;
  if (currentEffect < 0) currentEffect = 0;
  effectAudio.src = "assets/audio/" + effectSounds[currentEffect];
  //console.log(currentEffect);
  effectAudio.play();
};

//endregion
