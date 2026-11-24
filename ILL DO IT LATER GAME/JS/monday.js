// CANVAS


const canvas = document.getElementById("monday");
const ctx = canvas.getContext("2d");
const GAME_W = 320;
const GAME_H = 192;
const SCALE = 3;

canvas.width = GAME_W * SCALE;
canvas.height = GAME_H * SCALE;
ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

ctx.imageSmoothingEnabled = false;



// LOAD OPTIONAL IMAGES


function loadGameImage(path) {

    const image = new Image();

    image.loaded = false;

    image.onload = function () {
        image.loaded = true;
    };

    image.onerror = function () {

        image.loaded = false;

        console.log(
            path + " not found - using canvas placeholder."
        );
    };

    image.src = path;

    return image;
}


const bedImage =
    loadGameImage("Img/bed.png");

const deskImage =
    loadGameImage("Img/computer.png");

const tvImage =
    loadGameImage("Img/tv.png");

const roomImage =
    loadGameImage("Img/room.png");



// GAME STATE


let gameState = "bedroom";

/*
    bedroom
    quiz
    assignmentResult
    tv
    tvResult
    deadlineMissed
*/



// TIME


let currentTime = 9;

const deadlineTime = 12;


// ASSIGNMENT


let assignmentComplete = false;

let assignmentAttempts = 0;

let gradeStatus = "N/A";

let assignmentResultMessage = "";


// STATUS MESSAGE


let statusMessage = "";

let statusMessageEnd = 0;



// ROOM BOUNDS (back wall ends at y = 50; head is drawn 5px above player.y)

const ROOM_TOP = 55;


// PLAYER


const player = {

    x: 145,
    y: 145,

    width: 12,
    height: 16,

    speed: 2,

    color: "#3d7cff"

};



// FURNITURE


const furniture = [

    // BED

    {
        name: "bed",

        image: bedImage,

        x: 12,
        y: 100,

        width: 100,
        height: 48,

        color: "#8c6045",

        interactive: true,

        prompt: "E - Sleep for 30 minutes"
    },


    // DESK / COMPUTER

    {
        name: "desk",

        image: deskImage,

        x: 136,
        y: 12,

        width: 48,
        height: 50,

        color: "#74513a",

        interactive: true,

        prompt: "E - Start assignment"
    },


    // TV

    {
        name: "tv",

        image: tvImage,

        x: 250,
        y: 105,

        width: 60,
        height: 57,

        color: "#333333",

        interactive: true,

        prompt: "E - Watch TV"
    }

];


// KEYBOARD


const keys = {};


document.addEventListener(
    "keydown",

    function (event) {

        const key =
            event.key.toLowerCase();

        keys[key] = true;


        if (
            key.startsWith("arrow") ||
            [
                "w",
                "a",
                "s",
                "d",
                "e",
                "1",
                "2",
                "3",
                "4",
                " "
            ].includes(key)
        ) {

            event.preventDefault();
        }


        // INTERACT

        if (
            key === "e" &&
            !event.repeat &&
            gameState === "bedroom"
        ) {

            interact();
        }


        // TEXT MESSAGES (R = reply, X = ignore)

        if (
            gameState === "bedroom" &&
            !gamePaused() &&
            !player.sleeping &&
            notif &&
            !event.repeat
        ) {

            if (key === "r") {
                replyToText();
            }

            else if (key === "x") {
                ignoreText();
            }
        }


        // END OF DAY

        if (
            gameState === "dayComplete" &&
            (key === "enter" || key === " ")
        ) {

            goToTuesday();
        }


        // QUIZ ANSWERS

        if (
            gameState === "quiz" &&
            !event.repeat
        ) {

            if (key === "1") {
                answerQuiz(0);
            }

            else if (key === "2") {
                answerQuiz(1);
            }

            else if (key === "3") {
                answerQuiz(2);
            }

            else if (key === "4") {
                answerQuiz(3);
            }
        }

    }
);


document.addEventListener(
    "keyup",

    function (event) {

        const key =
            event.key.toLowerCase();

        keys[key] = false;
    }
);


window.addEventListener(
    "blur",

    function () {

        for (let key in keys) {
            keys[key] = false;
        }

    }
);


// COLLISION


function isColliding(a, b) {

    return (

        a.x < b.x + b.width &&

        a.x + a.width > b.x &&

        a.y < b.y + b.height &&

        a.y + a.height > b.y

    );
}



// MOVEMENT


function movePlayer() {

    if (
        gameState !== "bedroom"
    ) {

        return;
    }


    let dx = 0;
    let dy = 0;


    if (
        keys["w"] ||
        keys["arrowup"]
    ) {

        dy -= 1;
    }


    if (
        keys["s"] ||
        keys["arrowdown"]
    ) {

        dy += 1;
    }


    if (
        keys["a"] ||
        keys["arrowleft"]
    ) {

        dx -= 1;
    }


    if (
        keys["d"] ||
        keys["arrowright"]
    ) {

        dx += 1;
    }


    // Normalise diagonal movement

    if (
        dx !== 0 &&
        dy !== 0
    ) {

        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
    }


    // HORIZONTAL MOVEMENT

    const oldX =
        player.x;


    player.x +=
        dx * player.speed;


    player.x =
        Math.max(
            0,
            Math.min(
                player.x,
                GAME_W -
                player.width
            )
        );


    for (
        const item of furniture
    ) {

        if (
            isColliding(
                player,
                item
            )
        ) {

            player.x =
                oldX;

            break;
        }
    }


    // VERTICAL MOVEMENT

    const oldY =
        player.y;


    player.y +=
        dy * player.speed;


    player.y =
        Math.max(
            ROOM_TOP,
            Math.min(
                player.y,
                GAME_H -
                player.height
            )
        );


    for (
        const item of furniture
    ) {

        if (
            isColliding(
                player,
                item
            )
        ) {

            player.y =
                oldY;

            break;
        }
    }
}



// INTERACTION DISTANCE


