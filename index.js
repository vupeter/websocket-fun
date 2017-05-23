const WebSocketServer = require('uws').Server;
let wss = new WebSocketServer({ port: 7331 });

cw = 10;
w = 100;
h = 75;


// Set up grid
let grid;

const defaultPlayer = {
    direction: 'left',
    tail: [],
    color: 'watever'
}

let players = {};

let food = {};

var foodCounter = 0;


const gameLoop = function(){

    grid = [];
    for(let i=0; i < w; i++){
        grid.push([]);    
        for(let j=0; j<h; j++){
            grid[i].push(null);
        }
    }

    for(let id in players){
        let player = players[id];
        let snake = player.snake;

        for(let segment of snake){
            grid[segment.x][segment.y] = {};
        }
    }

    for(let id in food){
        grid[food[id].x][food[id].y] = {id,food:true};
    }

    let killList = [];

    for(let id in players){
        let player = players[id];
        let snake = player.snake;

        let d = player.direction;
        let nx = snake[0].x;
        let ny = snake[0].y;

        if (d == "right") nx++;
        else if (d == "left") nx--;
        else if (d == "up") ny--;
        else if (d == "down") ny++;

        if (nx == -1 || nx == w || ny == -1 || ny == h){
            killList.push(id);
            continue;
        }

        let block = checkBlock(nx, ny);

        let tail;

        if(block == 'empty'){
            tail = snake.pop(); //pops out the last cell
            tail.x = nx;
            tail.y = ny;
        } else if(block == 'food'){
            tail = {
                x: nx,
                y: ny
            };
        } else {
            // Collision
            killList.push(id);
            continue;
        }
        
        snake.unshift(tail);

    }

    for(let id of killList){
        if(players[id]) {
            let start = randomStart();
            players[id].direction = start.direction;
            players[id].snake = [{x:start.x, y:start.y}];
        }
        
    }

    foodCheck();

    sendGameState();
}

 
wss.on('connection', function(ws) {
    ws.on('message', onMessage, ws);
    ws.on('close', close);
});

function sendGameState(){
    wss.clients.forEach(function each(client) {
        client.send(JSON.stringify({players,food}));
    });
}

function onMessage(messageString, ws) {
    var message = JSON.parse(messageString);

    if(message.close) return close(message.userId);
    if(message.create) return create(message);

    players[message.userId].direction = message.direction;
    
}


const foodCheck = function(){
    // console.log('is this running')
    if(wss.clients.length > Object.keys(food).length) createFood();
}


const createFood = function(){
    food[foodCounter] = {
        x: Math.round(Math.random() * w),
        y: Math.round(Math.random() * h),
    };

    foodCounter ++;
}

const checkBlock = function(x,y){
    if(grid[x][y]){
        if(grid[x][y].food) {
            
            var id = grid[x][y].id

            delete food[id];

            grid[x][y] = null;
            
            return 'food'
        }
        return null;
    }

    return 'empty';
}
 
const close = function(userId){
    if(players[userId]) delete players[userId];
}

const create = function(user){
    let start = randomStart();

    players[user.userId] = {
        color: user.color,
        direction: start.direction,
        snake: [{x:start.x, y: start.y}]
    }
}

const surroundingsClear = function(x,y){
    for(let i=x-5; i<x+5;i++){
        for(let j = y-5; j < y+5; j++){
            console.log(i)
            if(grid[i][j]) return false;
        }
    }
    return true;
}

const randomStart = function(){
    let startX = Math.floor(Math.random()*(w -10)) + 5;
    let startY = Math.floor(Math.random()*(h -10)) + 5;
    let direction = Math.floor(Math.random()*4);

    let directions = ['left', 'up', 'right', 'down'];

    if(!surroundingsClear(startX, startY)) return randomStart();

    return {x: startX, y: startY, direction: directions[direction]};
}

setInterval(gameLoop, 50);