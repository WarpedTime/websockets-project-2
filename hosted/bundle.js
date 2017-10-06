"use strict";

var socket = void 0;
var canvas = void 0;
var ctx = void 0;
var canvas_server = void 0;
var ctx_server = void 0;
var sendBufferCanvas = void 0;
var sendBufferCtx = void 0;
var canvas_top = void 0;
var ctx_top = void 0;
var dragging = false;

var user = parseInt(Math.random() * 1000);
var draw = {
  fillStyle: 'red',
  strokeStyle: 'cyan',
  lineWidth: 3,
  hueShift: parseInt(Math.random() * user),
  kip: undefined,
  stamp: undefined,
  mode: 'pen'
};

var getMouse = function getMouse(e) {
  var offset = canvas_top.getBoundingClientRect();
  return {
    x: e.clientX - offset.left,
    y: e.clientY - offset.top
  };
};

var setup = function setup() {
  sendBufferCanvas = document.createElement('canvas');
  sendBufferCanvas.height = 200;
  sendBufferCanvas.width = 200;
  sendBufferCtx = sendBufferCanvas.getContext('2d');

  canvas_top = document.querySelector("#topCanvas");
  ctx_top = canvas_top.getContext('2d');

  clearCanvas();
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
var handleMessage = function handleMessage(data) {
  importCanvas(data);
};

var submitData = function submitData() {
  sendBufferCanvas = document.createElement('canvas');
  sendBufferCanvas.height = canvas.height;
  sendBufferCanvas.width = canvas.width;
  //copy canvas
  sendBufferCtx = sendBufferCanvas.getContext('2d');
  sendBufferCtx.drawImage(canvas, 0, 0);

  //server image
  var data = {
    name: user,
    x: 0,
    y: 0,
    height: canvas.height,
    width: canvas.width,
    imgData: sendBufferCanvas.toDataURL()
  };

  socket.emit('submit', data);
};

var login = function login(data) {
  user = data.name;
  document.querySelector('#user').textContent = 'User [' + user + ']';
  if (data.lastImage) lastImage(data.lastImage);
};

var lastImage = function lastImage(data) {

  ctx_server.clearRect(0, 0, canvas_server.width, canvas_server.height);

  var image = new Image();

  image.onload = function () {
    ctx_server.save();
    ctx_server.drawImage(image, data.x, data.y, data.width / 2, data.height / 2);
    ctx_server.restore();
  };

  image.src = data.imgData;
  document.querySelector('#last').textContent = 'Last image: user [' + data.name + ']';
};

var clearCanvas = function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx_top.clearRect(0, 0, canvas_top.width, canvas_top.height);
};

var init = function init() {
  canvas = document.querySelector("#canvas");
  ctx = canvas.getContext("2d");
  canvas_server = document.querySelector("#canvas-server");
  ctx_server = canvas_server.getContext("2d");
  socket = io.connect();
  setup();

  socket.on('connect', function () {
    //socket.emit('draw', {name:user, coords: draws[user]});
    //draw();
    socket.emit('join', { user: user });
  });
  socket.on('updated', handleMessage);
  socket.on('login', login);
  socket.on('addedImage', lastImage);

  document.querySelector("#submit").onclick = submitData;
  document.querySelector("#clear").onclick = clearCanvas;
  document.querySelector("#drawMode").onchange = function (e) {
    draw.mode = e.target.value;
  };

  draw.stamp = document.querySelector('#img');

  canvas_top.onmousedown = function (e) {
    var mouse = getMouse(e);
    dragging = true;

    if (draw.mode === 'pen') {
      ctx.beginPath();
      ctx.moveTo(mouse.x, mouse.y);
    } else {
      ctx.filter = 'hue-rotate(' + draw.hueShift + 'deg)';
      ctx.drawImage(draw.stamp, mouse.x - draw.stamp.width / 2, mouse.y - draw.stamp.height / 2);
    }
  };

  canvas_top.onmousemove = function (e) {
    var mouse = getMouse(e);

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
  };

  canvas_top.onmouseup = canvas_top.onmouseout = function (e) {
    ctx.closePath();
    ctx_top.clearRect(0, 0, canvas_top.width, canvas_top.height);
    dragging = false;
  };
};

window.onload = init;
