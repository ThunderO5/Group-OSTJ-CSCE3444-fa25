document.addEventListener('DOMContentLoaded', () => {
    // Page Elements
    const pages = {
        home: document.getElementById('home-page'),
        host: document.getElementById('host-page'),
        lobby: document.getElementById('lobby-page'),
        join: document.getElementById('join-page'),
        gamePlayer: document.getElementById('game-page-player'),
        gameHost: document.getElementById('game-page-host'),
        results: document.getElementById('results-page'),
    };

    // --- Navigation & UI Elements ---
    const hostBtn = document.getElementById('host-btn');
    const joinBtn = document.getElementById('join-btn');
    const createGameBtn = document.getElementById('create-game-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const joinGameBtn = document.getElementById('join-game-btn');
    const submitAnswerBtn = document.getElementById('submit-answer-btn');
    const nextQuestionBtn = document.getElementById('next-question-btn');

    // --- Game State ---
    let gamePin = '';
    let playerName = '';
    let isHost = false;
    let gameInterval;

    // --- Page Navigation ---
    function showPage(pageName) {
        Object.values(pages).forEach(page => page.classList.add('hidden'));
        pages[pageName].classList.remove('hidden');
    }

    hostBtn.addEventListener('click', () => {
        isHost = true;
        showPage('host');
    });
    joinBtn.addEventListener('click', () => showPage('join'));

    // --- Host Creates Game ---
    createGameBtn.addEventListener('click', () => {
        gamePin = Math.floor(1000 + Math.random() * 9000).toString();
        const questionsRaw = document.getElementById('questions-input').value;
        const questions = questionsRaw.split('\n').filter(line => line.includes('|')).map(line => {
            const [question, answer] = line.split('|');
            return { question, answer, playerAnswers: {} };
        });

        if (questions.length === 0) {
            alert('Please add at least one question in the format: Question|Answer');
            return;
        }

        const gameState = {
            pin: gamePin,
            questions,
            players: [],
            currentQuestion: -1, // Lobby state
            status: 'lobby',
        };

        localStorage.setItem(gamePin, JSON.stringify(gameState));
        document.getElementById('game-pin').textContent = gamePin;
        showPage('lobby');
        gameInterval = setInterval(hostLobbyLoop, 1000); // Start listening for players
    });

    // --- Host Starts Game ---
    startGameBtn.addEventListener('click', () => {
        const gameState = JSON.parse(localStorage.getItem(gamePin));
        gameState.status = 'playing';
        gameState.currentQuestion = 0;
        localStorage.setItem(gamePin, JSON.stringify(gameState));
    });

    // --- Host Game Loop ---
    function hostLobbyLoop() {
        const gameState = JSON.parse(localStorage.getItem(gamePin));
        
        // Update player list in lobby
        const playerList = document.getElementById('player-list');
        playerList.innerHTML = '';
        gameState.players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name;
            playerList.appendChild(li);
        });

        // If game starts, switch to host game view
        if (gameState.status === 'playing') {
            clearInterval(gameInterval);
            gameInterval = setInterval(hostGameLoop, 1000);
            showPage('gameHost');
        }
    }

    function hostGameLoop() {
        const gameState = JSON.parse(localStorage.getItem(gamePin));
        const question = gameState.questions[gameState.currentQuestion];

        if (!question) { // Game over
            gameState.status = 'finished';
            localStorage.setItem(gamePin, JSON.stringify(gameState));
            showResults();
            return;
        }

        document.getElementById('host-question-text').textContent = question.question;

        // Display player answers
        const answerList = document.getElementById('host-answer-list');
        answerList.innerHTML = '';
        Object.entries(question.playerAnswers).forEach(([name, answer]) => {
            const li = document.createElement('li');
            li.textContent = `${name}: ${answer}`;
            answerList.appendChild(li);
        });
    }
    
    nextQuestionBtn.addEventListener('click', () => {
        const gameState = JSON.parse(localStorage.getItem(gamePin));
        const currentQuestion = gameState.questions[gameState.currentQuestion];

        // Grade answers
        gameState.players.forEach(player => {
            const playerAnswer = currentQuestion.playerAnswers[player.name];
            if (playerAnswer && playerAnswer.toLowerCase() === currentQuestion.answer.toLowerCase()) {
                player.score += 10;
            }
        });

        gameState.currentQuestion++;
        localStorage.setItem(gamePin, JSON.stringify(gameState));
    });


    // --- Player Joins Game ---
    joinGameBtn.addEventListener('click', () => {
        gamePin = document.getElementById('pin-input').value;
        playerName = document.getElementById('name-input').value;

        if (!gamePin || !playerName) {
            alert('Please enter a PIN and your name.');
            return;
        }

        const gameState = JSON.parse(localStorage.getItem(gamePin));
        if (!gameState) {
            alert('Game not found!');
            return;
        }
        
        if (gameState.status !== 'lobby') {
            alert('Game has already started!');
            return;
        }

        gameState.players.push({ name: playerName, score: 0 });
        localStorage.setItem(gamePin, JSON.stringify(gameState));
        
        showPage('gamePlayer');
        document.getElementById('question-text').textContent = 'Waiting for host to start...';
        submitAnswerBtn.classList.add('hidden');
        document.getElementById('answer-input').classList.add('hidden');

        gameInterval = setInterval(playerGameLoop, 1000);
    });

    // --- Player Game Loop ---
    function playerGameLoop() {
        const gameState = JSON.parse(localStorage.getItem(gamePin));
        if (!gameState) return;

        if (gameState.status === 'playing') {
            const question = gameState.questions[gameState.currentQuestion];
            if (question) {
                document.getElementById('question-text').textContent = question.question;
                submitAnswerBtn.classList.remove('hidden');
                document.getElementById('answer-input').classList.remove('hidden');
            }
        }
        
        if (gameState.status === 'finished') {
            showResults();
        }
    }
    
    submitAnswerBtn.addEventListener('click', () => {
        const answer = document.getElementById('answer-input').value;
        const gameState = JSON.parse(localStorage.getItem(gamePin));
        const question = gameState.questions[gameState.currentQuestion];

        question.playerAnswers[playerName] = answer;
        localStorage.setItem(gamePin, JSON.stringify(gameState));

        document.getElementById('question-text').textContent = 'Answer submitted! Waiting for next question...';
        submitAnswerBtn.classList.add('hidden');
        document.getElementById('answer-input').classList.add('hidden');
        document.getElementById('answer-input').value = '';
    });

    // --- Results ---
    function showResults() {
        clearInterval(gameInterval);
        const gameState = JSON.parse(localStorage.getItem(gamePin));
        
        const resultsList = document.getElementById('results-list');
        resultsList.innerHTML = '';

        // Sort players by score
        gameState.players.sort((a, b) => b.score - a.score);

        gameState.players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = `${player.name}: ${player.score}`;
            resultsList.appendChild(li);
        });

        showPage('results');
        
        // Clean up local storage after a delay
        if(isHost) {
            setTimeout(() => {
                localStorage.removeItem(gamePin);
            }, 5000);
        }
    }
});