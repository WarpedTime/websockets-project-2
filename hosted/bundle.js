"use strict";

//socket stuff

var socket = void 0;
var hash = void 0;

//main canvases
var canvas = void 0;
var ctx = void 0;
var canvas_top = void 0;
var ctx_top = void 0;
var canvas_back = void 0;
var ctx_back = void 0;

//hidden canvas for upoading data to server
var sendBufferCanvas = void 0;
var sendBufferCtx = void 0;

//TOREMOVE server canvas
var canvas_server = void 0;
var ctx_server = void 0;

// TODO change how user id is generated
var user = parseInt(Math.random() * 1000);
var dragging = false;
var mouse = { x: 0, y: 0 };
var draw = {
  box: {
    x: 0,
    y: 0,
    width: 320,
    height: 120,
    isActive: false
  },
  fillStyle: 'red',
  strokeStyle: 'cyan',
  lineWidth: 3,
  hueShift: parseInt(Math.random() * user),
  kip: undefined,
  stamp: undefined,
  mode: 'pen'
};
//make post size 320x120 [miiverse dimensions]
var IMAGES = {
  test: {
    image: new Image(),
    width: 0,
    height: 0
  }
};
var testAvatar = {
  x: 0,
  y: 0
};
var testButton = void 0;

//sprites/avatar stuff
var directions = {
  DOWNLEFT: 0,
  DOWN: 1,
  DOWNRIGHT: 2,
  LEFT: 3,
  UPLEFT: 4,
  RIGHT: 5,
  UPRIGHT: 6,
  UP: 7
};
var players = {};

//-Functions------------------------

// TODO fix naming for all the things -_-
var login = function login(data) {
  user = data.name;
  document.querySelector('#user').textContent = 'User [' + user + ']';
  if (data.lastImage) lastImage(data.lastImage);
}; //logs user in to room [on 'login']

var handleMessage = function handleMessage(data) {
  importCanvas(data);
}; //handle update drawing msg from server

var submitData = function submitData() {
  if (draw.box.isActive) {
    sendBufferCanvas = document.createElement('canvas');
    sendBufferCanvas.height = 120;
    sendBufferCanvas.width = 320;
    //copy canvas
    sendBufferCtx = sendBufferCanvas.getContext('2d');
    //sendBufferCtx.drawImage(canvas,0,0);
    sendBufferCtx.drawImage(canvas, draw.box.x, draw.box.y, draw.box.width, draw.box.height, 0, 0, 320, 120);

    //server image
    var data = {
      name: user,
      x: draw.box.x,
      y: draw.box.y,
      height: draw.box.height,
      width: draw.box.width,
      imgData: sendBufferCanvas.toDataURL()
    };

    socket.emit('submit', data);
  }
}; //send canvas data to server

var lastImage = function lastImage(data) {

  ctx_back.clearRect(0, 0, canvas_back.width, canvas_back.height);
  //TOREMOVE server canvas
  ctx_server.clearRect(0, 0, canvas_back.width, canvas_back.height);

  var image = new Image();

  image.onload = function () {
    ctx_back.save();
    //ctx_back.drawImage(image, 0, 0, data.width, data.height, 100, 10, 160, 60);
    IMAGES.test.image = image;
    IMAGES.test.width = data.width;
    IMAGES.test.height = data.height;
    console.dir({ recievedImage: IMAGES.test });
    ctx_back.restore();

    //TOREMOVE server canvas
    ctx_server.save();
    ctx_server.drawImage(image, data.x, data.y, data.width / 2, data.height / 2);
    ctx_server.restore();
  };

  image.src = data.imgData;
  document.querySelector('#last').textContent = 'Last image: user [' + data.name + ']';
}; //get and show last updated image [on 'addedImage]

var setupCanvas = function setupCanvas() {
  canvas = document.querySelector("#canvas");
  ctx = canvas.getContext("2d");
  canvas_top = document.querySelector("#topCanvas");
  ctx_top = canvas_top.getContext('2d');
  canvas_back = document.querySelector("#backCanvas");
  ctx_back = canvas_back.getContext('2d');

  sendBufferCanvas = document.createElement('canvas');
  sendBufferCanvas.height = 200;
  sendBufferCanvas.width = 200;
  sendBufferCtx = sendBufferCanvas.getContext('2d');

  draw.box.x = canvas.width / 2 - 160, draw.box.y = canvas.height / 2 - 60, clearCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx_top.clearRect(0, 0, canvas_top.width, canvas_top.height);
};

