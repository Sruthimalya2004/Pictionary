const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let isDrawing = false;
let lastX = 0;
let lastY = 0;
let strokeColor = '#000000';
let lineWidth = 2;
let strokes = []; // Array to store drawn strokes
let word ="";

// Listen for timer updates from the server
socket.on('timer', ({ minutes, seconds }) => {
    const formattedTime = padNumber(minutes) + ":" + padNumber(seconds);
    document.getElementById("timer").innerText = formattedTime;
});

// Function to pad numbers with leading zeros
function padNumber(num) {
    return (num < 10 ? "0" : "") + num;
}

// Chat history functionality
function addMessageToChatHistory(message) {
    const chatHistoryElement = document.getElementById("chatHistory");
    const messageElement = document.createElement("div");
    messageElement.textContent = message;
    chatHistoryElement.appendChild(messageElement);
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mousemove', draw);
document.getElementById('colorPicker').addEventListener('change', changeColor);
document.getElementById('lineWidthRange').addEventListener('change', changeLineWidth);
document.getElementById('clearCanvas').addEventListener('click', clearCanvas);
document.getElementById('undoStroke').addEventListener('click', undoStroke);
document.getElementById('erase').addEventListener('click', erase);
document.getElementById('fillColorPicker').addEventListener('change', changeCanvasColor);


function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
    isDrawing = false;
    ctx.beginPath();
    // Store drawn stroke
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    strokes.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

function draw(e) {
    if (!isDrawing) return;

    socket.emit('drawing', {
        prevX: lastX,
        prevY: lastY,
        currentX: e.offsetX,
        currentY: e.offsetY,
        color: strokeColor,
        width: lineWidth
    });

    drawOnCanvas({ prevX: lastX, prevY: lastY, currentX: e.offsetX, currentY: e.offsetY, color: strokeColor, width: lineWidth });
    [lastX, lastY] = [e.offsetX, e.offsetY];
}

function changeColor(e) {
    strokeColor = e.target.value;
}

function changeLineWidth(e) {
    lineWidth = e.target.value;
}

function undoStroke() {
    if (strokes.length > 0) {
        strokes.pop(); // Remove the last drawn stroke
        redrawCanvas();
        
        // Reset lastX and lastY to the end of the previous stroke
        if (strokes.length > 0) {
            const lastStroke = strokes[strokes.length - 1];
            const lastPointIndex = lastStroke.data.length - 4; // Last point index (x, y)
            lastX = lastStroke.data[lastPointIndex];
            lastY = lastStroke.data[lastPointIndex + 1];
        } else {
            lastX = 0;
            lastY = 0;
        }
    }
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas first
    console.log(strokes);
    strokes.forEach(stroke => {
        ctx.putImageData(stroke, 0, 0); // Redraw all remaining strokes
    });
}

function erase() {
    strokeColor = document.getElementById('fillColorPicker').value; 
}

function changeCanvasColor(e) {
    canvas.style.backgroundColor = e.target.value;
    socket.emit('canvasColour',{colour: e.target.value});
}

socket.on('canvasColour', (data) => {
    // Call function to draw received data on the canvas
    canvas.style.backgroundColor = data.colour;
});

socket.on('drawing', (data) => {
    // Call function to draw received data on the canvas
    drawOnCanvas(data);
}); 

// Function to draw on canvas
function drawOnCanvas(data) {
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.width;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(data.prevX, data.prevY);
    ctx.lineTo(data.currentX, data.currentY);
    ctx.stroke();

    ctx.closePath();
}

// Get color buttons
const colorButtons = document.querySelectorAll('.color-button');

// Set stroke color when a color button is clicked
colorButtons.forEach(button => {
    button.addEventListener('click', () => {
        const color = button.dataset.color;
        changeColor({ target: { value: color } }); // Call changeColor function with selected color
    });
});
// Define your set of words
const words = ["apple", "banana", "carrot", "dragon", "elephant", "fish"];

// Function to generate a random word from the set
function generateRandomWord() {
    const randomIndex = Math.floor(Math.random() * words.length);
    return words[randomIndex];
}

// Function to display a single random word in the container
function displayRandomWord() {

    const container1 = document.getElementById("drawguess");
    container1.innerHTML = "Draw the Word";
    
    const container = document.getElementById("wordContainer");
    container.innerHTML = ""; // Clear previous content

    // Generate and display a random word
    word = generateRandomWord();
    const wordElement = document.createElement("p");
    wordElement.textContent = word;
    container.appendChild(wordElement);

}

document.getElementById('clearCanvas').addEventListener('click', () => {
    // Emit a message to the server to clear the canvas
    socket.emit('clearCanvas');
});

// Listen for clear canvas message from the server
socket.on('clearCanvas', () => {
    clearCanvas();
});

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    strokes = [];
    canvas.style.backgroundColor = '#ffffff';
    strokeColor = '#000000';
}
// Function to update the player list UI
function updatePlayerListUI(players) {
    const playerListElement = document.getElementById("playerList");
    // Clear previous player list
    playerListElement.innerHTML = "";
    // Add each player to the player list
    players.forEach(player => {
        const playerItem = document.createElement("li");
        playerItem.textContent = `${player.playerName} - Score: ${player.score}`;
        playerListElement.appendChild(playerItem);
    });
}

