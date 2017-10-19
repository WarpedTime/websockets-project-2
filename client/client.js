"use strict";

//socket stuff
let socket;
let hash;

//main canvases
let canvas;
let ctx;
let canvas_top;
let ctx_top;
let canvas_back;
let ctx_back;

//hidden canvas for upoading data to server
let sendBufferCanvas;
let sendBufferCtx;

let user = {
  name: '',
  rand: parseInt(Math.random() * 1000),
  room: 'none'
}
let dragging = false;
let mouse = { x:0, y:0 };
let draw = {
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
  hueShift: parseInt(Math.random()*user.rand),
  kip: undefined,
  stamp: undefined,
  mode: 'pen'
};
//make post size 320x120 [miiverse dimensions]
let IMAGES = {
  test: {
    image: new Image(),
    width: 0,
    height: 0
  }
};
let testAvatar = {
  x: 0,
  y: 0
};
let chatButton;
let clearButton;
let postButton;
let avatarImage;

//sprites/avatar stuff
const directions = {
  DOWNLEFT: 0,
  DOWN: 1,
  DOWNRIGHT: 2, 
  LEFT: 3,
  UPLEFT: 4,
  RIGHT: 5, 
  UPRIGHT: 6,
  UP: 7
};
let players = {};
let loggedIn = false;

//-Functions------------------------

const login = (data) => {
  user.name = data.name;
  user.lastPost = data.lastPost;
  user.avatar = data.avatar;
  user.active = data.active;
  
  document.querySelector('#user').textContent = `User [${user.name}]`;
  
  document.querySelector('#roomSelect').classList.remove('hidden');
  document.querySelector('#login').classList.add('hidden');
}; //logs user in to room [on 'loggedIn']

const loginFail = (data) => {
  document.querySelector('#nameBox').placeholder= 'This username is taken.'
}; //logs user in to room [on 'login']

const handleMessage = (data) => {
  importCanvas(data);
} //handle update drawing msg from server

const submitData = () => {
  if(draw.box.isActive){
    sendBufferCanvas = document.createElement('canvas');
    sendBufferCanvas.height = 120;
    sendBufferCanvas.width = 320;
    //copy canvas
    sendBufferCtx = sendBufferCanvas.getContext('2d');
    //sendBufferCtx.drawImage(canvas,0,0);
    sendBufferCtx.drawImage(canvas, draw.box.x, draw.box.y, draw.box.width, draw.box.height, 0, 0, 320, 120);
    
    //server image
    const data = {
      name: user.name,
      x: draw.box.x,
      y: draw.box.y,
      height: draw.box.height,
      width: draw.box.width,
      imgData: sendBufferCanvas.toDataURL()
    };
    
    socket.emit('submit' , data);
  }
}; //send canvas data to server

const updateImage = (data) => {
  let image = new Image();
  
  image.onload = () => {
    if(data.name === user.name) {
      user.avatar.lastPost = data;
      user.avatar.lastPost.image = image;
    } else {
      players[data.name].lastPost = data;
      players[data.name].lastPost.image = image;
    }
  };
  
  image.src = data.imgData;
  
}; //get and show last updated image [on 'addedImage]

