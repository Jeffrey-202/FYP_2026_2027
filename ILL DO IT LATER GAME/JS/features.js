// FEATURES - START SCREEN / PAUSE / SLEEP / BUBBLE

(function () {
if (window.__featuresLoaded) { console.warn('features.js was loaded twice - ignoring the second copy'); return; }
window.__featuresLoaded = true;



let paused = false;
let lastTick = performance.now();

player.sleeping = false;

const bubble = { text: "", end: 0, thought: false };

const startButton   = { x: 105, y: 82,  width: 110, height: 26 };
const newGameButton = { x: 105, y: 112, width: 110, height: 22 };
const resumeButton  = { x: 105, y: 78,  width: 110, height: 26 };
const menuButton    = { x: 105, y: 112, width: 110, height: 26 };
const deadlineAgainButton = { x: 100, y: 135, width: 120, height: 30 };
const tutorialButton = { x: 105, y: 138, width: 110, height: 22 };

function openTutorial() {
    window.location.href = "tutorial.html";
}

function getPauseButton() {
    return { x: GAME_W - 26, y: 5, width: 20, height: 14 };
}

// BUBBLE 

function say(text, ms = 2500, thought = false) {
    bubble.text = text;
    bubble.thought = thought;
    bubble.end = performance.now() + ms;
}

function wrapLines(text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    if (line) lines.push(line);
    return lines;
}

function drawBubble() {
    if (!bubble.text || performance.now() > bubble.end) return;

    ctx.font = "7px monospace";
    ctx.textAlign = "left";

    // Narrow text block so the bubble comes out round
    const lines = wrapLines(bubble.text, 78);
    const lh = 9;
    let textW = 0;
    for (const l of lines) textW = Math.max(textW, ctx.measureText(l).width);
    const textH = lines.length * lh;

    // Ellipse big enough to hold the text block
    const rx = Math.ceil(textW / 2 * 1.35) + 5;
    const ry = Math.ceil(textH / 2 * 1.35) + 4;

    // Head position (the face is about 10x10, top of hair at ay - 1)
    const ax = Math.round(player.x + player.width / 2);
    const ay = Math.round(player.y - 9);

    let cx, cy, tipX, tipY;

    if (ay - 8 - ry * 2 >= 3) {
        // Normal: float the bubble above the head, never over the face
        cx = ax;
        cy = ay - 8 - ry;
        tipX = ax;
        tipY = ay - 2;
    } else {
        // Not enough room above: put it beside the head instead
        const goRight = ax + 10 + rx * 2 <= GAME_W - 3;
        cx = goRight ? ax + 10 + rx : ax - 10 - rx;
        cy = ay + 2;
        tipX = goRight ? ax + 8 : ax - 8;
        tipY = ay + 3;
    }

    // keep on screen (the side offset keeps it off the face)
    cx = Math.round(Math.max(rx + 3, Math.min(cx, GAME_W - rx - 3)));
    cy = Math.round(Math.max(ry + 3, Math.min(cy, GAME_H - ry - 3)));

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#222222";
    ctx.fillStyle = "#ffffff";

    // direction from the bubble centre to the head
    let dx = tipX - cx, dy = tipY - cy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const t = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));   // edge of ellipse
    const edgeX = cx + dx * t;
    const edgeY = cy + dy * t;

    if (bubble.thought) {
        // thought trail of small circles towards the head
        const gap = Math.max(4, len - t);
        const spots = [[0.25, 2.5], [0.65, 1.5]];
        for (const [p, r] of spots) {
            ctx.beginPath();
            ctx.arc(edgeX + dx * gap * p, edgeY + dy * gap * p, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    } else {
        // little pointed speech tail
        const px = -dy, py = dx;
        ctx.beginPath();
        ctx.moveTo(edgeX + px * 3, edgeY + py * 3);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(edgeX - px * 3, edgeY - py * 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // the oval itself (drawn after the tail so it hides the seam)
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#222222";
    const top = cy - textH / 2;
    for (let i = 0; i < lines.length; i++) {
        const w = ctx.measureText(lines[i]).width;
        ctx.fillText(lines[i], Math.round(cx - w / 2), Math.round(top + i * lh + 6.5));
    }
}

// Status messages (e.g. "You slept for 30 minutes.") now use the bubble
showStatus = function (message) {
    say(message, 1800);
    statusMessageEnd = 0;
};

// SLEEP / WAKE

const SAVE_KEY = "illDoItLater_save_v1";

const DAY_KEY = "illDoItLater_day";

function reachedTuesday() {
    try { return localStorage.getItem(DAY_KEY) === "tuesday"; }
    catch (error) { return false; }
}

function storageWorks() {
    try {
        localStorage.setItem("__test", "1");
        localStorage.removeItem("__test");
        return true;
    } catch (error) { return false; }
}

let lastSavedAt = 0;

function hasSavedGame() {
    try { return !!localStorage.getItem(SAVE_KEY) || reachedTuesday(); }
    catch (error) { return false; }
}

function saveGame() {
    // Do not overwrite a real save while the title screen is being shown.
    if (gameState === "start") return;

    // Monday finished: remember that Tuesday is unlocked, drop the Monday save.
    if (gameState === "dayComplete") {
        try {
            localStorage.setItem(DAY_KEY, "tuesday");
            localStorage.removeItem(SAVE_KEY);
        } catch (error) {}
        return;
    }

    // Game over: the run is finished, so don't leave a stale save to continue from.
    if (gameState === "deadlineMissed") {
        try { localStorage.removeItem(SAVE_KEY); } catch (error) {}
        return;
    }

    const save = {
        version: 1,
        gameState,
        currentTime,
        assignmentComplete,
        assignmentAttempts,
        gradeStatus,
        assignmentResultMessage,
        player: { x: player.x, y: player.y, sleeping: !!player.sleeping },
        quizQuestions,
        currentQuestion,
        correctAnswers,
        wrongAnswers,
        tvScore,
        tvHighScore,
        tvTarget: { x: tvTarget.x, y: tvTarget.y },
        questionTimeLeft: gameState === "quiz"
            ? Math.max(0, QUESTION_TIME - (performance.now() - questionStart))
            : QUESTION_TIME,
        tvTimeLeft: gameState === "tv"
            ? Math.max(0, tvRoundLength - (performance.now() - tvStartTime))
            : tvRoundLength,
        bubble: { text: bubble.text, thought: bubble.thought }
    };

    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(save));
        lastSavedAt = performance.now();
    }
    catch (error) { console.warn("Could not save game progress:", error); }
}

function loadGame() {
    let save;
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        save = JSON.parse(raw);
    } catch (error) {
        console.warn("Could not load saved game:", error);
        return false;
    }

    if (!save || save.version !== 1 || !save.player) return false;

    gameState = save.gameState || "bedroom";
    if (gameState === "start" || gameState === "deadlineMissed") gameState = "bedroom";
    currentTime = Number.isFinite(save.currentTime) ? save.currentTime : 9;
    assignmentComplete = !!save.assignmentComplete;
    assignmentAttempts = save.assignmentAttempts || 0;
    gradeStatus = save.gradeStatus || "N/A";
    assignmentResultMessage = save.assignmentResultMessage || "";

    player.x = Number.isFinite(save.player.x) ? save.player.x : 145;
    player.y = Number.isFinite(save.player.y) ? save.player.y : 145;
    player.sleeping = !!save.player.sleeping;

    quizQuestions = Array.isArray(save.quizQuestions) ? save.quizQuestions : [];
    currentQuestion = save.currentQuestion || 0;
    correctAnswers = save.correctAnswers || 0;
    wrongAnswers = save.wrongAnswers || 0;
    quizButtons = [];
    tryAgainButton = null;
    assignmentBackButton = null;

    tvScore = save.tvScore || 0;
    tvHighScore = save.tvHighScore || 0;
    if (save.tvTarget) {
        tvTarget.x = save.tvTarget.x;
        tvTarget.y = save.tvTarget.y;
    }
    tvPlayAgainButton = null;
    tvBackButton = null;

    questionStart = performance.now() - (QUESTION_TIME - (save.questionTimeLeft ?? QUESTION_TIME));
    tvStartTime = performance.now() - (tvRoundLength - (save.tvTimeLeft ?? tvRoundLength));

    bubble.text = save.bubble?.text || "";
    bubble.thought = !!save.bubble?.thought;
    bubble.end = bubble.text ? performance.now() + 2500 : 0;
    paused = false;
    lastTick = performance.now();
    for (const key in keys) keys[key] = false;
    return true;
}

// Expose save/load to the main game loop in monday.js.
window.saveGame = saveGame;
window.loadGame = loadGame;

// Let monday.js (clock + text messages) use these from features.js.
window.say = say;
window.wrapLines = wrapLines;
Object.defineProperty(window, "isPaused", { get: function () { return paused; } });

function startGame(forceNew = false) {
    resetTexts();
    if (forceNew) {
        try {
            localStorage.removeItem(SAVE_KEY);
            localStorage.removeItem(DAY_KEY);
        } catch (error) {}
    }

    if (!forceNew && loadGame()) {
        paused = false;
        return;
    }

    // Monday already finished -> carry on with Tuesday
    if (!forceNew && reachedTuesday()) {
        window.location.href = "tuesday.html";
        return;
    }

    restartGame();
    paused = false;
    player.sleeping = true;
    player.x = 28;
    player.y = 128;
    bubble.text = "";
    say("Zzz... (press E or SPACE to wake up)", Infinity, true);
    gameState = "bedroom";
    saveGame();
}

function wakeUp() {
    player.sleeping = false;
    player.x = 50;
    player.y = 150;
    say("Ugh... the assignment is due at 12:00!", 3500);
}

function drawSleeper() {
    const bed = furniture.find(f => f.name === "bed");
    const t = performance.now() / 1000;

    // The bed art is upright: pillow at the top, blanket below it.
    // Head sits on the pillow, centred on the bed.
    const headX = Math.round(bed.x + bed.width / 2) - 5;
    const headY = bed.y + 5;

    // head
    ctx.fillStyle = "#e5a67a";
    ctx.fillRect(headX, headY, 10, 10);

    // hair
    ctx.fillStyle = "#c14f26";
    ctx.fillRect(headX, headY - 1, 10, 4);
    ctx.fillRect(headX - 1, headY, 2, 6);

    // closed eyes
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(headX + 2, headY + 6, 2, 1);
    ctx.fillRect(headX + 6, headY + 6, 2, 1);

    // shoulders peeking out above the blanket
    ctx.fillStyle = "#3f78ad";
    ctx.fillRect(headX - 1, headY + 10, 12, 3);

    // floating Zzz
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    for (let i = 0; i < 3; i++) {
        const p = (t * 0.6 + i / 3) % 1;
        ctx.font = (6 + i * 2) + "px monospace";
        ctx.globalAlpha = 1 - p;
        ctx.fillText("z", headX + 14 + i * 5, headY - 2 - p * 14);
    }
    ctx.globalAlpha = 1;
}

const _drawPlayer = drawPlayer;
drawPlayer = function () {
    if (player.sleeping) drawSleeper();
    else _drawPlayer();
};

const _drawInteractionPrompt = drawInteractionPrompt;
drawInteractionPrompt = function () {
    if (player.sleeping) {
        ctx.fillStyle = "rgba(0,0,0,0.88)";
        ctx.fillRect(48, 163, 224, 18);
        ctx.strokeStyle = "#ffffff";
        ctx.strokeRect(48, 163, 224, 18);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "7px monospace";
        ctx.fillText("E / SPACE - Wake up", 160, 175);
        return;
    }
    _drawInteractionPrompt();
};

//  BLOCK INPUT WHILE PAUSED / ASLEEP

const _movePlayer = movePlayer;
movePlayer = function () {
    if (paused || player.sleeping) return;
    _movePlayer();
};

const _interact = interact;
interact = function () {
    if (paused) return;
    if (player.sleeping) { wakeUp(); return; }
    _interact();
};

// QUESTION TIMER - run out of time and the assignment fails with an F

const QUESTION_TIME = 10000;   // milliseconds per question (change this to taste)
let questionStart = 0;

function resetQuestionTimer() {
    questionStart = performance.now();
}

function failQuizOnTime() {
    assignmentAttempts++;
    gradeStatus = "F";
    assignmentComplete = false;
    assignmentResultMessage = "Time's up! You ran out of time.";
    gameState = "assignmentResult";
}

const _startQuiz = startQuiz;
startQuiz = function () {
    _startQuiz();
    if (gameState === "quiz") resetQuestionTimer();
};

const _answerQuiz = answerQuiz;
answerQuiz = function (i) {
    if (paused) return;
    _answerQuiz(i);
    if (gameState === "quiz") resetQuestionTimer();   // next question, fresh timer
};

function drawQuizTimer() {
    const left = Math.max(0, QUESTION_TIME - (performance.now() - questionStart));
    const fraction = left / QUESTION_TIME;
    const seconds = Math.ceil(left / 1000);

    const x = 30, y = 4, w = 230, h = 5;

    ctx.fillStyle = "#393d49";
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = fraction > 0.5 ? "#72e58c" : fraction > 0.25 ? "#f1d66b" : "#ef7777";
    ctx.fillRect(x, y, w * fraction, h);

    ctx.strokeStyle = "#777d8e";
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    ctx.fillStyle = fraction > 0.25 ? "#ffffff" : "#ef7777";
    ctx.textAlign = "left";
    ctx.font = "7px monospace";
    ctx.fillText(seconds + "s", x + w + 5, y + 6);
}

const _updateTV = updateTV;
updateTV = function () {
    if (paused) return;
    _updateTV();
};

// PAUSE

function pauseGame() {
    if (gameState === "start" || gameState === "deadlineMissed" || gameState === "dayComplete") return;
    paused = true;
    for (const k in keys) keys[k] = false;
}

function resumeGame() {
    paused = false;
    lastTick = performance.now();
}

function drawPauseButton() {
    const b = getPauseButton();
    ctx.fillStyle = "rgba(15,15,15,0.88)";
    ctx.fillRect(b.x, b.y, b.width, b.height);
    ctx.strokeStyle = "#ffffff";
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.width - 1, b.height - 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(b.x + 6, b.y + 3, 3, 8);
    ctx.fillRect(b.x + 11, b.y + 3, 3, 8);
}

function drawPauseOverlay() {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "16px monospace";
    ctx.fillText("PAUSED", 160, 55);
    drawButton(resumeButton, "RESUME");
    drawButton(menuButton, "MAIN MENU");
    ctx.fillStyle = "#cccccc";
    ctx.font = "7px monospace";
    ctx.textAlign = "center";
    ctx.fillText("P / ESC to resume", 160, 160);
    ctx.fillStyle = lastSavedAt ? "#72e58c" : "#ef7777";
    ctx.fillText(lastSavedAt ? "Progress saved automatically" : "Progress NOT saved (storage blocked)", 160, 172);
}

//  START SCREEN 

function drawStartBackground() {
    ctx.fillStyle = "#1b2030";
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    const cx = GAME_W / 2;
    const cy = GAME_H / 2;
    const r = 84;

    const now = new Date();
    const sec = now.getSeconds() + now.getMilliseconds() / 1000;
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;

    function hand(angle, length, width, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.sin(angle) * length, cy - Math.cos(angle) * length);
        ctx.stroke();
    }

    ctx.save();
    ctx.globalAlpha = 0.4;          // faded so the title and button stay readable
    ctx.lineCap = "round";

    // face
    ctx.fillStyle = "#262c42";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cfd3e0";
    ctx.lineWidth = 3;
    ctx.stroke();

    // hour marks
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const len = i % 3 === 0 ? 9 : 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(a) * (r - 5), cy - Math.cos(a) * (r - 5));
        ctx.lineTo(cx + Math.sin(a) * (r - 5 - len), cy - Math.cos(a) * (r - 5 - len));
        ctx.stroke();
    }

    // hands (hour, minute, second)
    hand((hr / 12) * Math.PI * 2, r * 0.5, 4, "#cfd3e0");
    hand((min / 60) * Math.PI * 2, r * 0.75, 3, "#cfd3e0");
    hand((sec / 60) * Math.PI * 2, r * 0.82, 1.5, "#ffd36a");

    ctx.fillStyle = "#ffd36a";
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}