function isNearObject(
    playerObject,
    furnitureObject,
    distance = 12
) {

    const area = {

        x:
            furnitureObject.x -
            distance,

        y:
            furnitureObject.y -
            distance,

        width:
            furnitureObject.width +
            distance * 2,

        height:
            furnitureObject.height +
            distance * 2
    };


    return isColliding(
        playerObject,
        area
    );
}


// GET NEAREST OBJECT

function getNearbyObject() {

    let nearestObject =
        null;

    let nearestDistance =
        Infinity;


    for (
        const item of furniture
    ) {

        if (
            !item.interactive ||
            !isNearObject(
                player,
                item
            )
        ) {

            continue;
        }


        const playerCenterX =
            player.x +
            player.width / 2;


        const playerCenterY =
            player.y +
            player.height / 2;


        const objectCenterX =
            item.x +
            item.width / 2;


        const objectCenterY =
            item.y +
            item.height / 2;


        const distance =
            Math.hypot(

                playerCenterX -
                objectCenterX,

                playerCenterY -
                objectCenterY
            );


        if (
            distance <
            nearestDistance
        ) {

            nearestDistance =
                distance;

            nearestObject =
                item;
        }
    }


    return nearestObject;
}


// INTERACT


function interact() {

    const object =
        getNearbyObject();


    if (!object) {

        return;
    }


    if (
        object.name === "bed"
    ) {

        sleep();
    }


    else if (
        object.name === "desk"
    ) {

        startQuiz();
    }


    else if (
        object.name === "tv"
    ) {

        startTVGame();
    }
}



// BED / SLEEP


function sleep() {

    if (
        checkDeadline()
    ) {

        return;
    }


    currentTime += 0.5;


    showStatus(
        "You slept for 30 minutes."
    );


    checkDeadline();
}


// STATUS MESSAGE


function showStatus(message) {

    statusMessage =
        message;


    statusMessageEnd =
        performance.now() +
        1800;
}



// TIME


function formatTime(time) {

    const totalMinutes =
        Math.round(
            time * 60
        );


    let hour =
        Math.floor(
            totalMinutes / 60
        );


    const minutes =
        totalMinutes % 60;


    const period =
        hour >= 12
            ? "PM"
            : "AM";


    let displayHour =
        hour % 12;


    if (
        displayHour === 0
    ) {

        displayHour = 12;
    }


    const displayMinutes =
        String(
            minutes
        ).padStart(
            2,
            "0"
        );


    return (

        displayHour +
        ":" +
        displayMinutes +
        " " +
        period
    );
}


// DEADLINE


function checkDeadline() {

    if (currentTime >= deadlineTime) {

        // Assignment done -> on to Tuesday
        if (assignmentComplete) {

            gameState = "dayComplete";

            if (typeof saveGame === "function") {
                saveGame();
            }

            return true;
        }

        // No assignment -> F and restart
        gradeStatus = "F";

        gameState = "deadlineMissed";

        return true;
    }

    return false;
}



// QUESTIONS


const questionBank = [

    {
        question:
            "What is the capital of France?",

        answers: [
            "Paris",
            "London",
            "Rome",
            "Madrid"
        ],

        correct:
            "Paris"
    },


    {
        question:
            "Which planet is called the Red Planet?",

        answers: [
            "Mars",
            "Venus",
            "Jupiter",
            "Mercury"
        ],

        correct:
            "Mars"
    },


    {
        question:
            "How many continents are there?",

        answers: [
            "7",
            "5",
            "6",
            "8"
        ],

        correct:
            "7"
    },


    {
        question:
            "What is the largest ocean?",

        answers: [
            "Pacific Ocean",
            "Atlantic Ocean",
            "Indian Ocean",
            "Arctic Ocean"
        ],

        correct:
            "Pacific Ocean"
    },


    {
        question:
            "What is H2O?",

        answers: [
            "Water",
            "Oxygen",
            "Salt",
            "Hydrogen"
        ],

        correct:
            "Water"
    },


    {
        question:
            "How many sides does a hexagon have?",

        answers: [
            "6",
            "5",
            "7",
            "8"
        ],

        correct:
            "6"
    },


    {
        question:
            "Where are the Pyramids of Giza?",

        answers: [
            "Egypt",
            "Italy",
            "Greece",
            "Mexico"
        ],

        correct:
            "Egypt"
    },


    {
        question:
            "Which organ pumps blood around the body?",

        answers: [
            "Heart",
            "Brain",
            "Lungs",
            "Kidneys"
        ],

        correct:
            "Heart"
    },


    {
        question:
            "What is the largest planet?",

        answers: [
            "Jupiter",
            "Earth",
            "Saturn",
            "Mars"
        ],

        correct:
            "Jupiter"
    },


    {
        question:
            "What language is mainly spoken in Brazil?",

        answers: [
            "Portuguese",
            "Spanish",
            "French",
            "Italian"
        ],

        correct:
            "Portuguese"
    },


    {
        question:
            "How many days are in a leap year?",

        answers: [
            "366",
            "365",
            "364",
            "367"
        ],

        correct:
            "366"
    },


    {
        question:
            "What metal has the symbol Au?",

        answers: [
            "Gold",
            "Silver",
            "Iron",
            "Copper"
        ],

        correct:
            "Gold"
    },


    {
        question:
            "What is the freezing point of water?",

        answers: [
            "0 C",
            "10 C",
            "32 C",
            "-10 C"
        ],

        correct:
            "0 C"
    },


    {
        question:
            "Which planet is closest to the Sun?",

        answers: [
            "Mercury",
            "Venus",
            "Earth",
            "Mars"
        ],

        correct:
            "Mercury"
    },


    {
        question:
            "Which continent contains the Sahara?",

        answers: [
            "Africa",
            "Asia",
            "Europe",
            "Australia"
        ],

        correct:
            "Africa"
    },


    {
        question:
            "What is the square root of 64?",

        answers: [
            "8",
            "6",
            "7",
            "9"
        ],

        correct:
            "8"
    },


    {
        question:
            "Which gas do plants absorb?",

        answers: [
            "Carbon dioxide",
            "Oxygen",
            "Hydrogen",
            "Helium"
        ],

        correct:
            "Carbon dioxide"
    },


    {
        question:
            "Tokyo is the capital of which country?",

        answers: [
            "Japan",
            "China",
            "Thailand",
            "South Korea"
        ],

        correct:
            "Japan"
    },


    {
        question:
            "How many minutes are in an hour?",

        answers: [
            "60",
            "30",
            "45",
            "90"
        ],

        correct:
            "60"
    },


    {
        question:
            "Which instrument normally has 88 keys?",

        answers: [
            "Piano",
            "Guitar",
            "Violin",
            "Trumpet"
        ],

        correct:
            "Piano"
    }

];


