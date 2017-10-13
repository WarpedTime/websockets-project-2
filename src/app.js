const http = require('http');
const socketio = require('socket.io');
const fs = require('fs');

const PORT = process.env.PORT || process.env.NODE_PORT || 3000;

const handler = (req, res) => {
  if (req.url === '/bundle.js') {
    fs.readFile(`${__dirname}/../hosted/bundle.js`, (err, data) => {
      if (err) {
        throw err;
      }
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(data);
    });
  } else if (req.url === '/img.png') {
    fs.readFile(`${__dirname}/../hosted/img.png`, (err, data) => {
      if (err) {
        throw err;
      }
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(data);
    });
  } else {
    fs.readFile(`${__dirname}/../hosted/client.html`, (err, data) => {
      if (err) {
        throw err;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  }
};

const app = http.createServer(handler);
const io = socketio(app);

app.listen(PORT);

const images = {};
const users = {};
let lastImage;

io.on('connection', (socket) => {
  socket.join('room1');

  socket.on('draw', (data) => {
    io.sockets.in('room1').emit('updated', data);
  });

  socket.on('submit', (data) => {
    images[data.name] = data;
    lastImage = data;
    io.sockets.in('room1').emit('addedImage', data);
  });

  socket.on('join', (data) => {
    if (!users[data.user]) {
      users[data.user] = {
        name: data.user,
      };

      const msg = {
        name: data.user,
        lastImage,
      };
      // send name to user
      socket.emit('login', msg);
    }
    // console.dir(users);
  });

  socket.on('disconnect', () => {
    socket.leave('room1');
  });
});

console.log(`listening on port ${PORT}`);
