# JOST-Box Clone

This is a simple, educational game platform inspired by the JOST-Box Software Requirements Specification. It's built with only HTML, CSS, and vanilla JavaScript to be easy to understand and modify.

## How to Play

Because this is a front-end only application, it uses the browser's `localStorage` to simulate a server. This means you need to run the Host and Player(s) in **different tabs of the same browser**.

### Host Instructions

1.  Open the `index.html` file in your browser.
2.  Click the **Host a Game** button.
3.  In the text area, enter your questions. Each question must be on a new line and follow this format:
    `Question text|Correct answer`
    
    For example:
    `What is the capital of France?|Paris`
    `What is 5 * 5?|25`
4.  Click **Create Game**.
5.  You will be taken to the lobby. Share the **Game PIN** with your players.
6.  When all players have joined, click **Start Game**.
7.  As players submit answers, you will see them appear on your screen.
8.  Click **Next Question** to continue to the next round.
9.  After the last question, the game will end and show the final scores.

### Player Instructions

1.  Open the `index.html` file in a new browser tab.
2.  Click the **Join a Game** button.
3.  Enter the **Game PIN** provided by the host and your name.
4.  Click **Join**.
5.  Wait for the host to start the game.
6.  When a question appears, type your answer and click **Submit Answer**.
7.  The game will automatically proceed to the next question when the host is ready.
8.  At the end of the game, you will see the final scores.