// SHUFFLE ARRAY

function shuffleArray(array) {

    const shuffled =
        [...array];


    for (
        let i =
            shuffled.length - 1;

        i > 0;

        i--
    ) {

        const randomIndex =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        const temp =
            shuffled[i];


        shuffled[i] =
            shuffled[randomIndex];


        shuffled[randomIndex] =
            temp;
    }


    return shuffled;
}


// QUIZ


let quizQuestions = [];

let currentQuestion = 0;

let correctAnswers = 0;

let wrongAnswers = 0;

let quizButtons = [];


// ASSIGNMENT BUTTONS


let tryAgainButton = null;

let assignmentBackButton = null;



// START QUIZ


function startQuiz() {

    if (
        currentTime >=
        deadlineTime
    ) {

        if (
            !assignmentComplete
        ) {

            checkDeadline();
        }

        else {

            showStatus(
                "The deadline has passed."
            );

            gameState =
                "bedroom";
        }


        return;
    }


    const selectedQuestions =
        shuffleArray(
            questionBank
        ).slice(
            0,
            5
        );


    quizQuestions =
        selectedQuestions.map(

            function (question) {

                return {

                    question:
                        question.question,

                    correct:
                        question.correct,

                    answers:
                        shuffleArray(
                            question.answers
                        )
                };
            }
        );


    currentQuestion = 0;

    correctAnswers = 0;

    wrongAnswers = 0;


    gameState =
        "quiz";
}



// ANSWER QUIZ


function answerQuiz(answerIndex) {

    if (
        gameState !== "quiz"
    ) {

        return;
    }


    const question =
        quizQuestions[
            currentQuestion
        ];


    const selectedAnswer =
        question.answers[
            answerIndex
        ];


    if (
        selectedAnswer ===
        question.correct
    ) {

        correctAnswers++;
    }

    else {

        wrongAnswers++;
    }


    // TWO WRONG = FAILED ATTEMPT

    if (
        wrongAnswers >= 2
    ) {

        assignmentAttempts++;


        gradeStatus =
            "F";


        assignmentComplete =
            false;


        assignmentResultMessage =
            "Too many incorrect answers.";


        gameState =
            "assignmentResult";


        return;
    }


    currentQuestion++;


    // FINISHED ALL FIVE

    if (
        currentQuestion >=
        quizQuestions.length
    ) {

        assignmentAttempts++;


        assignmentComplete =
            true;


        if (
            correctAnswers === 5
        ) {

            gradeStatus =
                "A";
        }

        else {

            gradeStatus =
                "B";
        }


        assignmentResultMessage =
            "Assignment completed!";


        gameState =
            "assignmentResult";
    }
}


// TV MINIGAME


let tvScore = 0;

let tvHighScore = 0;

const tvRoundLength =
    15000;

let tvStartTime = 0;


const tvTarget = {

    x: 100,
    y: 100,

    size: 18
};


let tvPlayAgainButton = null;

let tvBackButton = null;

// START TV

function startTVGame() {

    if (
        checkDeadline()
    ) {

        return;
    }


    tvScore = 0;


    tvStartTime =
        performance.now();


    spawnTVTarget();


    gameState =
        "tv";
}



// SPAWN TV TARGET

function spawnTVTarget() {

    tvTarget.x =
        20 +
        Math.random() *
        (
            GAME_W -
            40 -
            tvTarget.size
        );


    tvTarget.y =
        55 +
        Math.random() *
        (
            GAME_H -
            75 -
            tvTarget.size
        );
}


// UPDATE TV


function updateTV() {

    if (
        gameState !== "tv"
    ) {

        return;
    }


    const elapsed =
        performance.now() -
        tvStartTime;


    if (
        elapsed >=
        tvRoundLength
    ) {

        finishTVRound();
    }
}


// FINISH TV ROUND


function finishTVRound() {

    if (
        tvScore >
        tvHighScore
    ) {

        tvHighScore =
            tvScore;
    }


    // ONE HOUR PASSES

    currentTime += 1;


    if (
        checkDeadline()
    ) {

        return;
    }


    gameState =
        "tvResult";
}

// MOUSE POSITION


function getMousePosition(event) {

    const rect =
        canvas.getBoundingClientRect();


    return {

        x:
            (
                event.clientX -
                rect.left
            ) *
            GAME_W /
            rect.width,

        y:
            (
                event.clientY -
                rect.top
            ) *
            GAME_H /
            rect.height
    };
}


// CLICK RECTANGLE


function pointInRect(
    point,
    rectangle
) {

    return (

        point.x >=
        rectangle.x &&

        point.x <=
        rectangle.x +
        rectangle.width &&

        point.y >=
        rectangle.y &&

        point.y <=
        rectangle.y +
        rectangle.height
    );
}


// CANVAS CLICK


