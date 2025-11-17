document.addEventListener('DOMContentLoaded', async () => {

    // Initialize profanity filter
    let badWordsList = [];
    
    try {
        const response = await fetch('https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en');
        const text = await response.text();
        badWordsList = text.split('\n').map(word => word.trim().toLowerCase()).filter(word => word.length > 0);
    } catch (error) {
        console.warn('Could not load profanity filter, allowing all names');
    }
    
    const filter = {
        isProfane: (text) => {
            if (badWordsList.length === 0) return false; // If list didn't load, allow everything
            const lowerText = text.toLowerCase();
            return badWordsList.some(word => lowerText.includes(word));
        }
    };

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

    const anonymousVoteToggle = document.getElementById('anonymous-vote-toggle');

    const voteTimerHost = document.getElementById('vote-timer-host');

    const voteProgressHost = document.getElementById('vote-progress-host');

    const voteTimerPlayer = document.getElementById('vote-timer-player');

    const voteProgressPlayer = document.getElementById('vote-progress-player');

    const bettingControls = document.getElementById('betting-controls');

    const betInput = document.getElementById('bet-input');

    const placeBetBtn = document.getElementById('place-bet-btn');

    const betStatusText = document.getElementById('bet-status');

    const VOTING_DURATION_SECONDS = 30;

    const BET_REWARD_MULTIPLIER = 1.5;

    const BET_PENALTY_MULTIPLIER = 0.5;

    // Store loaded questions from question bank (preserves image data)
    let loadedQuestions = null;

    function populateQuestionBanks() {

      if (!window.QUESTION_BANKS || !bankSelect) return;

      Object.entries(window.QUESTION_BANKS).forEach(([template, categories]) => {

        Object.keys(categories).forEach(category => {

          const option = document.createElement('option');

          option.value = `${template}.${category}`;

          option.textContent = `${template} - ${category}`;

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
          loadedQuestions = null;
          return;

        }



        const [template, category] = value.split('.');

        const bank = window.QUESTION_BANKS?.[template]?.[category] || [];
        //Stores full question data including images
        loadedQuestions = bank; 

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

        let questions = [];

        // Priority 1: Use loaded questions from question bank (preserves images)
        if (loadedQuestions && loadedQuestions.length > 0) {
            questions = loadedQuestions.map(item => ({
                question: item.question,
                answer: item.answer,
                image: item.image,
                playerAnswers: {},
                answerTimes: {},
                bets: {},
                votes: {},
                phase: 'collectingAnswers',
                anonymousVoting: false,
                revealVotes: false,
                votingEndsAt: null
            }));
            loadedQuestions = null; // Reset after using
        } else {
            // Priority 2: Parse from textarea (manual entry)
            const textarea = document.getElementById('questions-input');
            const questionsRaw = textarea ? textarea.value : '';
            questions = questionsRaw
              .split('\n')
              .filter(line => line.includes('|'))
              .map(line => {
                  const [question, answer] = line.split('|');
                  return {
                      question: question.trim(),
                      answer: answer.trim(),
                      playerAnswers: {},
                      answerTimes: {},
                      bets: {},
                      votes: {},
                      phase: 'collectingAnswers',
                      anonymousVoting: false,
                      revealVotes: false,
                      votingEndsAt: null
                  };
              });

            // Priority 3: Fallback to selected question bank if textarea is empty
            if (questions.length === 0 && bankSelect && bankSelect.value) {
                const [template, category] = bankSelect.value.split('.');
                questions = (window.QUESTION_BANKS?.[template]?.[category] || []).map(item => ({
                    question: item.question,
                    answer: item.answer,
                    image: item.image,
                    playerAnswers: {},
                    answerTimes: {},
                    bets: {},
                    votes: {},
                    phase: 'collectingAnswers',
                    anonymousVoting: false,
                    revealVotes: false,
                    votingEndsAt: null
                }));
            }
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

        // Display image if question has one
        displayQuestionImageForHost(question);



        // Display player answers

        const answerList = document.getElementById('host-answer-list');

        answerList.innerHTML = '';

        const voteTotals = calculateVotes(question);

        const hideNames = question.anonymousVoting && !question.revealVotes && gameState.status === 'voting';

        Object.entries(question.playerAnswers).forEach(([name, answer], index) => {

            const li = document.createElement('li');

            const votes = voteTotals[name] || 0;

            const displayName = hideNames ? `Answer ${index + 1}` : name;

            const voteInfo = gameState.status !== 'answering' ? ` (Votes: ${votes})` : '';

            li.textContent = `${displayName}: ${answer}${voteInfo}`;

            answerList.appendChild(li);

        });



        if (gameState.status === 'voting') {

            autoFinalizeVoting(gameState, question);

        }



        updateHostControls(gameState.status);

        updateVoteMetaDisplays(gameState);

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

        currentQuestion.votingEndsAt = Date.now() + VOTING_DURATION_SECONDS * 1000;

        currentQuestion.anonymousVoting = anonymousVoteToggle ? anonymousVoteToggle.checked : false;

        currentQuestion.revealVotes = false;

        gameState.status = 'voting';

        localStorage.setItem(gamePin, JSON.stringify(gameState));

        updateHostControls('voting');

        updateVoteMetaDisplays(gameState);

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

        // Check for inappropriate names
        if (filter.isProfane(playerName)) {
            alert('Please choose an appropriate name.');
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



        gameState.players.push({ name: playerName, score: 0, winstreak: 0 });

        localStorage.setItem(gamePin, JSON.stringify(gameState));

        

        showPage('gamePlayer');

        questionText.textContent = 'Waiting for host to start...';

        submitAnswerBtn.classList.add('hidden');

        answerInput.classList.add('hidden');

        answerInput.value = '';

        votingSection.classList.add('hidden');



        gameInterval = setInterval(playerGameLoop, 1000);

    });



    function hideBettingControls() {

        if (!bettingControls) return;

        bettingControls.classList.add('hidden');

        if (betInput) {

            betInput.disabled = false;

            betInput.value = '0';

        }

        if (placeBetBtn) {

            placeBetBtn.disabled = false;

        }

        if (betStatusText) {

            betStatusText.textContent = '';

        }

    }



    function updateBettingControls(gameState, question) {

        if (!bettingControls || !betInput || !placeBetBtn) return;

        if (!gameState || !question) {

            hideBettingControls();

            return;

        }

        const bettingActive = gameState.currentQuestion > 0;

        if (!bettingActive) {

            hideBettingControls();

            return;

        }

        if (!question.bets) {

            question.bets = {};

        }

        const playerRecord = gameState.players.find(player => player.name === playerName);

        if (!playerRecord) {

            hideBettingControls();

            return;

        }

        const maxBet = Math.max(0, Math.floor(playerRecord.score));

        betInput.max = maxBet;

        betInput.min = 0;

        betInput.disabled = false;

        placeBetBtn.disabled = false;

        const existingBet = question.bets[playerName];

        if (existingBet !== undefined) {

            betInput.value = existingBet;

            betInput.disabled = true;

            placeBetBtn.disabled = true;

            if (betStatusText) {

                betStatusText.textContent = `Current bet: ${existingBet} pts`;

            }

        } else {

            const currentValue = Number(betInput.value);

            if (Number.isNaN(currentValue) || currentValue > maxBet || currentValue < 0) {

                betInput.value = Math.max(0, Math.min(maxBet, Math.floor(currentValue) || 0));

            }

            if (betStatusText) {

                if (maxBet === 0) {

                    betStatusText.textContent = 'Confirm a 0-point bet to reveal the prompt.';

                } else {

                    betStatusText.textContent = `You can wager up to ${maxBet} pts before answering.`;

                }

            }

        }

        bettingControls.classList.remove('hidden');

    }



    // --- Player Game Loop ---

    function playerGameLoop() {

        const gameState = JSON.parse(localStorage.getItem(gamePin));

        if (!gameState) return;



        if (gameState.status === 'answering') {

            const question = gameState.questions[gameState.currentQuestion];

            if (question) {

                const requiresBet = gameState.currentQuestion > 0;

                const playerHasBet = !requiresBet || (question.bets && question.bets[playerName] !== undefined);

                votingSection.classList.add('hidden');

                updateBettingControls(gameState, question);

                if (!playerHasBet) {

                    questionText.textContent = 'Place your bet to reveal the question!';

                    submitAnswerBtn.classList.add('hidden');

                    answerInput.classList.add('hidden');

                } else {

                    questionText.textContent = question.question;

                    // Display image if question has one
                    displayQuestionImage(question);

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

            } else {

                hideBettingControls();

            }

        } else {

            hideBettingControls();

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



        updateVoteMetaDisplays(gameState);

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

        if (!question.answerTimes) {

            question.answerTimes = {};

        }

        question.answerTimes[playerName] = Date.now();



        localStorage.setItem(gamePin, JSON.stringify(gameState));



        questionText.textContent = 'Answer submitted! Waiting for next question...';

        submitAnswerBtn.classList.add('hidden');

        answerInput.classList.add('hidden');

        answerInput.value = '';

    });



    if (placeBetBtn && betInput) {

        placeBetBtn.addEventListener('click', () => {

            const gameState = JSON.parse(localStorage.getItem(gamePin));

            if (!gameState) return;

            if (gameState.status !== 'answering') {

                alert('You can only place bets while questions are active.');

                return;

            }

            if (gameState.currentQuestion <= 0) {

                alert('Betting unlocks starting in Round 2.');

                return;

            }

            const question = gameState.questions[gameState.currentQuestion];

            if (!question) return;

            const playerRecord = gameState.players.find(player => player.name === playerName);

            if (!playerRecord) return;

            const maxBet = Math.max(0, Math.floor(playerRecord.score));

            let amount = Number(betInput.value);

            if (Number.isNaN(amount) || amount < 0) {

                alert('Enter a valid bet amount.');

                return;

            }

            amount = Math.floor(amount);

            if (amount > maxBet) {

                alert(`You can wager at most ${maxBet} points right now.`);

                return;

            }

            if (!question.bets) {

                question.bets = {};

            }

            question.bets[playerName] = amount;

            localStorage.setItem(gamePin, JSON.stringify(gameState));

            updateBettingControls(gameState, question);

            playerGameLoop();

        });

    }



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

        updateVoteMetaDisplays(gameState);

    });



    // --- Results ---

  

    function showResults() {

    clearInterval(gameInterval);

    updateVoteMetaDisplays(null);

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



    // ---- NEW: Display simple chart ----

    const ctx = document.getElementById('grade-chart').getContext('2d');

    const labels = gameState.players.map(p => p.name);

    const scores = gameState.players.map(p => p.score);



    // Basic accuracy estimation: score out of total possible points

    const totalPossible = gameState.questions.length * 15; // 10 correct + 5 vote bonus

    const accuracy = scores.map(s => ((s / totalPossible) * 100).toFixed(1));



    new Chart(ctx, {

        type: 'bar',

        data: {

            labels,

            datasets: [

                {

                    label: 'Score',

                    data: scores,

                    backgroundColor: 'rgba(54, 162, 235, 0.6)'

                },

                {

                    label: 'Accuracy (%)',

                    data: accuracy,

                    backgroundColor: 'rgba(255, 206, 86, 0.6)'

                }

            ]

        },

        options: {

            responsive: true,

            scales: {

                y: { beginAtZero: true }

            },

            plugins: {

                legend: { position: 'bottom' },

                title: {

                    display: true,

                    text: 'Final Game Performance'

                }

            }

        }

    });

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

        const hideNames = question.anonymousVoting && !question.revealVotes;



        availableOptions.forEach(([name, answer], index) => {

            const li = document.createElement('li');

            const button = document.createElement('button');

            const displayName = hideNames ? `Answer ${index + 1}` : name;

            button.textContent = `${displayName}: ${answer}`;

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



        let earliestCorrectPlayer = null;



        let earliestCorrectTime = Infinity;







        gameState.players.forEach(player => {



            const playerAnswer = currentQuestion.playerAnswers[player.name];



            const votes = voteTotals[player.name] || 0;



            const submittedAt = currentQuestion.answerTimes ? currentQuestion.answerTimes[player.name] : undefined;



            const answeredCorrectly = playerAnswer && playerAnswer.toLowerCase() === currentQuestion.answer.toLowerCase();

            const betAmountRaw = currentQuestion.bets ? currentQuestion.bets[player.name] : undefined;

            const betAmount = Number(betAmountRaw) > 0 ? Number(betAmountRaw) : 0;







            if (answeredCorrectly) {



                player.score += 10; // Correct answer bonus



                player.winstreak = (player.winstreak || 0) + 1;



                if (typeof submittedAt === 'number' && submittedAt < earliestCorrectTime) {



                    earliestCorrectTime = submittedAt;



                    earliestCorrectPlayer = player;



                }



                if (player.winstreak >= 2) {



                    player.score += 5; // Winstreak bonus



                }



            } else {



                player.winstreak = 0; // Reset winstreak on incorrect answer



            }







            if (maxVotes > 0 && votes === maxVotes) {



                player.score += 5; // Popular vote bonus



            }







            if (betAmount > 0) {



                if (answeredCorrectly) {



                    const reward = Math.ceil(betAmount * BET_REWARD_MULTIPLIER);



                    player.score += reward;



                } else {



                    const penalty = Math.ceil(betAmount * BET_PENALTY_MULTIPLIER);



                    player.score = Math.max(0, player.score - penalty);



                }



            }



        });







        if (earliestCorrectPlayer) {



            earliestCorrectPlayer.score += 3; // Speed bonus for first correct response



        }







        gameState.history.push({

            question: currentQuestion.question,

            correctAnswer: currentQuestion.answer,

            votes: voteTotals,

            answers: { ...currentQuestion.playerAnswers },

            bets: { ...(currentQuestion.bets || {}) }

        });



        currentQuestion.revealVotes = true;

        currentQuestion.anonymousVoting = false;

        currentQuestion.votingEndsAt = null;

        currentQuestion.phase = 'closed';

        gameState.status = 'roundComplete';

        localStorage.setItem(gamePin, JSON.stringify(gameState));

        updateHostControls('roundComplete');

        updateVoteMetaDisplays(gameState);

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

        nextQuestion.answerTimes = {};

        nextQuestion.bets = {};

        nextQuestion.votes = {};

        nextQuestion.anonymousVoting = false;

        nextQuestion.revealVotes = false;

        nextQuestion.votingEndsAt = null;



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

    function getVotingTimeRemaining(question) {

        if (!question || !question.votingEndsAt) return null;

        const remaining = question.votingEndsAt - Date.now();

        if (remaining <= 0) return 0;

        return Math.ceil(remaining / 1000);

    }



    function setHelperVisibility(element, shouldShow, text = '') {

        if (!element) return;

        if (shouldShow) {

            element.textContent = text;

            element.classList.remove('hidden');

        } else {

            element.textContent = '';

            element.classList.add('hidden');

        }

    }



    function updateVoteMetaDisplays(gameState) {

        const elements = [voteTimerHost, voteTimerPlayer, voteProgressHost, voteProgressPlayer];

        if (!elements.some(Boolean)) return;



        if (!gameState || gameState.status !== 'voting') {

            elements.forEach(el => setHelperVisibility(el, false));

            return;

        }



        const question = gameState.questions[gameState.currentQuestion];

        if (!question) {

            elements.forEach(el => setHelperVisibility(el, false));

            return;

        }



        const timeLeft = getVotingTimeRemaining(question);

        const showTimer = timeLeft !== null;

        const timerText = showTimer ? `Voting ends in ${timeLeft}s` : '';

        [voteTimerHost, voteTimerPlayer].forEach(el => setHelperVisibility(el, showTimer, timerText));



        const votesCast = Object.keys(question.votes || {}).length;

        const totalVoters = gameState.players.length || 0;

        const progressText = `Votes submitted: ${votesCast} / ${totalVoters}`;

        [voteProgressHost, voteProgressPlayer].forEach(el => setHelperVisibility(el, true, progressText));

    }



    function autoFinalizeVoting(gameState, question) {

        const timeLeft = getVotingTimeRemaining(question);

        if (timeLeft === 0) {

            finalizeRound(gameState);

        }

    }

    function displayQuestionImage(question) {
    // Remove any existing image
    let existingImg = document.querySelector('#game-page-player .question-image');
    if (existingImg) {
        existingImg.remove();
    }

    // If question has an image, display it
    if (question.image) {
        const img = document.createElement('img');
        img.src = question.image;
        img.alt = 'Question image';
        img.className = 'question-image';
        img.style.maxWidth = '400px';
        img.style.width = '100%';
        img.style.borderRadius = '8px';
        img.style.marginTop = '10px';
        
        // Insert after question text
        const questionElement = document.getElementById('question-text');
        questionElement.parentNode.insertBefore(img, questionElement.nextSibling);
        }
    }

function displayQuestionImageForHost(question) {
    // Remove any existing image
    let existingImg = document.querySelector('#game-page-host .question-image');
    if (existingImg) {
        existingImg.remove();
        }

    // If question has an image, display it
    if (question.image) {
        const img = document.createElement('img');
        img.src = question.image;
        img.alt = 'Question image';
        img.className = 'question-image';
        img.style.maxWidth = '400px';
        img.style.width = '100%';
        img.style.borderRadius = '8px';
        img.style.marginTop = '10px';
        
        // Insert after question text
        const questionElement = document.getElementById('host-question-text');
        questionElement.parentNode.insertBefore(img, questionElement.nextSibling);
        }
    }


});

