class Player {
  constructor(hash) {
    this.hash = hash;
    this.lastUpdate = new Date().getTime();
    this.x = 0;
    this.y = 0;
    this.prevX = 0;
    this.prevY = 0;
    this.destX = 0;
    this.destY = 0;
    this.height = 5;
    this.width = 5;
    this.alpha = 0;
    this.fillStyle: 'red';
    this.speed: 3;
    this.velX: 0;
    this.velY: 0;
    this.jumping: false;
    this.grounded: false;
    this.image: undefined;
  }
}

module.exports = Player;