function drawStartScreen() {
    drawStartBackground();

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd36a";
    ctx.font = "18px monospace";
    ctx.fillText("I'LL DO IT LATER", 160, 45);

    ctx.fillStyle = "#cfd3e0";
    ctx.font = "8px monospace";
    ctx.fillText("Finish your assignment before 12:00 PM", 160, 62);

    const saved = hasSavedGame();
    drawButton(startButton, saved ? "CONTINUE" : "PLAY");
    if (saved) drawButton(newGameButton, "NEW GAME");
    drawButton(tutorialButton, "HOW TO PLAY");

    if (!storageWorks()) {
        ctx.fillStyle = "#ef7777";
        ctx.font = "6px monospace";
        ctx.fillText("Saving is blocked by this browser (private mode / file://?)", 160, 180);
    }

    if (Math.floor(performance.now() / 600) % 2 === 0) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "7px monospace";
        ctx.fillText("ENTER: play/continue  -  N: new game  -  T: tutorial", 160, 168);
    }

    ctx.fillStyle = "#8d93a8";
    ctx.font = "6px monospace";
    ctx.fillText("WASD / Arrows: move   E: interact   P: pause", 160, GAME_H - 10);
}

// MAIN DRAW OVERRIDE

const _drawGame = drawGame;
drawGame = function () {
    const now = performance.now();
    const dt = now - lastTick;
    lastTick = now;

    // Freeze timers while paused
    if (paused) {
        tvStartTime += dt;
        statusMessageEnd += dt;
        bubble.end += dt;
        questionStart += dt;
    }

    if (gameState === "start") {
        drawStartScreen();
        return;
    }

    // Out of time on a quiz question = fail
    if (gameState === "quiz" && !paused &&
        now - questionStart >= QUESTION_TIME) {
        failQuizOnTime();
    }

    _drawGame();

    if (gameState === "quiz") drawQuizTimer();

    if (gameState === "bedroom") drawBubble();

    if (gameState === "deadlineMissed") {
        drawButton(deadlineAgainButton, "PLAY AGAIN");
    }
    else if (gameState === "dayComplete") {
        // no pause button on the end-of-day screen
    }
    else {
        drawPauseButton();
    }

    if (paused) drawPauseOverlay();
};

