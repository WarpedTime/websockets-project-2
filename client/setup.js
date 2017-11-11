//--vars-----------------------------region
let bgTracks = {
  building101: { src: 'assets/audio/101Building (Kerning Square).mp3', lastTime: 0 },
  floralLife: { src: 'assets/audio/Floral Life (Henesys).mp3', lastTime: 0 },
  restNpeace: { src: 'assets/audio/Rest \'N Peace (Henesys).mp3', lastTime: 0 },
  current: { }
}
let effectSounds = ["1.mp3","2.mp3","3.mp3","4.mp3","5.mp3","6.mp3","7.mp3","8.mp3"];

//image preloading vv
let loadQueue = -1;
let numLoaded = 0;

const toLoadImgs = [
  {
    name: 'logo',
    url: 'assets/img/logo.png'
  },
  {
    name: 'red',
    url: 'assets/img/box-red.png'
  },
  {
    name: 'blue',
    url: 'assets/img/box-blue.png'
  },
  {
    name: 'green',
    url: 'assets/img/box-green.png'
  },
  {
    name: 'orange',
    url: 'assets/img/box-orange.png'
  },
  {
    name: 'yellow',
    url: 'assets/img/box-yellow.png'
  },
  {
    name: 'black',
    url: 'assets/img/box.png'
  },
  {
    name: 'purple',
    url: 'assets/img/box-purple.png'
  },
  {
    name: 'pink',
    url: 'assets/img/box-pink.png'
  },
];
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
  document.onkeydown = (e) => {
    keys[e.keyCode] = true;
    e.preventDefault(); //todo restrict to used keys
  };
  document.onkeyup = (e) => {  keys[e.keyCode] = false;
  };
};

const preloadLoop = () => {
  if(loadQueue == numLoaded){
    startupLoop();
    canvas_overlay.onmousedown = (e) => { setupGame(); };
    document.onkeyup = (e) => { setupGame() };
    return;
  }
  
  ctx.fillStyle = 'black';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '15pt Courier';
  ctx.fillStyle = 'white';
  ctx.fillText('Loading App...', canvas.width/2,canvas.height/2);
  
  requestAnimationFrame(preloadLoop);
};
const startupLoop = () => {
  
  ctx.fillStyle = 'black';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  
  ctx.fillStyle = 'black';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'white';
  ctx.font = '30pt Courier';
  ctx.fillText('BoxLand', canvas.width/2,canvas.height/2-10);
  ctx.font = '15pt Courier';
  ctx.fillText('- Click or press any button to play! -', canvas.width/2,canvas.height/2+40);
  ctx.drawImage(IMAGES.logo.img, canvas.width/2-25,canvas.height/2-100);
  
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
  if(loadQueue === -1) loadQueue = 0;
  targetList.toloadcount = 0;
  targetList.loadcount = 0;
  
  
  for(let i = 0; i< imgArr.length; i++){
    let data = imgArr[i];
    
    let img = new Image();
    img.src = data.url;
    targetList.toloadcount ++;
    loadQueue++;
    //console.log(`toloadcount: ${targetList.toloadcount}`);
    
    img.onload = (e) => {      
      targetList[data.name] = {
        img: img,
        name: data.name,
        height: img.naturalHeight,
        width: img.naturalWidth,
      }
      if(data.animData) targetList[data.name].animData = data.animData;
      
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
  bgAudio.volume=0.25;
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
  if(reset) bgAudio.currentTime = bgTracks.current.lastTime = 0;
  bgAudio.play();
};

const stopBgAudio = () => {
  bgAudio.pause();
  bgAudio.currentTime = 0;
};

const playEffect = () => {
  currentEffect = Math.round(Math.random()*8)-1;
  if(currentEffect<0)currentEffect=0;
  effectAudio.src = "assets/audio/" + effectSounds[currentEffect];
  //console.log(currentEffect);
  effectAudio.play();
};

//endregion


