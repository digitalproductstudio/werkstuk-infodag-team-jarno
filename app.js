
        // Game state
  
        const videoElement = document.getElementById('camera');
        const canvasElement = document.getElementById('outputCanvas');
        const canvasCtx = canvasElement.getContext('2d');
        const player1Board = document.getElementById('player1-board');
        const player2Board = document.getElementById('player2-board');
        const statusMessage = document.getElementById('status-message');
        const handInstructions = document.getElementById('hand-instructions');
        const bombElement = document.getElementById('bomb');
        
        let gameState = {
            currentPlayer: 1,
            phase: 'placement', // 'placement', 'question', 'attack'
            shipsPlaced: [false, false],
            selectedCells: [[], []],
            shipPositions: [[], []],
            hits: [[], []],
            misses: [[], []],
            questionAnswered: false,
            handState: 'open', // 'open', 'closed'
            selectedCell: null,
            bombDragging: false,
            bombPosition: { x: 0, y: 0 },
            attackingCell: null,
            handLandmarks: null
        };
        
        // Questions
        const questions = [
            { q: 'What is 5 + 3?', a: '8' },
            { q: 'What color is the sky?', a: 'blue' },
            { q: 'What is 10 * 5?', a: '50' },
            { q: 'What is the capital of France?', a: 'paris' },
            { q: 'How many sides does a triangle have?', a: '3' },
            { q: 'What is 12 + 7?', a: '19' },
            { q: 'What is 20 - 8?', a: '12' },
            { q: 'What is 4 * 9?', a: '36' },
            { q: 'What is 27 / 9?', a: '3' },
            { q: 'What is the capital of Japan?', a: 'tokyo' }
        ];
        let currentQuestion = null;
        
        // Create grid
        function createGrid(board) {
            board.innerHTML = '';
            for (let i = 0; i < 25; i++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.index = i;
                board.appendChild(cell);
            }
        }
        
        // Initialize game
        function initGame() {
            createGrid(player1Board);
            createGrid(player2Board);
            updateGameDisplay();
            
            // Set up click listeners for cell selection during placement phase
            player1Board.querySelectorAll('.cell').forEach(cell => {
                cell.addEventListener('click', () => selectCell(cell, 1));
            });
            
            player2Board.querySelectorAll('.cell').forEach(cell => {
                cell.addEventListener('click', () => selectCell(cell, 2));
            });
            
            // Button to submit answer
            document.getElementById('submit-answer').addEventListener('click', checkAnswer);
            
            // Initial question
            askNewQuestion();
        }
        
        // Select a cell during placement phase
        function selectCell(cell, playerNum) {
            if (gameState.phase !== 'placement' || gameState.currentPlayer !== playerNum || gameState.shipsPlaced[playerNum - 1]) {
                return;
            }
            
            const index = parseInt(cell.dataset.index);
            
            // Toggle selection
            if (gameState.selectedCells[playerNum - 1].includes(index)) {
                gameState.selectedCells[playerNum - 1] = gameState.selectedCells[playerNum - 1].filter(i => i !== index);
                cell.classList.remove('selected-cell');
            } else {
                // Only allow selecting 3 cells total
                if (gameState.selectedCells[playerNum - 1].length < 3) {
                    gameState.selectedCells[playerNum - 1].push(index);
                    cell.classList.add('selected-cell');
                }
            }
            
            // Check if 3 cells are selected
            if (gameState.selectedCells[playerNum - 1].length === 3) {
                // Validate selection (cells must be adjacent horizontally or vertically)
                if (validateShipPlacement(gameState.selectedCells[playerNum - 1])) {
                    gameState.shipPositions[playerNum - 1] = [...gameState.selectedCells[playerNum - 1]];
                    gameState.shipsPlaced[playerNum - 1] = true;
                    
                    // Update visual
                    gameState.shipPositions[playerNum - 1].forEach(index => {
                        const cell = getCell(playerNum, index);
                        cell.classList.add('ship');
                    });
                    
                    // Switch to next player or phase
                    if (playerNum === 1) {
                        gameState.currentPlayer = 2;
                        gameState.selectedCells[0] = [];
                        statusMessage.textContent = "Player 2's turn to place ships";
                    } else {
                        gameState.phase = 'question';
                        gameState.currentPlayer = 1;
                        gameState.selectedCells[1] = [];
                        statusMessage.textContent = "Player 1's turn to answer a question";
                        askNewQuestion();
                    }
                    
                    updateGameDisplay();
                } else {
                    alert("Invalid ship placement! Ships must be placed in a straight line (horizontally or vertically).");
                    gameState.selectedCells[playerNum - 1] = [];
                    const cells = (playerNum === 1 ? player1Board : player2Board).querySelectorAll('.cell');
                    cells.forEach(c => c.classList.remove('selected-cell'));
                }
            }
        }
        
        // Validate ship placement (must be in a straight line)
        function validateShipPlacement(cells) {
            if (cells.length !== 3) return false;
            
            // Sort cells by index
            cells.sort((a, b) => a - b);
            
            // Check if horizontal (same row)
            const isHorizontal = Math.floor(cells[0] / 5) === Math.floor(cells[1] / 5) && 
                                Math.floor(cells[1] / 5) === Math.floor(cells[2] / 5);
            
            // Check if vertical (same column)
            const isVertical = cells[0] % 5 === cells[1] % 5 && cells[1] % 5 === cells[2] % 5;
            
            // Check if consecutive
            const isConsecutive = (cells[1] - cells[0] === 1 && cells[2] - cells[1] === 1) || 
                                (cells[1] - cells[0] === 5 && cells[2] - cells[1] === 5);
            
            return (isHorizontal || isVertical) && isConsecutive;
        }
        
        // Get cell element
        function getCell(playerNum, index) {
            return (playerNum === 1 ? player1Board : player2Board).querySelector(`[data-index="${index}"]`);
        }
        
        // Update game display based on current state
        function updateGameDisplay() {
            // Update instructions
            switch (gameState.phase) {
                case 'placement':
                    handInstructions.textContent = "Place your 3 ships in a straight line (horizontal or vertical)";
                    break;
                case 'question':
                    handInstructions.textContent = "Answer the question to attack";
                    break;
                case 'attack':
                    handInstructions.textContent = "Make a fist to grab the bomb, open hand to drop it";
                    break;
            }
            
            // Update question section visibility
            const questionSection = document.getElementById('question-section');
            questionSection.style.display = gameState.phase === 'question' ? 'block' : 'none';
            
            // Update grid interactions
            player1Board.querySelectorAll('.cell').forEach(cell => {
                cell.classList.toggle('selectable', 
                    gameState.phase === 'placement' && 
                    gameState.currentPlayer === 1 && 
                    !gameState.shipsPlaced[0]);
            });
            
            player2Board.querySelectorAll('.cell').forEach(cell => {
                cell.classList.toggle('selectable', 
                    gameState.phase === 'placement' && 
                    gameState.currentPlayer === 2 && 
                    !gameState.shipsPlaced[1]);
            });
        }
        // Ask a new question
        function askNewQuestion() {
            currentQuestion = questions[Math.floor(Math.random() * questions.length)];
            document.getElementById('question').innerText = `Player ${gameState.currentPlayer}, answer this to play your turn: ${currentQuestion.q}`;
            document.getElementById('answer').value = '';
        }
        
        // Check answer
        function checkAnswer() {
            const answer = document.getElementById('answer').value.trim().toLowerCase();
            if (answer === currentQuestion.a.toLowerCase()) {
                statusMessage.textContent = `Correct! Player ${gameState.currentPlayer}, use hand tracking to attack`;
                gameState.questionAnswered = true;
                gameState.phase = 'attack';
                updateGameDisplay();
                
                // Show bomb ready for attack
                bombElement.style.display = 'block';
                updateBombPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
            } else {
                statusMessage.textContent = `Wrong! Switching to Player ${gameState.currentPlayer === 1 ? 2 : 1}'s turn`;
                gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
                askNewQuestion();
            }
        }
        
        // Update bomb position
        function updateBombPosition(position) {
            gameState.bombPosition = position;
            bombElement.style.left = `${position.x - 25}px`;
            bombElement.style.top = `${position.y - 25}px`;
        }
        
        // Process attack
        function processAttack(targetIndex) {
            const opponentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
            const attackingPlayer = gameState.currentPlayer;
            
            if (gameState.shipPositions[opponentPlayer - 1].includes(targetIndex)) {
                // Hit
                const cell = getCell(opponentPlayer, targetIndex);
                cell.classList.add('hit');
                gameState.hits[attackingPlayer - 1].push(targetIndex);
                statusMessage.textContent = `Player ${attackingPlayer} hit a ship!`;
                
                // Check if all ships are hit
                if (gameState.hits[attackingPlayer - 1].length === 3) {
                    statusMessage.textContent = `Player ${attackingPlayer} wins the game!`;
                    gameState.phase = 'gameover';
                    window.location.href = "win.html";
                    return;
                }
            } else {
                // Miss
                const cell = getCell(opponentPlayer, targetIndex);
                cell.classList.add('miss');
                gameState.misses[attackingPlayer - 1].push(targetIndex);
                statusMessage.textContent = `Player ${attackingPlayer} missed!`;
            }
            
            // Switch to next player
            gameState.currentPlayer = opponentPlayer;
            gameState.phase = 'question';
            gameState.questionAnswered = false;
            gameState.bombDragging = false;
            bombElement.style.display = 'none';
            askNewQuestion();
            updateGameDisplay();
        }
        
        // Find the cell at a specific screen position
        function findCellAtPosition(position) {
            const opponentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
            const board = opponentPlayer === 1 ? player1Board : player2Board;
            const rect = board.getBoundingClientRect();
            
            // Check if position is inside the board
            if (position.x >= rect.left && position.x <= rect.right &&
                position.y >= rect.top && position.y <= rect.bottom) {
                
                // Calculate cell index
                const cellWidth = rect.width / 5;
                const cellHeight = rect.height / 5;
                const gridX = Math.floor((position.x - rect.left) / cellWidth);
                const gridY = Math.floor((position.y - rect.top) / cellHeight);
                const index = gridY * 5 + gridX;
                
                // Validate index
                if (index >= 0 && index < 25) {
                    return index;
                }
            }
            return null;
        }
        
        // Setup hand tracking
        function setupHandTracking() {
            const hands = new Hands({
                locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            });
            
            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            hands.onResults(results => {
                canvasCtx.save();
                canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
                
                // Draw video feed
                canvasCtx.drawImage(
                    results.image, 0, 0, canvasElement.width, canvasElement.height
                );
                
                // Process hand landmarks if present
                if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                    // Store hand landmarks
                    gameState.handLandmarks = results.multiHandLandmarks[0];
                    
                    // Draw hand landmarks
                    for (const landmarks of results.multiHandLandmarks) {
                        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
                        drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2 });
                    }
                    
                    // Process hand gestures
                    processHandGestures(results.multiHandLandmarks[0]);
                } else {
                    gameState.handLandmarks = null;
                }
                
                canvasCtx.restore();
            });
            
            const camera = new Camera(videoElement, {
                onFrame: async () => {
                    await hands.send({ image: videoElement });
                },
                width: 1280,
                height: 720
            });
            
            camera.start();
        }
        
        // Process hand gestures
        function processHandGestures(landmarks) {
            // Detection of closed vs open hand
            // (Basic detection using thumb and index finger position)
            const isClosedHand = landmarks[8].y > landmarks[4].y;
            const handPosition = {
                x: landmarks[9].x * canvasElement.width,
                y: landmarks[9].y * canvasElement.height
            };
            
            // Handle based on game phase
            switch (gameState.phase) {
                case 'attack':
                    if (isClosedHand) {
                        // Fist - grab bomb
                        if (!gameState.bombDragging) {
                            const distToBomb = Math.sqrt(
                                Math.pow(handPosition.x - gameState.bombPosition.x, 2) +
                                Math.pow(handPosition.y - gameState.bombPosition.y, 2)
                            );
                            
                            // If hand is close enough to the bomb
                            if (distToBomb < 100) {
                                gameState.bombDragging = true;
                            }
                        }
                        
                        // Move bomb with hand if grabbing
                        if (gameState.bombDragging) {
                            updateBombPosition(handPosition);
                            
                            // Highlight cell under bomb
                            const cellIndex = findCellAtPosition(handPosition);
                            if (cellIndex !== null) {
                                gameState.attackingCell = cellIndex;
                                
                                // Highlight potential target
                                const opponentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
                                const allCells = (opponentPlayer === 1 ? player1Board : player2Board).querySelectorAll('.cell');
                                
                                allCells.forEach(cell => cell.classList.remove('selected-cell'));
                                getCell(opponentPlayer, cellIndex).classList.add('selected-cell');
                            } else {
                                gameState.attackingCell = null;
                            }
                        }
                    } else {
                        // Open hand - release bomb
                        if (gameState.bombDragging && gameState.attackingCell !== null) {
                            // Attack the cell
                            processAttack(gameState.attackingCell);
                        }
                        gameState.bombDragging = false;
                    }
                    break;
            }
        }
        
        // Add drawConnectors and drawLandmarks functions since they may not be available
        function drawConnectors(ctx, landmarks, connections, options) {
            if (!landmarks || !connections) return;
            
            ctx.lineWidth = options.lineWidth || 1;
            ctx.strokeStyle = options.color || 'white';
            
            for (const connection of connections) {
                const [i, j] = connection;
                ctx.beginPath();
                ctx.moveTo(landmarks[i].x * ctx.canvas.width, landmarks[i].y * ctx.canvas.height);
                ctx.lineTo(landmarks[j].x * ctx.canvas.width, landmarks[j].y * ctx.canvas.height);
                ctx.stroke();
            }
        }
        
        function drawLandmarks(ctx, landmarks, options) {
            if (!landmarks) return;
            
            ctx.fillStyle = options.color || 'red';
            
            for (const landmark of landmarks) {
                ctx.beginPath();
                ctx.arc(
                    landmark.x * ctx.canvas.width,
                    landmark.y * ctx.canvas.height,
                    options.lineWidth * 2 || 5,
                    0,
                    2 * Math.PI
                );
                ctx.fill();
            }
        }
        
        // Define hand connections for drawing
        const HAND_CONNECTIONS = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17]
        ];
        
        // Update canvas size on window resize
        function updateCanvasSize() {
            canvasElement.width = window.innerWidth;
            canvasElement.height = window.innerHeight;
        }
        
        // Initialize the game when the page loads
        window.addEventListener('load', function() {
            updateCanvasSize();
            initGame();
            setupHandTracking();
        });
        
        window.addEventListener('resize', updateCanvasSize);