// INPUT

document.addEventListener("keydown", function (event) {
    const key = event.key.toLowerCase();

    if (gameState === "start") {
        if (key === "enter" || key === " ") {
            event.preventDefault();
            startGame();
        }
        if (key === "t") openTutorial();
        if (key === "n" && hasSavedGame()) startGame(true);
        return;
    }

    if (gameState === "deadlineMissed") {
        if (key === "enter") startGame(true);
        return;
    }

    if (gameState === "dayComplete") return;   // handled in monday.js

    if (key === "p" || key === "escape") {
        event.preventDefault();
        if (paused) resumeGame(); else pauseGame();
        return;
    }

    if (key === " " && !event.repeat && !paused &&
        gameState === "bedroom" && player.sleeping) {
        wakeUp();
    }
});

// Capture phase so we run before game.js's own canvas click handler
document.addEventListener("click", function (event) {
    if (event.target !== canvas) return;
    const mouse = getMousePosition(event);

    if (gameState === "start") {
        if (pointInRect(mouse, startButton)) startGame();
        else if (hasSavedGame() && pointInRect(mouse, newGameButton)) startGame(true);
        else if (pointInRect(mouse, tutorialButton)) openTutorial();
        event.stopPropagation();
        return;
    }

    if (gameState === "deadlineMissed") {
        if (pointInRect(mouse, deadlineAgainButton)) startGame(true);
        event.stopPropagation();
        return;
    }

    if (paused) {
        if (pointInRect(mouse, resumeButton)) resumeGame();
        else if (pointInRect(mouse, menuButton)) {
            saveGame();
            paused = false;
            gameState = "start";
        }
        event.stopPropagation();
        return;
    }

    if (pointInRect(mouse, getPauseButton())) {
        pauseGame();
        event.stopPropagation();
    }
}, true);

// Auto-pause when the window loses focus
window.addEventListener("blur", function () {
    if (gameState === "bedroom" || gameState === "quiz" || gameState === "tv") pauseGame();
});

// Autosave frequently and when the page is closed or refreshed.
setInterval(saveGame, 1000);
window.addEventListener("pagehide", saveGame);
document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") saveGame();
});
window.addEventListener("beforeunload", saveGame);

// BOOT

gameState = "start";


console.log('features.js loaded - start screen active');
})();