//update players locations
var update = function update(data) {

  if (!players[data.hash]) {
    players[data.hash] = data;
    return;
  }

  var player = players[data.hash];

  //check if data is old
  if (players[data.hash].lastUpdate >= data.lastUpdate) {
    return;
  }

  //update lastupdated value
  player.lastUpdate = data.lastUpdate;

  //update prev positions
  player.prevX = data.prevX;
  player.prevY = data.prevY;
  player.destX = data.destX;
  player.destY = data.destY;

  //set animation alpha/progress
  player.alpha = 0;

  //update avatar diraction
  player.direction = data.direction;
  player.moveLeft = data.moveLeft;
  player.moveRight = data.moveRight;
  player.moveDown = data.moveDown;
  player.moveUp = data.moveUp;
};

//remove player from list
var removeUser = function removeUser(hash) {
  if (players[hash]) {
    delete players[hash];
  }
};

//set users data
var setUser = function setUser(data) {
  hash = data.hash;

  //add to list
  // TODO adont add to list, set as user
  players[hash] = data;

  requestAnimationFrame(redraw);
};

//update player position
var updatePosition = function updatePosition() {
  var player = players[hash];

  //advance positions
  player.prevX = player.x;
  player.prevY = player.y;
  //check upper area bounds
  if (player.moveUp && player.destY > 0) {
    player.destY -= 2;
  }

  //check lower area bounds
  if (player.moveDown && player.destY < 400) {
    player.destY += 2;
  }

  //check left area bounds
  if (player.moveLeft && player.destX > 0) {
    player.destX -= 2;
  }

  //check right area bounds
  if (player.moveRight && player.destX < 400) {
    player.destX += 2;
  }

  //if user is moving and left
  if (player.moveUp && player.moveLeft) player.direction = directions.UPLEFT;

  //if user is moving up and right
  if (player.moveUp && player.moveRight) player.direction = directions.UPRIGHT;
  //if user is moving down and left
  if (player.moveDown && player.moveLeft) player.direction = directions.DOWNLEFT;
  //if user is moving down and right
  if (player.moveDown && player.moveRight) player.direction = directions.DOWNRIGHT;
  //if user is just moving down
  if (player.moveDown && !(player.moveRight || player.moveLeft)) player.direction = directions.DOWN;
  //if user is just moving up
  if (player.moveUp && !(player.moveRight || player.moveLeft)) player.direction = directions.UP;
  //if user is just moving left
  if (player.moveLeft && !(player.moveUp || player.moveDown)) player.direction = directions.LEFT;
  //if user is just moving right
  if (player.moveRight && !(player.moveUp || player.moveDown)) player.direction = directions.RIGHT;

  //reset animation alpha
  player.alpha = 0;

  //FUTURE emit here instead of with lag
  //socket.emit('movementUpdate', player);
};

//draw objects
var redraw = function redraw(time) {
  //update current user position
  updatePosition();

  //clear screen
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  //loop through players
  var keys = Object.keys(players);
  for (var i = 0; i < keys.length; i++) {

    var player = players[keys[i]];

    //advance animation alpha
    if (player.alpha < 1) player.alpha += 0.05;

    // TODO make sure user is drawn on top
    //check if player is current user
    if (player.hash === hash) {
      ctx.filter = "none";
    }
    //otherwise we'll tint the image
    else {
        ctx.filter = "hue-rotate(40deg)";
      }

    //lerp position
    player.x = lerp(player.prevX, player.destX, player.alpha);
    player.y = lerp(player.prevY, player.destY, player.alpha);

    //make sure proper animations are playing
    if (player.frame > 0 || player.moveUp || player.moveDown || player.moveRight || player.moveLeft) {
      player.frameCount++;

      //switch frames after time
      if (player.frameCount % 8 === 0) {
        //move through animation and loop
        if (player.frame < 7) {
          player.frame++;
        } else {
          player.frame = 0;
        }
      }
    }
    //draw current sprite
    ctx.drawImage(walkImage, //current spritesheet
    player.width * player.frame, player.height * player.direction, player.width, //width to grab from the sprite sheet
    player.height, //height to grab from the sprite sheet
    player.x, //x location to draw on canvas
    player.y, //y location to draw on canvas
    player.width, //width to draw on canvas
    player.height //height to draw on canvas
    );

    //show sprite bounds
    ctx.strokeRect(player.x, player.y, player.width, player.height);
  }
  //redraw (hopefully at 60fps)
  requestAnimationFrame(redraw);
};