const setupCanvas = () => {
  canvas = document.querySelector("#drawCanvas");
  ctx = canvas.getContext("2d");
  canvas_top = document.querySelector("#overlayCanvas");
  ctx_top = canvas_top.getContext('2d');
  canvas_back = document.querySelector("#mainCanvas");
  ctx_back = canvas_back.getContext('2d');
  
  sendBufferCanvas = document.createElement('canvas');
  sendBufferCanvas.height = 200;
  sendBufferCanvas.width = 200;
  sendBufferCtx = sendBufferCanvas.getContext('2d');
  
  draw.box.x = canvas.width/2 - 160,
  draw.box.y = canvas.height/2 - 80,
  
  clearCanvas();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx_top.clearRect(0,0,canvas_top.width,canvas_top.height);
  
  chatButton = {
    x: canvas.width - 84,
    y: 5,
    height: 25,
    width: 80,
    color: 'red',
    color_a: '#9268ef',
    color_b: '#767676',
    pressed: false,
    text_a: 'CHAT [-]',
    text_b: 'CHAT [x]',
    textColor: '#efefef'
  };
  clearButton = {
    x: 4,
    y: 5,
    height: 25,
    width: 80,
    color: '#9268ef',
    pressed: false,
    text: 'Clear',
    textColor: '#efefef'
  };
  postButton = {
    x: canvas.width- 84,
    y: 27 + chatButton.height/2,
    height: 25,
    width: 80,
    color: '#9268ef',
    pressed: false,
    text: 'Post',
    textColor: '#efefef'
  };
}