canvas.addEventListener(
    "click",

    function (event) {

        const mouse =
            getMousePosition(
                event
            );


        // TEXT MESSAGE NOTIFICATION

        if (
            gameState === "bedroom" &&
            !player.sleeping &&
            !gamePaused() &&
            textClick(mouse)
        ) {

            return;
        }


        // END OF DAY

        if (gameState === "dayComplete") {

            if (pointInRect(mouse, tuesdayButton)) {
                goToTuesday();
            }

            return;
        }


        // QUIZ

        if (
            gameState === "quiz"
        ) {

            for (
                let i = 0;

                i <
                quizButtons.length;

                i++
            ) {

                if (
                    pointInRect(
                        mouse,
                        quizButtons[i]
                    )
                ) {

                    answerQuiz(i);

                    return;
                }
            }
        }


        // ASSIGNMENT RESULT

        else if (
            gameState ===
            "assignmentResult"
        ) {

            if (
                tryAgainButton &&
                pointInRect(
                    mouse,
                    tryAgainButton
                )
            ) {

                startQuiz();

                return;
            }


            if (
                assignmentBackButton &&
                pointInRect(
                    mouse,
                    assignmentBackButton
                )
            ) {

                gameState =
                    "bedroom";

                return;
            }
        }


        // TV TARGET

        else if (
            gameState === "tv"
        ) {

            const targetRectangle = {

                x:
                    tvTarget.x,

                y:
                    tvTarget.y,

                width:
                    tvTarget.size,

                height:
                    tvTarget.size
            };


            if (
                pointInRect(
                    mouse,
                    targetRectangle
                )
            ) {

                tvScore++;

                spawnTVTarget();
            }
        }


        // TV RESULTS

        else if (
            gameState ===
            "tvResult"
        ) {

            if (
                tvPlayAgainButton &&
                pointInRect(
                    mouse,
                    tvPlayAgainButton
                )
            ) {

                startTVGame();

                return;
            }


            if (
                tvBackButton &&
                pointInRect(
                    mouse,
                    tvBackButton
                )
            ) {

                gameState =
                    "bedroom";

                return;
            }
        }

    }
);



// GENERIC BUTTON


function drawButton(
    rectangle,
    text
) {

    ctx.fillStyle =
        "#454545";


    ctx.fillRect(

        rectangle.x,
        rectangle.y,

        rectangle.width,
        rectangle.height
    );


    ctx.strokeStyle =
        "#bbbbbb";


    ctx.strokeRect(

        rectangle.x,
        rectangle.y,

        rectangle.width,
        rectangle.height
    );


    ctx.fillStyle =
        "#ffffff";


    ctx.textAlign =
        "center";


    ctx.font =
        "8px monospace";


    ctx.fillText(

        text,

        rectangle.x +
        rectangle.width / 2,

        rectangle.y +
        rectangle.height / 2 +
        3
    );
}


// DRAW BEDROOM


function drawBedroom() {

    // Original canvas-drawn wall + dark wood floor (room.png is no longer used)
    drawPlaceholderRoom();

    drawFurniture();

    drawPlayer();

    drawHUD();

    if (!player.sleeping) {
        drawClockBar();
    }

    drawInteractionPrompt();

    drawStatusMessage();

    if (!player.sleeping) {
        drawTextNotification();
    }
}


// PLACEHOLDER ROOM


function drawPlaceholderRoom() {

    // FLOOR

    ctx.fillStyle =
        "#b99972";


    ctx.fillRect(

        0,
        0,

        GAME_W,
        GAME_H
    );


    // WALL

    ctx.fillStyle =
        "#ddc8a4";


    ctx.fillRect(

        0,
        0,

        GAME_W,
        25
    );


    // BORDER

    ctx.fillStyle =
        "#67513d";


    ctx.fillRect(

        0,
        23,

        GAME_W,
        3
    );


    // FLOOR LINES

    ctx.strokeStyle =
        "rgba(80,60,40,0.25)";


    for (
        let y = 45;

        y <
        GAME_H;

        y += 22
    ) {

        ctx.beginPath();

        ctx.moveTo(
            0,
            y
        );

        ctx.lineTo(
            GAME_W,
            y
        );

        ctx.stroke();
    }
}


function drawPlaceholderRoom() {

    // Back wall
    ctx.fillStyle = "#d9c6a5";
    ctx.fillRect(0, 0, GAME_W, 48);

    // Wall trim
    ctx.fillStyle = "#8d7456";
    ctx.fillRect(0, 46, GAME_W, 4);

    // Floor
    ctx.fillStyle = "#b58e68";
    ctx.fillRect(0, 50, GAME_W, GAME_H - 50);

    // Floorboards
    ctx.strokeStyle = "rgba(80, 55, 35, 0.22)";
    ctx.lineWidth = 1;

    for (let y = 70; y < GAME_H; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(GAME_W, y);
        ctx.stroke();
    }

    for (let x = 35; x < GAME_W; x += 70) {
        ctx.beginPath();
        ctx.moveTo(x, 50);
        ctx.lineTo(x, GAME_H);
        ctx.stroke();
    }

    // Window
    ctx.fillStyle = "#765d48";
    ctx.fillRect(207, 7, 52, 31);
    ctx.fillStyle = "#9ed5e8";
    ctx.fillRect(211, 11, 44, 23);
    ctx.strokeStyle = "#765d48";
    ctx.beginPath();
    ctx.moveTo(233, 11);
    ctx.lineTo(233, 34);
    ctx.moveTo(211, 22);
    ctx.lineTo(255, 22);
    ctx.stroke();

    // Wall picture
    ctx.fillStyle = "#765d48";
    ctx.fillRect(275, 8, 30, 28);
    ctx.fillStyle = "#8ebc83";
    ctx.fillRect(279, 12, 22, 20);
    ctx.fillStyle = "#e8d9b9";
    ctx.fillRect(281, 25, 18, 7);
}


// DRAW FURNITURE