//-Setup----------------------------------

var init = function init() {
  socket = io.connect();

  //when player connects to server
  socket.on('connect', function () {
    //socket.emit('draw', {name:user, coords: draws[user]});
    //draw();
    socket.emit('join', { user: user });

    // DEBUG simulate lag
    //*setInterval(sendWithLag, 100);
  });

  // TODO merge these into one login
  //when player logged in
  socket.on('login', login);
  socket.on('joined', setUser);

  //when client logs out
  //*socket.on('left', removeUser);

  //when client recieves message from server
  socket.on('updated', handleMessage);

  //when another player 'speaks'
  socket.on('addedImage', lastImage);

  //when another player moves
  // *socket.on('updatedMovement', update);

  setupCanvas();
  //TOREMOVE server canvas
  canvas_server = document.querySelector("#canvas-server");
  ctx_server = canvas_server.getContext("2d");

  draw.stamp = document.querySelector('#img');

  //hook up events
  document.querySelector("#submit").onclick = submitData;
  document.querySelector("#clear").onclick = clearCanvas;
  document.querySelector("#drawMode").onchange = function (e) {
    draw.mode = e.target.value;
  };

  //DEBUG test toggle button
  var button = {
    x: canvas.width - 80,
    y: 0,
    height: 25,
    width: 80,
    color: 'red',
    pressed: false
  };

  canvas_top.onmousedown = function (e) {
    var mouse = getMouse(e);
    dragging = true;

    //if inputting post
    if (draw.box.isActive) {
      if (draw.mode === 'pen') {
        ctx.beginPath();
        ctx.moveTo(mouse.x, mouse.y);
      } else {
        ctx.filter = 'hue-rotate(' + draw.hueShift + 'deg)';
        ctx.drawImage(draw.stamp, mouse.x - draw.stamp.width / 2, mouse.y - draw.stamp.height / 2);
      }
    }

    //DEBUG check button
    var isClicked = true;
    if (mouse.y < button.y || mouse.y > button.y + button.height || mouse.x < button.x || mouse.x > button.x + button.width) {
      isClicked = false;
    }

    if (isClicked && button.pressed) {
      draw.box.isActive = false;
      button.pressed = false;
      button.color = 'red';

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx_top.clearRect(0, 0, canvas_top.width, canvas_top.height);
    } else if (isClicked && !button.pressed) {
      draw.box.isActive = true;
      button.pressed = true;
      button.color = 'green';

      clearCanvas();
    }
  };

  canvas_top.onmousemove = function (e) {
    mouse = getMouse(e);

    if (draw.box.isActive) {
      if (draw.mode === 'pen') {
        if (!dragging) {
          return;
        }

        ctx.strokeStyle = draw.strokeStyle;
        ctx.lineWidth = draw.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineTo(mouse.x, mouse.y);
        ctx.stroke();
        ctx.filter = 'hue-rotate(' + draw.hueShift + 'deg)';
        //draw.hueShift = (draw.hueShift + 1) % 359;
      } else {
        //overlay stamp
        ctx_top.clearRect(0, 0, canvas_top.width, canvas_top.height);
        ctx_top.filter = 'hue-rotate(' + draw.hueShift + 'deg)';
        ctx_top.drawImage(draw.stamp, mouse.x - draw.stamp.width / 2, mouse.y - draw.stamp.height / 2);
      }
    }
  };

  canvas_top.onmouseup = canvas_top.onmouseout = function (e) {

    if (draw.box.isActive) {
      ctx.closePath();
      ctx_top.clearRect(0, 0, canvas_top.width, canvas_top.height);
    }
    dragging = false;
  };

  //key events
  document.body.addEventListener('keydown', keyDownHandler);
  document.body.addEventListener('keyup', keyUpHandler);

  //DEBUG animation frame
  var drawThing = function drawThing() {
    ctx_back.clearRect(0, 0, canvas_back.width, canvas_back.height);

    ctx.filter = 'none';

    ctx_back.drawImage(IMAGES.test.image, 0, 0, IMAGES.test.width, IMAGES.test.height, testAvatar.x, testAvatar.y, 160, 60);
    ctx_back.strokeStyle = 'black';
    ctx_back.strokeRect(testAvatar.x, testAvatar.y, 160, 60);

    //DEBUG draw test button
    ctx.save();
    ctx.fillStyle = button.color;
    ctx.fillRect(button.x, button.y, button.width, button.height);
    ctx.restore();

    requestAnimationFrame(drawThing);
  };
  drawThing();
};