//update players locations
const update = (data) => {

  if(!players[data.name]) {
    players[data.name] = data;
    
    if(players[data.name].lastPost != undefined){
      let image = new Image();
    
      image.onload = () => {
      if(data.name === user.name) {
        user.avatar.lastPost = data;
        user.avatar.lastPost.image = image;
      } else {
        players[data.name].lastPost = data.lastPost;
        players[data.name].lastPost.image = image;
      }
      };
    
      image.src = data.lastPost.imgData;
    }
    return;
  }
  
  const player = players[data.name]; 

  //check if data is old
  if(players[data.name].lastUpdate >= data.lastUpdate) {
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
}

//remove player from list
const removeUser = (name) => {
  if(players[name]) {
	delete players[name];
    console.log('removed');
    socket.emit('getPlayersInRoom', user.room );
  }
};

//update player position
const updatePosition = () => {
  //console.dir(user.avatar);
  const player = user.avatar;
  
  //advance positions
  player.prevX = player.x;
  player.prevY = player.y;
  //check upper area bounds
  if(player.moveUp && player.destY > 0) {
    player.destY -= 2;
  }
  
  //check lower area bounds
  if(player.moveDown && player.destY - player.height/2 < 400) {
    player.destY += 2;
  }
  
  //check left area bounds
  if(player.moveLeft && player.destX > 0) {
    player.destX -= 2;
  }
  
  //check right area bounds
  if(player.moveRight && player.destX < 400) {
    player.destX += 2;
  }
  
  //if user is moving and left
  if(player.moveUp && player.moveLeft) player.direction = directions.UPLEFT;
  
  //if user is moving up and right
  if(player.moveUp && player.moveRight) player.direction = directions.UPRIGHT;
  //if user is moving down and left
  if(player.moveDown && player.moveLeft) player.direction = directions.DOWNLEFT;
  //if user is moving down and right
  if(player.moveDown && player.moveRight) player.direction = directions.DOWNRIGHT;
  //if user is just moving down
  if(player.moveDown && !(player.moveRight || player.moveLeft)) player.direction = directions.DOWN;
  //if user is just moving up
  if(player.moveUp && !(player.moveRight || player.moveLeft)) player.direction = directions.UP;
  //if user is just moving left
  if(player.moveLeft && !(player.moveUp || player.moveDown)) player.direction = directions.LEFT;
  //if user is just moving right
  if(player.moveRight && !(player.moveUp || player.moveDown)) player.direction = directions.RIGHT;
  
  //reset animation alpha
  player.alpha = 0;
  
  socket.emit('movementUpdate', player);
};

//draw objects
const redraw = (time) => {
  //update current user position
  if(user.active) updatePosition();
  
  //clear screen
  ctx_back.clearRect(0, 0, canvas_back.width, canvas_back.height);
  
  //loop through players
  const keys = Object.keys(players);
  for(let i = 0; i < keys.length+1; i++) {
    let player;
    if(i === keys.length){
      player = user.avatar;
    }
    else {
      player = players[keys[i]];
    }
    
    //advance animation alpha
    if(player.alpha < 1) player.alpha += 0.05;
    
    // make sure user is drawn on top
    //check if player is current user
    if(player.name === user.name) {
      ctx_back.filter = "none"
    }
    //otherwise we'll tint the image
    else {
      ctx_back.filter = "hue-rotate(40deg)";
    } 
    
    //lerp position
    player.x = lerp(player.prevX, player.destX, player.alpha);
    player.y = lerp(player.prevY, player.destY, player.alpha);
    
    //make sure proper animations are playing
    if(player.frame > 0 || (player.moveUp || player.moveDown || player.moveRight || player.moveLeft)) {
      player.frameCount++;
      
      //switch frames after time
      if(player.frameCount % 8 === 0) {
        //move through animation and loop
        if(player.frame < 7) {
          player.frame++;
        } else {
          player.frame = 0;
        }
      }
    }
    //draw current sprite
    ctx_back.drawImage(
      avatarImage,  
      player.width * player.frame,
      player.height * player.direction,
      player.width, 
      player.height,
      player.x,
      player.y,
      player.width, 
      player.height, 
    );
    
    //show sprite bounds
    //ctx_back.strokeRect(player.x, player.y, player.width, player.height);
    
      
    // draw posts
    if(player.lastPost && player.lastPost != undefined){
      ctx_back.drawImage(player.lastPost.image, 0, 0, player.lastPost.width, player.lastPost.height, player.x + player.width/2 - player.lastPost.width/4 , player.y - player.height/2, 160, 60);
      ctx_back.strokeStyle = 'black';
      ctx_back.strokeRect(player.x + player.width/2 - player.lastPost.width/4 ,player.y - player.height/2, 160, 60);
      
      ctx_back.lineWidth = 1.5;
      fillText(ctx_back, player.name, player.x + player.width/2 - player.lastPost.width/4 , player.y - player.height/2- 5, 'bold 13pt Trebuchet MS', 'black' ); 
    }
  }
};

const drawUI = () => {
  ctx_back.clearRect(0,0,canvas_back.width, canvas_back.height);
  if(user.active) redraw();
  
  
  ctx.filter = 'none';
   
  //draw buttons
  ctx_top.save();
    
  ctx_top.filter = 'none';
    
  if(draw.box.isActive){
    //chat button
    drawButton(chatButton, chatButton.text_b, chatButton.color_b);
  
    //post button
    drawButton(postButton);
    
    //clear button
    drawButton(clearButton); 
    
    //outline drawbox over drawing
    ctx_top.lineWidth = 1;
    ctx_top.strokeStyle = 'black';
    ctx_top.strokeRect(draw.box.x-1,draw.box.y-1,draw.box.width+1, draw.box.height+1);
    
    ctx_top.restore();
  
    //clip to draw box
    ctx.save();
    
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.fillRect(draw.box.x,draw.box.y,draw.box.width, draw.box.height); 
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = 'rgba(183, 183, 183, 0.23)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    
    ctx.restore();
  } else {
    drawButton(chatButton,chatButton.text_a, chatButton.color_a);
    
    ctx_top.restore()
  };
  
  requestAnimationFrame(drawUI);
};

const logout = () => {
  console.log(`[${user.name}] disconnected`);
  user.name= undefined;
  user = undefined;
  
  document.querySelector('#user').textContent = '[-disconnected-]';
  socket.disconnect();
  socket.close();
  
  document.querySelector('#login').classList.remove('hidden');
};

const updatePlayerList = (data) => {
    const playerList = document.querySelector('#usersList');
    playerList.innerHTML = '';
    
    const keys = Object.keys(data);
    for(let i = 0; i< keys.length; i++){
      let player = data[keys[i]];
      let temp = document.createElement('p');
      temp.id = `player_${player}`;
      
      temp.textContent = `${player}`;

      playerList.appendChild(temp);
    }
};

//-Setup----------------------------------

const init = () => {
  draw.stamp = document.querySelector('#img');
  avatarImage = document.querySelector('#walk');
  
  socket = io.connect();
  
  //when player connects to server
  socket.on('connect', () => {
    // get room list
    socket.emit('getRooms' , {} );
    
    socket.on('joinedRoom', (data) => {
      document.querySelector('#roomSelect').classList.add('hidden');
      document.querySelector('#usersActive').classList.remove('hidden');
      document.querySelector('#room').textContent = `- ${data.room} -`;
      user.active= true;
      
      socket.emit('getPlayersInRoom', user.room );
        
      //key events
      document.body.addEventListener('keydown', keyDownHandler);
      document.body.addEventListener('keyup', keyUpHandler);
      
      //when another player moves
      socket.on('updatedMovement', update);
      
      document.querySelector('#logout').onclick = logout;
    });

  });
  
  socket.on('disconnect', (data) => {
    console.log(`[${user.name}] disconnected`);
    user.name='';
    
    document.querySelector('#user').textContent = '[-disconnected-]';

    socket.disconnect();
    socket.close();
  }); 
  
  socket.on('roomList', (data) => {
    const roomList = document.querySelector('#roomList');
    roomList.innerHTML = '';
    
    const keys = Object.keys(data);
    for(let i = 0; i< keys.length; i++){
      let room = data[keys[i]];
      let temp = document.createElement('p');
      temp.classList = 'opt';
      temp.id = `room_${room.name}`;
      
      temp.textContent = `${room.name} [${room.numUsers} online]`;
      
      temp.onclick = (e) => {
        user.room = room.name;
        socket.emit('joinRoom', user );
      };
      
      roomList.appendChild(temp);
    }
    
  });
  
  socket.on('updatePlayerList', updatePlayerList);
  
  socket.on('updatedRoom', (data) => {
    if(!document.querySelector(`#room_${data.name}`)){
      let temp = document.createElement('p');
      temp.classList = 'opt';
      temp.id = `room_${data.name}`;
      
      temp.textContent = `${data.name} [${data.numUsers} online]`;
      
      temp.onclick = (e) => {
        user.room = data.name;
        socket.emit('joinRoom', user );
        console.log(user.room);
      };
      
      document.querySelector('#roomList').appendChild(temp);
    } else {
      document.querySelector(`#room_${data.name}`).textContent = `${data.name} [${data.numUsers} online]`;
    }
  });
  
  const testLogin = () => {
    let requested = document.querySelector('#nameBox');
    
    if(!requested.value || requested == '') {
      requested.placeholder = 'Please enter a username';
      return;
    }
    
    //randomize color
    draw.hueShift = parseInt(Math.random() * 1000);
    
    //request to login with name
    socket.emit('login' , {name: requested.value, rand: user.rand } );
    
    requested.value = '';
  };
  
  document.querySelector('#login').onclick = testLogin;
  document.querySelector('#addRoom').onclick = () => { socket.emit('addRoom', {})};
  
  //when player logged in
  socket.on('loggedIn', login);
  socket.on('nameTaken', loginFail);
  
  //when client logs out
  socket.on('leftRoom', removeUser);
  
  //when client recieves message from server
  socket.on('updated', handleMessage);
  
  //when another player 'speaks'
  socket.on('addedImage', updateImage);
  
  setupCanvas();
  
  //hook up events
  //document.querySelector("#submitUsername").onclick = login() ;
  document.querySelector("#drawMode").onchange = (e) => { draw.mode = e.target.value; };
  
  canvas_top.onmousedown = doOnMouseDown;
  canvas_top.onmousemove = doOnMouseMove;
  canvas_top.onmouseup = canvas_top.onmouseout= (e) => {
    
    if(draw.box.isActive){
      ctx.closePath();
      ctx_top.clearRect(0,0,canvas_top.width, canvas_top.height);
    }
    dragging= false;
  };
  
  //draw ui
  drawUI();
};

//-General--------------------------------

const doOnMouseDown = (e) => {
  const mouse = getMouse(e);
  dragging = true;
  if(user.active){
    //if inputting post
    if(draw.box.isActive){
      if(draw.mode === 'pen') {
        ctx.beginPath();
        ctx.moveTo(mouse.x,mouse.y);
      } else {
        ctx.filter = `hue-rotate(${draw.hueShift}deg)`;
        ctx.drawImage(draw.stamp,mouse.x-draw.stamp.width/2,mouse.y-draw.stamp.height/2);
      } 
    }
    
    //check button press [chat toggle]
    if(isInBounds(mouse, chatButton )) {
      if(chatButton.pressed){
        draw.box.isActive= false;
        chatButton.pressed = false;
        chatButton.color = 'red';
        
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx_top.clearRect(0,0,canvas_top.width,canvas_top.height);
        
      } else {
        draw.box.isActive= true;
        chatButton.pressed = true;
        chatButton.color = 'green';
        
        clearCanvas();
      }
    }
    if(draw.box.isActive){
      if(isInBounds(mouse,postButton)){
        submitData();
        
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx_top.clearRect(0,0,canvas_top.width,canvas_top.height);
        draw.box.isActive= false;
        chatButton.pressed = false;
        chatButton.color = 'red';
      }
      if(isInBounds(mouse,clearButton)){
        clearCanvas();
      }
    }
  }
};
const doOnMouseMove =(e) => {
  mouse = getMouse(e);
  
  if(draw.box.isActive){
    if(draw.mode === 'pen'){
      if(!dragging){ return; }
      
      ctx.filter = `hue-rotate(${draw.hueShift}deg)`;
      ctx.strokeStyle = draw.strokeStyle;
      ctx.lineWidth = draw.lineWidth;
      ctx.lineCap = 'round';
      ctx.lineTo(mouse.x,mouse.y);
      ctx.stroke();
      //draw.hueShift = (draw.hueShift + 1) % 359;
    } else {
      //overlay stamp
      ctx_top.clearRect(0,0,canvas_top.width, canvas_top.height);
      ctx_top.filter = `hue-rotate(${draw.hueShift}deg)`;
      ctx_top.drawImage(draw.stamp,mouse.x-draw.stamp.width/2,mouse.y-draw.stamp.height/2);
    }
    
  }
};

const getMouse = (e) => {
  var offset = canvas_top.getBoundingClientRect();
    return {
      x: e.clientX - offset.left,
      y: e.clientY - offset.top
    };
}
const clearCanvas = () => {
  ctx.clearRect(0,0,canvas.width, canvas.height);
  
  ctx.fillStyle = 'rgba(183, 183, 183, 0.23)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  
  ctx.lineWidth = 1;
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'black';
  ctx.fillRect(draw.box.x,draw.box.y,draw.box.width, draw.box.height);
  
  ctx_top.clearRect(0,0,canvas_top.width, canvas_top.height);
  ctx_top.strokeRect(draw.box.x-1,draw.box.y-1,draw.box.width+1, draw.box.height+1);

};
const importCanvas = (data) => {
  let image = new Image();
  let drawTo = data.ctx || ctx;
  
  image.onload = () => {
    drawTo.save();
    drawTo.globalCompositeOperation = data.layerStyle || 'source-over';
    drawTo.drawImage(image, data.x, data.y, data.width, data.height);
    drawTo.restore();
  };
  
  image.src = data.imgData;
};
const isInBounds = (point, bounds) => {
  if(point.y < bounds.y || point.y > bounds.y + bounds.height || point.x < bounds.x || point.x > bounds.x + bounds.width) {
    return false;
  }
  return true;
};
const fillText = (targetCtx, string, x, y, font, color, center) => {
	targetCtx.save();
    if(center){        
        targetCtx.textAlign='center';
        targetCtx.textBaseline='middle';
    };
	targetCtx.font = font;
	targetCtx.fillStyle = color;
	targetCtx.fillText(string, x, y);
	targetCtx.restore();
};
const drawRoundedRect = (x,y,w,h,amt, targetCtx, stroke) => {
  targetCtx.save();  
    //targetCtx.fillRect(x,y,w,h);
    if(amt*2 >= h) { amt = h/2; }
    if(amt*2 >= w) { amt = w/2; }

    w-=amt*2; 
    h-=amt*2; 

    targetCtx.beginPath ();
    targetCtx.moveTo (x + amt, y); //top left inner
    
    targetCtx.lineTo (x+w + amt, y); //top side
    targetCtx.quadraticCurveTo (x+w + amt*2, y , x+w+ amt*2, y + amt); //top right corner
    
    targetCtx.lineTo (x+w+amt*2, y+h + amt); //right side
    targetCtx.quadraticCurveTo (x+w + amt*2, y+h + amt*2, x+w + amt, y+h + amt*2); //bottom right corner
    
    targetCtx.lineTo (x+amt, y+h + amt*2); //bottom side
    targetCtx.quadraticCurveTo (x , y+h + amt*2, x, y+h + amt); //bottom right corner
    
    targetCtx.lineTo (x, y + amt); //left side
    targetCtx.quadraticCurveTo (x, y, x + amt, y); //bottom left corner
    
    targetCtx.fill ();
    if(stroke)targetCtx.stroke();
  targetCtx.restore();
};
const drawButton = (button, text, color) => {
  ctx_top.fillStyle = color || button.color;
  ctx_top.lineWidth = 1.5;
  drawRoundedRect(button.x, button.y, button.width,button.height, 3, ctx_top, true);
  fillText(ctx_top, text || button.text, button.x+button.width/2, button.y+button.height/2, 'bold 13pt Trebuchet MS', button.textColor || 'black', true ); 
};

//check if point is in circle bounds
const pointInsideCircle = (x,y, circle) =>{
    var dx = x - circle.x;
    var dy = y - circle.y;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
};
//check circle x circle intersections
const circlesIntersect = (c1, c2) => {
    var dx = c2.x - c1.x;
    var dy = c2.y - c1.y;
    var distance = Math.sqrt(dx*dx +dy*dy);
    return distance < c1.radius + c2.radius;
};

//handle key down
const keyDownHandler = (e) => {
  var keyPressed = e.which;
  
  //grab this user's object 
  const player = user.avatar;
  // W OR UP
  if(keyPressed === 87 || keyPressed === 38) {
    player.moveUp = true;
  }
  // A OR LEFT
  else if(keyPressed === 65 || keyPressed === 37) {
    player.moveLeft = true;
  }
  // S OR DOWN
  else if(keyPressed === 83 || keyPressed === 40) {
    player.moveDown = true;
  }
  // D OR RIGHT
  else if(keyPressed === 68 || keyPressed === 39) {
    player.moveRight = true;
  }

  //prevent page from moving
  if(player.moveUp || player.moveDown || player.moveLeft || player.moveRight) {
    e.preventDefault();
  }
};
//handle key up
const keyUpHandler = (e) => {
  //grab keycode from keyboard event
  var keyPressed = e.which;
  
  //grab this user's object
  const player = user.avatar;
  // W OR UP
  if(keyPressed === 87 || keyPressed === 38) {
    player.moveUp = false;
  }
  // A OR LEFT
  else if(keyPressed === 65 || keyPressed === 37) {
    player.moveLeft = false;
  }
  // S OR DOWN
  else if(keyPressed === 83 || keyPressed === 40) {
    player.moveDown = false;
  }
  // D OR RIGHT
  else if(keyPressed === 68 || keyPressed === 39) {
    player.moveRight = false;
  }       
};

//use to foce lag for testing
const sendWithLag = () => {
  socket.emit('movementUpdate', players[hash]);
};
const lerp = (v0, v1, alpha) => {
  return (1 - alpha) * v0 + alpha * v1;
};

//-Set onload-----------------------------
window.onload = init;