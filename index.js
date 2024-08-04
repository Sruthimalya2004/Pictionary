const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require("path");
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('../models/User');

const tempelatePath = path.join(__dirname, '../templates')
const publicPath = path.join(__dirname, '../public')

app.set('view engine', 'hbs');
app.set('views', tempelatePath)
app.use(express.static(publicPath))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/pictionaryUsers', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Timer functionality
let timerInterval;
let seconds = 60; // Start from 60 seconds
let minutes = 0;
let socketId=0;
let flag =0;
let flag1=0;
let flag2=0;
let connectedPlayers = [];
let drawingHistory = [];
let connectedPlayersMap = {};
let word = "";

// Function to handle drawing data received from clients
function handleDrawing(data) {
  // Push the drawing data into the drawing history
  drawingHistory.push(data);
  // Broadcast the drawing data to all connected clients
  io.emit('drawing', data);
}

// Function to send the drawing history to a newly connected client
function sendDrawingHistory(socket) {
  // Send the drawing history to the newly connected client
  drawingHistory.forEach(data => {
      socket.emit('drawing', data);
  });
}

app.get('/', async (req, res) => {
  try { 
    res.render('login');
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/submit-name', (req, res) => {
  const playerName = req.body.playerName;
  connectedPlayers.push(playerName);
  res.redirect('/home'); // Redirect to home page after processing the name
});

app.get('/home', async (req, res) => {
  try {
    res.render('home');
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).send('Internal Server Error');
  }
});

async function addToDB(playerName, socketid) {
  try {
    // Save the player name and room number to MongoDB
    const newUser = new User({ name: playerName, room: 1, socketid: socketid });
    await newUser.save();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving user to database');
  }
}

async function deleteFromDB(socketid) {
  try {
    // Save the player name and room number to MongoDB
    const result = await User.findOneAndDelete({ socketid: socketid });
      if (result) {
          console.log("Document deleted successfully");
      } else {
          console.log("Document not found or could not be deleted");
      }
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving user to database');
  }
}

io.on('connection', socket => {
    console.log('A user connected');
    console.log(socket.id);
    // Emit updated player list to the newly connected client
    const playerName = connectedPlayers.pop();
    connectedPlayersMap[socket.id] = {playerName: playerName, drawing: false, score:0 };
    io.emit('updatePlayerList', connectedPlayersMap);
    addToDB(playerName,socket.id);
    if(flag2==0)
    {
      socketId = socket.id;
      connectedPlayersMap[socketId].drawing = true;
      io.to(socketId).emit('switchDrawingPlayer');
     // io.emit('switchDrawingPlayer', currentPlayer);
    }
    else
    {
      for (const socketIds in connectedPlayersMap) {
        if (socketId !== socketIds) {
          // Emit the data to the current socket ID
          console.log("socket Id "+socketId);
          console.log("socket Ids "+socketIds);
          io.to(socketIds).emit('drawer', {name: connectedPlayersMap[socketId].playerName});
      }
    }
    }
    if(flag==0)
    {
      startTimer();
    }
    flag2=1;
      // Modify your disconnect event handler
      socket.on('disconnect', () => {
        console.log('A user disconnected');
        console.log(socket.id);
        const playerName = connectedPlayersMap[socket.id];
        if (playerName) {
            if(Object.keys(connectedPlayersMap).length>1 && socket.id == socketId)
            {
              const playerIds = Object.keys(connectedPlayersMap);
              const currentIndex = playerIds.indexOf(socketId);
              const nextIndex = (currentIndex + 1) % playerIds.length;
              const nextSocketId = playerIds[nextIndex];
              currentPlayer = connectedPlayersMap[nextSocketId];
              connectedPlayersMap[socketId].drawing = false;
              socketId = nextSocketId;
              connectedPlayersMap[socketId].drawing = true;
              seconds = 60;
              io.to(socketId).emit('switchDrawingPlayer');
              console.log(socketId);

              for (const socketId in connectedPlayersMap) {
                if (socketId !== nextSocketId) {
                  // Emit the data to the current socket ID
                  io.to(socketId).emit('drawer', {name: connectedPlayersMap[nextSocketId].playerName});
              }
              }

              if(flag1==0)
                startTimer();
              console.log(connectedPlayersMap);
            }
            delete connectedPlayersMap[socket.id];
            // Emit updated player list to all clients
            io.emit('updatePlayerList', connectedPlayersMap);
        }
        deleteFromDB(socket.id);

      });
    sendDrawingHistory(socket);


    socket.on('drawing', (data) => {
      handleDrawing(data);
  });

      // Listen for clear canvas message from clients
    socket.on('clearCanvas', () => {
      // Broadcast the clear canvas message to all clients
      io.emit('clearCanvas');
      drawingHistory = [];
    });

    // Listen for player name submission
    socket.on('submitName', (playerName) => {
      // Store the player name associated with the socket
      socket.playerName = playerName;
      // Add the player name to the array
      connectedPlayers.push(playerName);
      // Emit updated player list to all clients
      io.emit('updatePlayerList', connectedPlayersMap);
  });

  socket.on('canvasColour', (data) => {
    io.emit('canvasColour',data);
  });

  socket.on('guess', (data) => {
    const data1 = connectedPlayersMap[socket.id];
    console.log(data.guess);
    if(data.guess == word){
      io.emit('guess',{guess: data.guess, playerName: data1.playerName,});
      connectedPlayersMap[socket.id].score += (seconds*2);
      io.emit('updatePlayerList', connectedPlayersMap);
    }
    else{
      io.emit('guess',{guess: data.guess, playerName: data1.playerName});
    }
  });

  socket.on('word', (data) => {
    word = data.word;
    console.log(word);

  });

});

function startTimer() {
  timerInterval = setInterval(() => {
      flag=1;
      flag1=1;
      seconds--;
      if (seconds < 0) {
          if (minutes > 0) {
              minutes--;
              seconds = 59;
          } else {
              clearInterval(timerInterval);
              flag1=0;
              switchToNextPlayer();
              return;
          }
      }
      // Emit timer updates to all connected clients
      io.emit('timer', { minutes, seconds });
  }, 1000);
}

function switchToNextPlayer() {
  if(Object.keys(connectedPlayersMap).length > 1){
    const playerIds = Object.keys(connectedPlayersMap);
    const currentIndex = playerIds.indexOf(socketId);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    const nextSocketId = playerIds[nextIndex];
    currentPlayer = connectedPlayersMap[nextSocketId];
    connectedPlayersMap[socketId].drawing = false;
    io.to(socketId).emit('switch');

  for (const socketId in connectedPlayersMap) {
    if (socketId !== nextSocketId) {
      // Emit the data to the current socket ID
      io.to(socketId).emit('drawer', {name: connectedPlayersMap[nextSocketId].playerName});
  }
  }
    socketId = nextSocketId;
    connectedPlayersMap[socketId].drawing = true;
    io.to(socketId).emit('switchDrawingPlayer');
    //io.emit('switchDrawingPlayer');
    seconds = 60;
    console.log(connectedPlayersMap);
    startTimer(); // Restart the timer
}
  else{
    seconds = 60;
    startTimer();
  }

}
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});