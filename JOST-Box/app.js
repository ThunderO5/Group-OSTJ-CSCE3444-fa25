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
    const openVotingBtn = document.getElementById('open-voting-btn');
    const closeRoundBtn = document.getElementById('close-round-btn');
    const closeGameBtn = document.getElementById('close-game-btn');
    const votingSection = document.getElementById('voting-section');
    const votingOptionsList = document.getElementById('voting-options');
    const questionText = document.getElementById('question-text');
    const answerInput = document.getElementById('answer-input');
    const bankSelect = document.getElementById('question-bank-select');
    const loadBankBtn = document.getElementById('load-bank-btn');
    const voteEndSound = document.getElementById('vote-end-sound');


    function populateQuestionBanks() {
      if (!window.QUESTION_BANKS || !bankSelect) return;
      Object.entries(window.QUESTION_BANKS).forEach(([template, categories]) => {
        Object.keys(categories).forEach(category => {
          const option = document.createElement('option');
          option.value = `${template}.${category}`;
          option.textContent = `${template} — ${category}`;
          bankSelect.appendChild(option);
        });
      });
    }
    populateQuestionBanks();

    if (loadBankBtn) {
      loadBankBtn.addEventListener('click', () => {
        const value = bankSelect?.value;
        const textarea = document.getElementById('questions-input');
        if (!textarea) return;

        if (!value) {
          textarea.value = '';
          return;
        }

        const [template, category] = value.split('.');
        const bank = window.QUESTION_BANKS?.[template]?.[category] || [];
        textarea.value = bank.map(q => `${q.question} | ${q.answer}`).join('\n');
      });
    }

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
        const textarea = document.getElementById('questions-input');
        const questionsRaw = textarea ? textarea.value : '';
        let questions = questionsRaw
          .split('\n')
          .filter(line => line.includes('|'))
          .map(line => {
              const [question, answer] = line.split('|');
              return {
                  question: question.trim(),
                  answer: answer.trim(),
                  playerAnswers: {},
                  votes: {},
                  phase: 'collectingAnswers'
              };
          });

      if (questions.length === 0 && bankSelect && bankSelect.value) {
          const [template, category] = bankSelect.value.split('.');
          questions = (window.QUESTION_BANKS?.[template]?.[category] || []).map(item => ({
              question: item.question,
              answer: item.answer,
              playerAnswers: {},
              votes: {},
              phase: 'collectingAnswers'
          }));
      }
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
            history: []
        };

        localStorage.setItem(gamePin, JSON.stringify(gameState));
        document.getElementById('game-pin').textContent = gamePin;
        showPage('lobby');
        gameInterval = setInterval(hostLobbyLoop, 1000); // Start listening for players
    });

    // --- Host Starts Game ---
    startGameBtn.addEventListener('click', () => {
        const gameState = JSON.parse(localStorage.getItem(gamePin));
        gameState.status = 'answering';
        gameState.currentQuestion = 0;
        gameState.questions[0].phase = 'collectingAnswers';
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
        if (gameState.status === 'answering' || gameState.status === 'voting' || gameState.status === 'roundComplete') {
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
        const voteTotals = calculateVotes(question);
        Object.entries(question.playerAnswers).forEach(([name, answer]) => {
            const li = document.createElement('li');
            const votes = voteTotals[name] || 0;
            li.textContent = `${name}: ${answer} ${gameState.status !== 'answering' ? `(Votes: ${votes})` : ''}`;
            answerList.appendChild(li);
        });

        updateHostControls(gameState.status);
    }

    nextQuestionBtn.addEventListener('click', () => {
        const gameState = JSON.parse(localStorage.getItem(gamePin));
        if (gameState.status !== 'roundComplete') {
            alert('Complete the current round before moving on.');
            return;
        }
        advanceToNextQuestion(gameState);
    });

    openVotingBtn.addEventListener('click', () => {
        const gameState = JSON.parse(localStorage.getItem(gamePin));
        const currentQuestion = gameState.questions[gameState.currentQuestion];

        if (Object.keys(currentQuestion.playerAnswers).length === 0) {
            alert('No answers submitted yet. Wait for players before opening voting.');
            return;
        }

        currentQuestion.phase = 'voting';
        gameState.status = 'voting';
        localStorage.setItem(gamePin, JSON.stringify(gameState));
        updateHostControls('voting');
    });

    closeRoundBtn.addEventListener('click', () => {
        const gameState = JSON.parse(localStorage.getItem(gamePin));
        if (gameState.status !== 'voting') {
            alert('The round is not ready to be finalized yet.');
            return;
        }
        finalizeRound(gameState);
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
        questionText.textContent = 'Waiting for host to start...';
        submitAnswerBtn.classList.add('hidden');
        answerInput.classList.add('hidden');
        answerInput.value = '';
        votingSection.classList.add('hidden');

        gameInterval = setInterval(playerGameLoop, 1000);
    });

    // --- Player Game Loop ---
    function playerGameLoop() {
        const gameState = JSON.parse(localStorage.getItem(gamePin));
        if (!gameState) return;

        if (gameState.status === 'answering') {
            const question = gameState.questions[gameState.currentQuestion];
            if (question) {
                questionText.textContent = question.question;
                votingSection.classList.add('hidden');

                if (question.playerAnswers[playerName]) {
                    submitAnswerBtn.classList.add('hidden');
                    answerInput.classList.add('hidden');
                    questionText.textContent = 'Answer submitted! Waiting for other players...';
                } else {
                    if (answerInput.classList.contains('hidden')) {
                        answerInput.value = '';
                    }
                    submitAnswerBtn.classList.remove('hidden');
                    answerInput.classList.remove('hidden');
                }
            }
        }

        if (gameState.status === 'voting') {
            const question = gameState.questions[gameState.currentQuestion];
            questionText.textContent = 'Time to vote!';
            submitAnswerBtn.classList.add('hidden');
            answerInput.classList.add('hidden');
            renderVotingOptions(question);
        }

        if (gameState.status === 'roundComplete') {
            submitAnswerBtn.classList.add('hidden');
            answerInput.classList.add('hidden');
            votingSection.classList.add('hidden');
            questionText.textContent = 'Waiting for the next question...';
        }

        if (gameState.status === 'finished') {
            showResults();
        }
    }
    
    submitAnswerBtn.addEventListener('click', () => {
        const answer = answerInput.value;
        const gameState = JSON.parse(localStorage.getItem(gamePin));
        if (!gameState || gameState.status !== 'answering') {
            alert('You cannot submit an answer right now.');
            return;
        }

        if (!answer.trim()) {
            alert('Please enter an answer.');
            return;
        }

        const question = gameState.questions[gameState.currentQuestion];
        if (question.playerAnswers[playerName]) {
            alert('You have already submitted an answer for this question.');
            return;
        }

        question.playerAnswers[playerName] = answer.trim();
        localStorage.setItem(gamePin, JSON.stringify(gameState));

        questionText.textContent = 'Answer submitted! Waiting for next question...';
        submitAnswerBtn.classList.add('hidden');
        answerInput.classList.add('hidden');
        answerInput.value = '';
    });

    votingOptionsList.addEventListener('click', (event) => {
        if (event.target.tagName !== 'BUTTON') return;

        const targetName = event.target.getAttribute('data-player');
        if (!targetName) return;

        const gameState = JSON.parse(localStorage.getItem(gamePin));
        const question = gameState.questions[gameState.currentQuestion];

        if (question.votes[playerName]) return; // already voted
        question.votes[playerName] = targetName;
        localStorage.setItem(gamePin, JSON.stringify(gameState));
        renderVotingOptions(question);
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
        persistResults(gameState);
    }

    closeGameBtn.addEventListener('click', () => {
        if (!isHost) {
            showPage('home');
            return;
        }

        localStorage.removeItem(gamePin);
        localStorage.removeItem(`${gamePin}-results`);
        showPage('home');
    });

    function updateHostControls(status) {
        if (status === 'answering') {
            openVotingBtn.classList.remove('hidden');
            closeRoundBtn.classList.add('hidden');
            nextQuestionBtn.classList.add('hidden');
        } else if (status === 'voting') {
            openVotingBtn.classList.add('hidden');
            closeRoundBtn.classList.remove('hidden');
            nextQuestionBtn.classList.add('hidden');
        } else if (status === 'roundComplete') {
            openVotingBtn.classList.add('hidden');
            closeRoundBtn.classList.add('hidden');
            nextQuestionBtn.classList.remove('hidden');
        } else {
            openVotingBtn.classList.add('hidden');
            closeRoundBtn.classList.add('hidden');
            nextQuestionBtn.classList.add('hidden');
        }
    }

    function calculateVotes(question) {
        const voteTotals = {};
        Object.values(question.votes || {}).forEach(votedFor => {
            if (!votedFor) return;
            voteTotals[votedFor] = (voteTotals[votedFor] || 0) + 1;
        });
        return voteTotals;
    }

    function renderVotingOptions(question) {
        votingSection.classList.remove('hidden');
        votingOptionsList.innerHTML = '';

        const answers = Object.entries(question.playerAnswers);
        const availableOptions = answers.filter(([name]) => name !== playerName);

        if (availableOptions.length === 0) {
            const li = document.createElement('li');
            li.textContent = 'No other answers to vote on yet.';
            votingOptionsList.appendChild(li);
            return;
        }

        const playerVote = question.votes[playerName];

        availableOptions.forEach(([name, answer]) => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.textContent = `${name}: ${answer}`;
            button.setAttribute('data-player', name);
            if (playerVote === name) {
                button.disabled = true;
                button.textContent += ' (Voted)';
            }
            li.appendChild(button);
            votingOptionsList.appendChild(li);
        });
    }

    function finalizeRound(gameState) {
        // Play sound when voting ends
        if (voteEndSound) {
            voteEndSound.currentTime = 0; // Reset to start
            voteEndSound.play().catch(err => console.log('Audio play failed:', err));
        }
        const currentQuestion = gameState.questions[gameState.currentQuestion];
        const voteTotals = calculateVotes(currentQuestion);
        let maxVotes = 0;

        Object.values(voteTotals).forEach(count => {
            if (count > maxVotes) maxVotes = count;
        });

        gameState.players.forEach(player => {
            const playerAnswer = currentQuestion.playerAnswers[player.name];
            const votes = voteTotals[player.name] || 0;

            if (playerAnswer && playerAnswer.toLowerCase() === currentQuestion.answer.toLowerCase()) {
                player.score += 10; // Correct answer bonus
            }

            if (maxVotes > 0 && votes === maxVotes) {
                player.score += 5; // Popular vote bonus
            }
        });

        gameState.history.push({
            question: currentQuestion.question,
            correctAnswer: currentQuestion.answer,
            votes: voteTotals,
            answers: { ...currentQuestion.playerAnswers }
        });

        currentQuestion.phase = 'closed';
        gameState.status = 'roundComplete';
        localStorage.setItem(gamePin, JSON.stringify(gameState));
        updateHostControls('roundComplete');
    }

    function advanceToNextQuestion(gameState) {
        if (gameState.currentQuestion + 1 >= gameState.questions.length) {
            gameState.status = 'finished';
            localStorage.setItem(gamePin, JSON.stringify(gameState));
            showResults();
            return;
        }

        gameState.currentQuestion++;
        const nextQuestion = gameState.questions[gameState.currentQuestion];
        nextQuestion.phase = 'collectingAnswers';
        nextQuestion.playerAnswers = {};
        nextQuestion.votes = {};

        gameState.status = 'answering';
        localStorage.setItem(gamePin, JSON.stringify(gameState));
        updateHostControls('answering');
    }

    function persistResults(gameState) {
        const summary = {
            players: gameState.players.map(player => ({ name: player.name, score: player.score })),
            rounds: gameState.history
        };
        localStorage.setItem(`${gamePin}-results`, JSON.stringify(summary));
    }
});