function drawFurniture() {

    for (
        const item of furniture
    ) {

        // USE PNG IMAGE

        if (
            item.image.loaded
        ) {

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";

            ctx.drawImage(

                item.image,

                Math.round(
                    item.x
                ),

                Math.round(
                    item.y
                ),

                item.width,
                item.height
            );

            ctx.imageSmoothingEnabled = false;
        }


        // Canvas-drawn furniture placeholders
        else {

            ctx.fillStyle = item.color;
            ctx.fillRect(item.x, item.y, item.width, item.height);

            ctx.strokeStyle = "#30251d";
            ctx.lineWidth = 2;
            ctx.strokeRect(item.x, item.y, item.width, item.height);

            if (item.name === "bed") {
                ctx.fillStyle = "#e8dfd0";
                ctx.fillRect(item.x + 5, item.y + 5, item.width - 10, item.height - 10);
                ctx.fillStyle = "#9bb9d8";
                ctx.fillRect(item.x + 8, item.y + 23, item.width - 16, item.height - 31);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(item.x + 9, item.y + 8, 25, 13);
                ctx.fillStyle = "#6d8fb8";
                ctx.fillRect(item.x + 8, item.y + 37, item.width - 16, 8);
            }
            else if (item.name === "desk") {
                ctx.fillStyle = "#4b3022";
                ctx.fillRect(item.x + 4, item.y + 31, item.width - 8, 8);
                ctx.fillStyle = "#242a35";
                ctx.fillRect(item.x + 20, item.y + 4, 32, 24);
                ctx.fillStyle = "#83c8df";
                ctx.fillRect(item.x + 23, item.y + 7, 26, 17);
                ctx.fillStyle = "#d8d8d8";
                ctx.fillRect(item.x + 27, item.y + 33, 22, 3);
            }
            else if (item.name === "tv") {
                ctx.fillStyle = "#242424";
                ctx.fillRect(item.x + 3, item.y + 3, item.width - 6, item.height - 9);
                ctx.fillStyle = "#82c8d8";
                ctx.fillRect(item.x + 7, item.y + 7, item.width - 14, item.height - 17);
                ctx.fillStyle = "#242424";
                ctx.fillRect(item.x + 12, item.y + item.height - 6, item.width - 24, 4);
            }

            ctx.lineWidth = 1;
        }
    }
}

// DRAW PLAYER


// PLAYER SPRITE (Img/player.png: 6 frames, 18x26 each; frame 0 = idle, 1-5 = walk)

// true = animated sprite from Img/player.png, false = the canvas-drawn character
// (same look as the sleeping character)
const USE_PLAYER_SPRITE = false;

const playerSheet = loadGameImage("Img/player.png");

const PLAYER_FRAME_W = 18;
const PLAYER_FRAME_H = 26;
const PLAYER_WALK_FRAMES = 5;
const PLAYER_FRAME_MS = 110;

let facingLeft = false;
let lastPX = null;
let lastPY = null;
let lastMoveTime = 0;