// Listen for updated player list from the server
socket.on('updatePlayerList', (players) => {
    // Update the UI to display the updated player list
    const playersArray = Object.values(players);
    updatePlayerListUI(playersArray);
});
// Function to emit drawing data to the server
function emitDrawingData(data) {
    // Include the playerName along with drawing data
    socket.emit('drawing', { ...data, playerName });
    // Handle other drawing-related tasks if necessary
}
socket.on('connect', function() { 
    console.log(socket.id);
 });

 $('#guessButton').click(function(event) {
    event.preventDefault(); // Prevent the default form submission behavior

    // Get the guess from the input field
    const guess = $('#guessInput').val();
    socket.emit('guess',{guess:guess});
    // Get the guess from the input field
    const guessInput = document.getElementById('guessInput');
    guessInput.value = '';
});

// Listen for updated player list from the server
socket.on('guess', (data) => {
    const chatHistoryElement = document.getElementById("chatHistory");
    // Clear previous player list
    const chatItem = document.createElement("li");
    chatItem.textContent = data.playerName + "-" + data.guess;
    chatHistoryElement.appendChild(chatItem);
});

document.querySelectorAll('.color-button, input[type="color"], input[type="range"], #clearCanvas, #undoStroke, #erase, #clearimg, #undoimg, #earseimg, #fillimg, #colourimg, #widthimg').forEach(element => {
    element.classList.add('disabled');
    document.getElementById('canvas').style.pointerEvents = 'none';
    const container1 = document.getElementById("drawguess");
    container1.innerHTML = "Guess the Word";
});

// Enable all color buttons, input fields, and buttons when receiving a "switchDrawingPlayer" socket notification
socket.on('switchDrawingPlayer', () => {
    document.querySelectorAll('.color-button, input[type="color"], input[type="range"], #clearCanvas, #undoStroke, #erase, #clearimg, #undoimg, #earseimg,#fillimg, #colourimg, #widthimg').forEach(element => {
        element.classList.remove('disabled');
    });
    document.getElementById('canvas').style.pointerEvents = 'auto';
    displayRandomWord();
    console.log(word);
    socket.emit('word',{word: word});
});

// Enable all color buttons, input fields, and buttons when receiving a "switchDrawingPlayer" socket notification
socket.on('switch', () => {
    document.querySelectorAll('.color-button, input[type="color"], input[type="range"], #clearCanvas, #undoStroke, #erase, #clearimg, #undoimg, #earseimg,#fillimg, #colourimg, #widthimg').forEach(element => {
        element.classList.add('disabled');
    });
    const container1 = document.getElementById("drawguess");
    container1.innerHTML = "Guess the Word";
    document.getElementById('canvas').style.pointerEvents = 'none';
});

// Enable all color buttons, input fields, and buttons when receiving a "switchDrawingPlayer" socket notification
socket.on('drawer', (data) => {
    console.log(data);
    const container = document.getElementById("wordContainer");
    container.innerHTML = ""; // Clear previous content

    const wordElement = document.createElement("p");
    wordElement.textContent = data.name + " is drawing";
    container.appendChild(wordElement);
});