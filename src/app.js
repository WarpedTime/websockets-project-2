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
  } else if (req.url === '/walk.png') {
    fs.readFile(`${__dirname}/../hosted/walk.png`, (err, data) => {
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

const users = {};
const rooms = {
  lobby: {
    name: 'lobby',
    numUsers: 0,
    users: {},
  },
  num: 0,
};


io.on('connection', (soc) => {
  const socket = soc;
  socket.join('lobby');
  socket.room = 'lobby';
  rooms.lobby.numUsers ++;

  socket.on('draw', (data) => {
    io.sockets.in('room1').emit('updated', data);
  });

  socket.on('submit', (data) => {
    users[data.name].lastPost = data;

    io.sockets.in(socket.room).emit('addedImage', data);
  });

  socket.on('getRooms', () => {
    const roomList = {};

    const keys = Object.keys(rooms);
    for (let i = 0; i < keys.length; i++) {
      if (rooms[keys[i]].numUsers > 0 && keys[i] !== 'lobby') {
        roomList[keys[i]] = {
          name: rooms[keys[i]].name,
          numUsers: rooms[keys[i]].numUsers,
        };
      }
    }

    socket.emit('roomList', roomList);
  });

  socket.on('addRoom', () => {
    rooms.num ++;
    const name = `room${rooms.num}`;

    rooms[name] = {
      name,
      numUsers: 0,
      users: {},
    };

    console.log(`${socket.name} joined room ${name}.`);
    socket.leave('lobby');
    rooms.lobby.numUsers --;

    socket.room = name;
    rooms[socket.room].numUsers = 1;
    socket.join(socket.room);

    socket.emit('joinedRoom', { room: socket.room });
    io.sockets.in('lobby').emit('updatedRoom', { name: socket.room, numUsers: rooms[socket.room].numUsers });

    rooms[socket.room].users[socket.name] = socket.name;
    io.sockets.in(socket.room).emit('updatePlayerList', rooms[socket.room].users);
  });

  socket.on('joinRoom', (data) => {
    console.log(`${data.name} joined room ${data.room}.`);
    socket.leave('lobby');
    rooms.lobby.numUsers --;

    socket.room = data.room;
    rooms[socket.room].numUsers ++;
    socket.join(socket.room);
    socket.emit('joinedRoom', { room: socket.room });

    io.sockets.in('lobby').emit('updatedRoom', { name: socket.room, numUsers: rooms[socket.room].numUsers });

    rooms[socket.room].users[socket.name] = socket.name;
    io.sockets.in(socket.room).emit('updatePlayerList', rooms[socket.room].users);
  });

  socket.on('login', (data) => {
    if (!users[data.name] || users[data.name] === undefined) {
      users[data.name] = {
        name: data.name,
        lastPost: undefined,
        active: false,
        avatar: undefined,
      };

      users[data.name].avatar = {
        name: data.name,
        lastUpdate: new Date().getTime(),
        x: 0,
        y: 0,
        prevX: 0,
        prevY: 0,
        destX: 0,
        destY: 0,
        alpha: 0,
        height: 121,
        width: 61,
        direction: 0,
        frame: 0,
        frameCount: 0,
        moveLeft: false,
        moveRight: false,
        moveDown: false,
        moveUp: false,
        lastPost: undefined,
      };

      // send name to user
      socket.name = data.name;
      socket.emit('loggedIn', users[data.name]);
    } else {
      // send name to user
      socket.emit('nameTaken', { name: data.name });
    }
    // console.dir(users);
  });

  socket.on('getPlayersInRoom', () => {
    io.sockets.in(socket.room).emit('updatePlayerList', rooms[socket.room].users);
  });

  socket.on('movementUpdate', (data) => {
    users[socket.name].avatar = data;
    users[socket.name].avatar.lastUpdate = Date.now();
    socket.broadcast.to(socket.room).emit('updatedMovement', users[socket.name].avatar);
    // io.sockets.in('room1').emit('updatedMovement', socket.square);
  });

  socket.on('disconnect', () => {
    console.log(`${socket.name} disconnected from ${socket.room}`);

    const room = socket.room.toString();
    io.sockets.in(socket.room).emit('leftRoom', socket.name);

    // set user as inactive
    users[socket.name] = undefined;
    rooms[socket.room].numUsers --;

    io.sockets.in('lobby').emit('updatedRoom', { name: socket.room, numUsers: rooms[socket.room].numUsers });
    socket.leave(socket.room);
    socket.disconnect();

    if (rooms[socket.room].users[socket.name]) delete rooms[socket.room].users[socket.name];
    io.sockets.in(room).emit('updatePlayerList', rooms[room].users);
  });
});

console.log(`listening on port ${PORT}`);