function drawPlayerSprite() {

    const now = performance.now();
    const moved = lastPX !== null &&
        (player.x !== lastPX || player.y !== lastPY);

    if (moved) {
        if (player.x < lastPX) facingLeft = true;
        else if (player.x > lastPX) facingLeft = false;
        lastMoveTime = now;
    }

    lastPX = player.x;
    lastPY = player.y;

    const walking = now - lastMoveTime < 120;
    const frame = walking
        ? 1 + (Math.floor(now / PLAYER_FRAME_MS) % PLAYER_WALK_FRAMES)
        : 0;

    // feet sit at the bottom of the hitbox, centred
    const dx = Math.round(player.x + player.width / 2 - PLAYER_FRAME_W / 2);
    const dy = Math.round(player.y + player.height - PLAYER_FRAME_H);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    if (facingLeft) {
        ctx.translate(dx + PLAYER_FRAME_W, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(playerSheet, frame * PLAYER_FRAME_W, 0,
            PLAYER_FRAME_W, PLAYER_FRAME_H, 0, 0,
            PLAYER_FRAME_W, PLAYER_FRAME_H);
    } else {
        ctx.drawImage(playerSheet, frame * PLAYER_FRAME_W, 0,
            PLAYER_FRAME_W, PLAYER_FRAME_H, dx, dy,
            PLAYER_FRAME_W, PLAYER_FRAME_H);
    }

    ctx.restore();
}


function drawPlayer() {

    // Optional sprite-sheet character
    if (USE_PLAYER_SPRITE && playerSheet.loaded) {
        drawPlayerSprite();
        return;
    }

    // Drawn character - same head, hair and eyes as the sleeping character
    const x = Math.round(player.x);
    const y = Math.round(player.y);

    // BODY
    ctx.fillStyle = player.color;
    ctx.fillRect(x, y, player.width, player.height);

    // Head position
    const headX = x + 1;
    const headY = y - 9;

    // HEAD
    ctx.fillStyle = "#e5a67a";
    ctx.fillRect(headX, headY, 10, 10);

    // HAIR
    ctx.fillStyle = "#c14f26";
    ctx.fillRect(headX, headY - 1, 10, 4);
    ctx.fillRect(headX - 1, headY, 2, 6);

    // EYES
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(headX + 2, headY + 6, 2, 1);
    ctx.fillRect(headX + 6, headY + 6, 2, 1);
}


// SMALL HUD / INFO BOX


function drawHUD() {

    // SMALLER BOX

    ctx.fillStyle =
        "rgba(15,15,15,0.88)";


    ctx.fillRect(
        5,
        5,
        112,
        52
    );


    ctx.strokeStyle =
        "#ffffff";


    ctx.strokeRect(
        5,
        5,
        112,
        52
    );


    ctx.textAlign =
        "left";


    ctx.font =
        "7px monospace";


    ctx.fillStyle =
        "#ffffff";


    // TIME

    ctx.fillText(

        "TIME: " +
        formatTime(
            currentTime
        ),

        9,
        14
    );


    // DEADLINE

    ctx.fillText(

        "DUE: 12:00 PM",

        9,
        24
    );


    // GRADE

    ctx.fillText(

        "GRADE: " +
        gradeStatus,

        9,
        34
    );


    // ATTEMPTS

    ctx.fillText(

        "TRIES: " +
        assignmentAttempts,

        9,
        44
    );


    // TASK STATUS

    if (
        assignmentComplete
    ) {

        ctx.fillStyle =
            "#82e68c";


        ctx.fillText(

            "TASK: COMPLETE",

            9,
            53
        );
    }

    else {

        ctx.fillStyle =
            "#ffd36a";


        ctx.fillText(

            "TASK: DUE",

            9,
            53
        );
    }
}


// INTERACTION PROMPT


function drawInteractionPrompt() {

    const object =
        getNearbyObject();


    if (!object) {

        return;
    }


    ctx.fillStyle =
        "rgba(0,0,0,0.88)";


    ctx.fillRect(

        48,
        163,

        224,
        18
    );


    ctx.strokeStyle =
        "#ffffff";


    ctx.strokeRect(

        48,
        163,

        224,
        18
    );


    ctx.fillStyle =
        "#ffffff";


    ctx.textAlign =
        "center";


    ctx.font =
        "7px monospace";


    ctx.fillText(

        object.prompt,

        160,
        175
    );
}


// ============================================================
// STATUS MESSAGE
// ============================================================

function drawStatusMessage() {

    if (
        performance.now() >
        statusMessageEnd
    ) {

        return;
    }


    ctx.fillStyle =
        "rgba(0,0,0,0.9)";


    ctx.fillRect(

        70,
        128,

        180,
        18
    );


    ctx.fillStyle =
        "#ffffff";


    ctx.textAlign =
        "center";


    ctx.font =
        "7px monospace";


    ctx.fillText(

        statusMessage,

        160,
        140
    );
}


// QUIZ SCREEN

function drawQuiz() {

    ctx.fillStyle =
        "#1e2027";


    ctx.fillRect(

        0,
        0,

        GAME_W,
        GAME_H
    );


    const question =
        quizQuestions[
            currentQuestion
        ];


    ctx.fillStyle =
        "#ffffff";


    ctx.textAlign =
        "center";


    ctx.font =
        "12px monospace";


    ctx.fillText(

        "ASSIGNMENT QUIZ",

        160,
        17
    );


    ctx.font =
        "7px monospace";


    ctx.fillStyle =
        "#cccccc";


    ctx.fillText(

        "Question " +
        (
            currentQuestion +
            1
        ) +
        " / 5",

        160,
        30
    );


    ctx.fillText(

        "Correct: " +
        correctAnswers +
        "   Wrong: " +
        wrongAnswers +
        " / 2",

        160,
        41
    );


    // QUESTION

    ctx.fillStyle =
        "#ffffff";


    ctx.font =
        "9px monospace";


    drawCenteredWrappedText(

        question.question,

        160,
        58,

        270,
        11
    );


    // ANSWERS

    quizButtons = [];


    const startY =
        87;


    for (
        let i = 0;

        i < 4;

        i++
    ) {

        const button = {

            x: 35,

            y:
                startY +
                i * 23,

            width: 250,

            height: 18
        };


        quizButtons.push(
            button
        );


        ctx.fillStyle =
            "#393d49";


        ctx.fillRect(

            button.x,
            button.y,

            button.width,
            button.height
        );


        ctx.strokeStyle =
            "#777d8e";


        ctx.strokeRect(

            button.x,
            button.y,

            button.width,
            button.height
        );


        ctx.fillStyle =
            "#ffffff";


        ctx.font =
            "8px monospace";


        ctx.textAlign =
            "left";


        ctx.fillText(

            (
                i + 1
            ) +
            ". " +
            question.answers[i],

            button.x + 8,

            button.y + 12
        );
    }
}


// ASSIGNMENT RESULT


function drawAssignmentResult() {

    ctx.fillStyle =
        "#1d1f26";


    ctx.fillRect(

        0,
        0,

        GAME_W,
        GAME_H
    );


    ctx.textAlign =
        "center";


    ctx.fillStyle =
        "#ffffff";


    ctx.font =
        "13px monospace";


    ctx.fillText(

        "ASSIGNMENT RESULT",

        160,
        27
    );


    ctx.font =
        "9px monospace";


    ctx.fillText(

        "Correct: " +
        correctAnswers +
        " / 5",

        160,
        50
    );


    // GRADE COLOUR

    if (
        gradeStatus === "A"
    ) {

        ctx.fillStyle =
            "#72e58c";
    }

    else if (
        gradeStatus === "B"
    ) {

        ctx.fillStyle =
            "#f1d66b";
    }

    else {

        ctx.fillStyle =
            "#ef7777";
    }


    ctx.font =
        "18px monospace";


    ctx.fillText(

        "GRADE: " +
        gradeStatus,

        160,
        76
    );


    ctx.fillStyle =
        "#ffffff";


    ctx.font =
        "8px monospace";


    ctx.fillText(

        assignmentResultMessage,

        160,
        95
    );


    ctx.fillText(

        "Time: " +
        formatTime(
            currentTime
        ),

        160,
        108
    );


    // TRY AGAIN

    tryAgainButton = {

        x: 40,
        y: 125,

        width: 110,
        height: 30
    };


    drawButton(

        tryAgainButton,

        "TRY AGAIN"
    );


    // BACK

    assignmentBackButton = {

        x: 170,
        y: 125,

        width: 110,
        height: 30
    };


    drawButton(

        assignmentBackButton,

        "BACK"
    );
}



// TV GAME


function drawTVGame() {

    ctx.fillStyle =
        "#11131a";


    ctx.fillRect(

        0,
        0,

        GAME_W,
        GAME_H
    );


    const elapsed =
        performance.now() -
        tvStartTime;


    const timeRemaining =
        Math.max(

            0,

            Math.ceil(

                (
                    tvRoundLength -
                    elapsed
                ) /
                1000
            )
        );


    ctx.fillStyle =
        "#ffffff";


    ctx.textAlign =
        "center";


    ctx.font =
        "12px monospace";


    ctx.fillText(

        "TV MINI GAME",

        160,
        18
    );


    ctx.font =
        "8px monospace";


    ctx.fillText(

        "Score: " +
        tvScore,

        60,
        37
    );


    ctx.fillText(

        "High Score: " +
        tvHighScore,

        160,
        37
    );


    ctx.fillText(

        "Time: " +
        timeRemaining,

        260,
        37
    );


    ctx.fillText(

        "Click the target!",

        160,
        50
    );


    // TARGET

    ctx.fillStyle =
        "#ffd83d";


    ctx.fillRect(

        tvTarget.x,
        tvTarget.y,

        tvTarget.size,
        tvTarget.size
    );


    ctx.strokeStyle =
        "#ffffff";


    ctx.strokeRect(

        tvTarget.x,
        tvTarget.y,

        tvTarget.size,
        tvTarget.size
    );


    ctx.fillStyle =
        "#1b1b1b";


    ctx.fillRect(

        tvTarget.x + 5,
        tvTarget.y + 5,

        tvTarget.size - 10,
        tvTarget.size - 10
    );
}


// TV RESULT


function drawTVResult() {

    ctx.fillStyle =
        "#1d1f26";


    ctx.fillRect(

        0,
        0,

        GAME_W,
        GAME_H
    );


    ctx.fillStyle =
        "#ffffff";


    ctx.textAlign =
        "center";


    ctx.font =
        "14px monospace";


    ctx.fillText(

        "TV ROUND OVER",

        160,
        28
    );


    ctx.font =
        "9px monospace";


    ctx.fillText(

        "Score: " +
        tvScore,

        160,
        52
    );


    ctx.fillText(

        "High Score: " +
        tvHighScore,

        160,
        68
    );


    ctx.fillStyle =
        "#f2c96d";


    ctx.fillText(

        "1 hour has passed.",

        160,
        87
    );


    ctx.fillStyle =
        "#ffffff";


    ctx.fillText(

        "Time: " +
        formatTime(
            currentTime
        ),

        160,
        103
    );


    // PLAY AGAIN

    tvPlayAgainButton = {

        x: 40,
        y: 125,

        width: 110,
        height: 30
    };


    drawButton(

        tvPlayAgainButton,

        "PLAY AGAIN"
    );


    // BACK

    tvBackButton = {

        x: 170,
        y: 125,

        width: 110,
        height: 30
    };


    drawButton(

        tvBackButton,

        "BACK"
    );
}


// DEADLINE MISSED


function drawDeadlineMissed() {

    ctx.fillStyle =
        "#351919";


    ctx.fillRect(

        0,
        0,

        GAME_W,
        GAME_H
    );


    ctx.textAlign =
        "center";


    ctx.fillStyle =
        "#ff7e7e";


    ctx.font =
        "16px monospace";


    ctx.fillText(

        "DEADLINE MISSED",

        160,
        50
    );


    ctx.fillStyle =
        "#ffffff";


    ctx.font =
        "9px monospace";


    ctx.fillText(

        "Assignment due at 12:00 PM",

        160,
        78
    );


    ctx.fillText(

        "Final Grade: F",

        160,
        100
    );


    ctx.fillText(

        "Current Time: " +
        formatTime(
            currentTime
        ),

        160,
        118
    );

    deadlineRestartButton = {

        x: 100,
        y: 135,
        width: 120,
        height: 30
    };
}



// WRAP TEXT


function drawCenteredWrappedText(
    text,
    x,
    y,
    maxWidth,
    lineHeight
) {

    const words =
        text.split(" ");


    let line = "";

    let currentY = y;


    ctx.textAlign =
        "center";


    for (
        let i = 0;

        i <
        words.length;

        i++
    ) {

        const testLine =
            line +
            words[i] +
            " ";


        const width =
            ctx.measureText(
                testLine
            ).width;


        if (
            width >
            maxWidth &&
            i > 0
        ) {

            ctx.fillText(

                line.trim(),

                x,
                currentY
            );


            line =
                words[i] +
                " ";


            currentY +=
                lineHeight;
        }

        else {

            line =
                testLine;
        }
    }


    ctx.fillText(

        line.trim(),

        x,
        currentY
    );
}



// DRAW GAME


function drawGame() {

    ctx.clearRect(

        0,
        0,

        GAME_W,
        GAME_H
    );


    if (
        gameState === "bedroom"
    ) {

        drawBedroom();
    }


    else if (
        gameState === "quiz"
    ) {

        drawQuiz();
    }


    else if (
        gameState ===
        "assignmentResult"
    ) {

        drawAssignmentResult();
    }


    else if (
        gameState === "tv"
    ) {

        drawTVGame();
    }


    else if (
        gameState === "tvResult"
    ) {

        drawTVResult();
    }


    else if (
        gameState ===
        "deadlineMissed"
    ) {

        drawDeadlineMissed();
    }


    else if (
        gameState ===
        "dayComplete"
    ) {

        drawDayComplete();
    }
}


// Pause state lives in features.js - treat the game as paused until it has loaded
function gamePaused() {
    return window.__featuresLoaded ? window.isPaused : true;
}

// GAME CLOCK - every 10 real seconds = +20 game minutes (only while you're in the room)

// Every 10 real seconds the clock jumps forward 20 game minutes (9:00 -> 9:20 -> 9:40 ...).
// The day (9:00 -> 12:00) lasts 90 real seconds.
const TIME_STEP_MS = 10000;     // real time between clock updates (10 seconds)
const TIME_STEP_MINUTES = 20;   // game minutes added each update
let clockAcc = 0;

// Thin bar under the clock box: fills up until the next clock update
function drawClockBar() {

    const fraction = Math.min(1, clockAcc / TIME_STEP_MS);

    ctx.fillStyle = "rgba(15,15,15,0.88)";
    ctx.fillRect(5, 58, 112, 4);

    ctx.fillStyle = "#ffd36a";
    ctx.fillRect(6, 59, 110 * fraction, 2);
}

function tickClock(dt) {
    if (gameState !== "bedroom" || gamePaused() || player.sleeping) return;

    clockAcc += Math.min(dt, 250);
    while (clockAcc >= TIME_STEP_MS) {
        clockAcc -= TIME_STEP_MS;
        currentTime = Math.round(currentTime * 60 + TIME_STEP_MINUTES) / 60;
        if (checkDeadline()) { clockAcc = 0; break; }
    }
}

// TEXT MESSAGES - a phone notification pops up now and then.
// R (or click REPLY) answers it and costs 5 game minutes. X / IGNORE / waiting costs nothing.

const TEXT_FIRST_MS = 6000;       // real time before the first text
const TEXT_MIN_MS = 9000;         // gap between texts (random between min and max)
const TEXT_MAX_MS = 18000;
const TEXT_SHOW_MS = 6000;        // how long a text stays on screen
const TEXT_REPLY_MINUTES = 5;     // game minutes a reply costs

const textMessages = [
    { from: "Mum",      text: "Did you eat breakfast yet?",              reply: "Yes mum, love you!" },
    { from: "Jake",     text: "Bro are you online? Match soon.",  reply: "Can't, assignment!" },
    { from: "Sophie",   text: "Did you finish the assignment?",          reply: "Working on it..." },
    { from: "Pizza Co", text: "2 for 1 pizzas today only!",              reply: "Not now, thanks." },
    { from: "Dad",      text: "Don't forget to take the bins out.",      reply: "Will do later." },
    { from: "Emma",     text: "LOL did you see the group chat??",        reply: "Haha, one sec" },
    { from: "Lecturer", text: "Reminder: quiz due at 12:00 sharp.",      reply: "On it, thank you!" },
    { from: "Alex",     text: "Want to grab lunch later?",               reply: "Sure, text you after" }
];

let notif = null;
let textCountdown = TEXT_FIRST_MS;
let lastTextIndex = -1;

const textBanner = { x: 182, y: 24, width: 134, height: 46 };
const textReplyButton = { x: 186, y: 55, width: 60, height: 11 };
const textIgnoreButton = { x: 252, y: 55, width: 60, height: 11 };

function nextTextDelay() {
    return TEXT_MIN_MS + Math.random() * (TEXT_MAX_MS - TEXT_MIN_MS);
}

function resetTexts() {
    notif = null;
    textCountdown = TEXT_FIRST_MS;
}

function spawnText() {
    let i;
    do { i = Math.floor(Math.random() * textMessages.length); }
    while (i === lastTextIndex && textMessages.length > 1);
    lastTextIndex = i;
    notif = { msg: textMessages[i], left: TEXT_SHOW_MS };
}

function tickTexts(dt) {
    if (gameState !== "bedroom" || gamePaused() || player.sleeping) return;

    dt = Math.min(dt, 250);
    if (notif) {
        notif.left -= dt;
        if (notif.left <= 0) { notif = null; textCountdown = nextTextDelay(); }
    } else {
        textCountdown -= dt;
        if (textCountdown <= 0) spawnText();
    }
}

function ignoreText() {
    notif = null;
    textCountdown = nextTextDelay();
}

function replyToText() {
    if (!notif) return;
    const reply = notif.msg.reply;
    notif = null;
    textCountdown = nextTextDelay();

    currentTime = Math.round(currentTime * 60 + TEXT_REPLY_MINUTES) / 60;
    say('You: "' + reply + '" (+' + TEXT_REPLY_MINUTES + ' min)', 2200);
    checkDeadline();
}

function drawTextNotification() {
    if (!notif) return;
    const b = textBanner;

    ctx.fillStyle = "rgba(20,24,34,0.95)";
    ctx.fillRect(b.x, b.y, b.width, b.height);
    ctx.strokeStyle = "#5aa9ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.width - 1, b.height - 1);

    ctx.textAlign = "left";
    ctx.fillStyle = "#5aa9ff";
    ctx.font = "6px monospace";
    ctx.fillText("NEW MESSAGE", b.x + 4, b.y + 8);
    ctx.fillStyle = "#ffd36a";
    ctx.fillText(notif.msg.from, b.x + 4, b.y + 17);

    ctx.fillStyle = "#ffffff";
    const lines = wrapLines(notif.msg.text, b.width - 8);
    for (let i = 0; i < Math.min(2, lines.length); i++) {
        ctx.fillText(lines[i], b.x + 4, b.y + 26 + i * 8);
    }

    drawButton(textReplyButton, "REPLY (R)");
    drawButton(textIgnoreButton, "IGNORE (X)");

    // time left bar
    ctx.fillStyle = "#5aa9ff";
    ctx.fillRect(b.x + 1, b.y + b.height - 2, (b.width - 2) * Math.max(0, notif.left / TEXT_SHOW_MS), 1);
}

// returns true if the click was on the notification
function textClick(mouse) {
    if (!notif) return false;
    if (pointInRect(mouse, textReplyButton)) { replyToText(); return true; }
    if (pointInRect(mouse, textIgnoreButton)) { ignoreText(); return true; }
    return pointInRect(mouse, textBanner);
}

const tuesdayButton = { x: 90, y: 135, width: 140, height: 30 };

function goToTuesday() {
    if (typeof saveGame === "function") saveGame();
    window.location.href = "tuesday.html";
}

function drawDayComplete() {
    ctx.fillStyle = "#17261d";
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#72e58c";
    ctx.font = "15px monospace";
    ctx.fillText("MONDAY COMPLETE", 160, 45);
    ctx.fillStyle = "#ffffff";
    ctx.font = "9px monospace";
    ctx.fillText("It's 12:00 PM and the assignment is in.", 160, 75);
    ctx.fillText("Final Grade: " + gradeStatus, 160, 95);
    ctx.fillText("On to Tuesday...", 160, 115);
    drawButton(tuesdayButton, "GO TO TUESDAY");
}


// GAME LOOP


let lastFrameTime = performance.now();

function gameLoop() {

    const frameNow = performance.now();

    const frameDt = frameNow - lastFrameTime;

    lastFrameTime = frameNow;


    movePlayer();

    updateTV();

    tickClock(frameDt);

    tickTexts(frameDt);

    drawGame();


    requestAnimationFrame(
        gameLoop
    );
}

function restartGame() {

    // Return to the beginning
    gameState = "bedroom";
    currentTime = 9;

    // Reset assignment progress
    assignmentComplete = false;
    assignmentAttempts = 0;
    gradeStatus = "N/A";
    assignmentResultMessage = "";

    // Reset quiz progress
    quizQuestions = [];
    currentQuestion = 0;
    correctAnswers = 0;
    wrongAnswers = 0;
    quizButtons = [];
    tryAgainButton = null;
    assignmentBackButton = null;

    // Reset player
    player.x = 145;
    player.y = 145;

    // Clear status messages
    statusMessage = "";
    statusMessageEnd = 0;

    // Reset TV game
    tvScore = 0;
    tvHighScore = 0;
    tvStartTime = 0;
    tvPlayAgainButton = null;
    tvBackButton = null;

    // Clear movement keys
    for (const key in keys) {
        keys[key] = false;
    }

    deadlineRestartButton = null;

    // Reset clock + texts
    resetTexts();
    clockAcc = 0;
    
}






// START


gameLoop();