//-General--------------------------------

// TODO account for padding/margins?
var getMouse = function getMouse(e) {
  var offset = canvas_top.getBoundingClientRect();
  return {
    x: e.clientX - offset.left,
    y: e.clientY - offset.top
  };
};
var clearCanvas = function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(183, 183, 183, 0.23)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 1;
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.fillRect(draw.box.x, draw.box.y, draw.box.width, draw.box.height);
  ctx.strokeRect(draw.box.x - 1, draw.box.y - 1, draw.box.width + 3, draw.box.height + 3);

  ctx_top.clearRect(0, 0, canvas_top.width, canvas_top.height);
};
var importCanvas = function importCanvas(data) {
  var image = new Image();
  var drawTo = data.ctx || ctx;

  image.onload = function () {
    drawTo.save();
    drawTo.globalCompositeOperation = data.layerStyle || 'source-over';
    drawTo.drawImage(image, data.x, data.y, data.width, data.height);
    drawTo.restore();
  };

  image.src = data.imgData;
};

//handle key down
var keyDownHandler = function keyDownHandler(e) {
  var keyPressed = e.which;

  //grab this user's object 
  var player = players[hash];
  // W OR UP
  if (keyPressed === 87 || keyPressed === 38) {}
  //player.moveUp = true;

  // A OR LEFT
  else if (keyPressed === 65 || keyPressed === 37) {}
    //player.moveLeft = true;

    // S OR DOWN
    else if (keyPressed === 83 || keyPressed === 40) {}
      //player.moveDown = true;

      // D OR RIGHT
      else if (keyPressed === 68 || keyPressed === 39) {}
        //player.moveRight = true;


        //DEBUG move test recieved image
  if (keyPressed === 87 || keyPressed === 38) {
    testAvatar.y -= 3;
  }
  if (keyPressed === 65 || keyPressed === 37) {
    testAvatar.x -= 3;
  }
  if (keyPressed === 83 || keyPressed === 40) {
    testAvatar.y += 3;
  }
  if (keyPressed === 68 || keyPressed === 39) {
    testAvatar.x += 3;
  }

  //prevent page from moving
  //if(player.moveUp || player.moveDown || player.moveLeft || player.moveRight) {
  //  e.preventDefault();
  //}
};
//handle key up
var keyUpHandler = function keyUpHandler(e) {
  //grab keycode from keyboard event
  var keyPressed = e.which;

  //grab this user's object
  var player = players[hash];
  // W OR UP
  if (keyPressed === 87 || keyPressed === 38) {}
  //player.moveUp = false;

  // A OR LEFT
  else if (keyPressed === 65 || keyPressed === 37) {}
    //player.moveLeft = false;

    // S OR DOWN
    else if (keyPressed === 83 || keyPressed === 40) {}
      //player.moveDown = false;

      // D OR RIGHT
      else if (keyPressed === 68 || keyPressed === 39) {
          //player.moveRight = false;
        }
};

//use to foce lag for testing
var sendWithLag = function sendWithLag() {
  socket.emit('movementUpdate', players[hash]);
};
var lerp = function lerp(v0, v1, alpha) {
  return (1 - alpha) * v0 + alpha * v1;
};

//-Set onload-----------------------------
window.onload = init;
