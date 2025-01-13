const size = window.innerWidth / 8;
const cellSize = size > 75 ? 75 : size;
const endGameDuration = 1500;
const board = document.getElementById('game-board');
const modalWindowBlock =  document.getElementById('modal');
const gameBlock = document.querySelector('.game');
const timerBlock = document.getElementById('timer');
const moveCounterBlock = document.getElementById('move-counter');
const levelCounterBlock = document.getElementById('level-counter');
const toggleAudioButton = document.getElementById('toggle-audio-button');
const music = document.getElementById('music');
const musicIcon = document.querySelector('#toggle-audio-button img');

let time = 0;
let movesCount = 0;
let timerInterval = null;
let isDrawing = false;
let currentColor = '';
let paths = {};
let canvas = null;
let ctx = null;
let isAudioPlaying = true;
let isMoving = false;
let currentLevel = 1;
let fixedAnimals = {};

const animalCount = 3;
const levelCount = 10;
const gridSize = 6;

const STORAGE_KEY = 'gameResults';
let userName;

const animal1 = new Image();
animal1.src = '/assets/белка.png';
const animal2 = new Image();
animal2.src = '/assets/заяц.jpg';
const animal3 = new Image();
animal3.src = '/assets/дятел.jpg';

const house1 = new Image();
house1.src = '/assets/дупло.jpg';
const house2 = new Image();
house2.src = '/assets/нора.png';
const house3 = new Image();
house3.src = '/assets/гнездо.jpg';

function clearGameInfo () {
    time = 0;
    movesCount = 0;
    currentLevel = 1;
}

function generateUserName() {
    const results = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    const lastId = Object.keys(results).length
    userName = `user${lastId + 1}`;
    results[userName] = {
        time: null,
        moves: null,
        levels: null,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

function getBestResult(user) {
    const results = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return results[user] || { time: Infinity, moves: Infinity, levels: Infinity };
}

function saveResult(time, moves, levels) {
    const results = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    const bestResult = getBestResult(userName);
    if (results[userName].levels < levels) {
        results[userName] = { time, moves, levels };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    } else if (bestResult.time === null || time < bestResult.time) {
        results[userName] = { time, moves, levels };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function updateTimeContent() {
    timerBlock.textContent = `Время: ${formatTime(time)}`;
}

function updateMoveCounterContent() {
    moveCounterBlock.textContent = `Количество ходов: ${movesCount}`;
}

function updateLevelCounterContent() {
    levelCounterBlock.textContent = `Уровень ${currentLevel}/${levelCount}`;
}

function isNeighboringCell(cellIndex1, cellIndex2) {
    const row1 = Math.floor(cellIndex1 / gridSize);
    const col1 = cellIndex1 % gridSize;
    const row2 = Math.floor(cellIndex2 / gridSize);
    const col2 = cellIndex2 % gridSize;

    const isAdjacentRow = row1 === row2 && Math.abs(col1 - col2) === 1;
    const isAdjacentCol = col1 === col2 && Math.abs(row1 - row2) === 1;

    return isAdjacentRow || isAdjacentCol;
}

function renderModal(modalType) {
    modalWindowBlock.style.display = 'flex';
    modalWindowBlock.classList.add('show'); // Добавляем класс для плавного появления
    document.querySelectorAll('#modal > div').forEach(modal => { 
        if (modal.classList.contains(modalType)) {
            modal.style.display = 'flex';
        } else {
            modal.style.display = 'none';
        }
    });
}

function hideModal() {
    modalWindowBlock.classList.remove('show'); // Убираем класс для скрытия
    setTimeout(() => {
        modalWindowBlock.style.display = 'none'; // Через 300 мс полностью скрываем
    }, 300);
}

function renderAllResults() {
    const resultsContainer = document.querySelector('.results');
    const results = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    
    const sortedResults = Object.entries(results).sort(([, a], [, b]) => {
        // Сначала сортируем по количеству уровней (по убыванию)
        if (b.levels !== a.levels) {
            return b.levels - a.levels;
        }
        
        // Затем сортируем по времени (по возрастанию)
        if (a.time === null && b.time !== null) return 1; // Если у a нет времени, он идет ниже
        if (b.time === null && a.time !== null) return -1; // Если у b нет времени, он идет ниже
        if (a.time !== b.time) return a.time - b.time;
    
        // Наконец, сортируем по количеству ходов (по возрастанию)
        return a.moves - b.moves;
    });
    
    resultsContainer.innerHTML = '';

    const table = document.createElement('table');
    table.classList.add('results-table');

    table.innerHTML = `
        <tr>
            <th>Место</th>
            <th>Имя</th>
            <th>Время</th>
            <th>Ходы</th>
            <th>Уровней пройдено</th>
        </tr>
    `;

    // Заполняем таблицу результатами
    sortedResults.forEach(([user, { time, moves, levels }], index) => {
        const row = document.createElement('tr');
        
        // Добавляем класс для выделения текущего пользователя
        if (user === userName) {
            row.classList.add('highlight');
        }

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user}</td>
            <td>${time ? formatTime(time) : '-'}</td>
            <td>${moves ? moves : '-'}</td>
            <td>${levels ? levels : '-'}</td>
        `;

        table.appendChild(row);
    });

    resultsContainer.appendChild(table);
}

function launchFireworks() {
    const end = Date.now() + endGameDuration;

    (function frame() {
        confetti({
            particleCount: 5,
            angle: Math.random() * 360,
            spread: 60,
            startVelocity: 30,
            origin: {
                x: Math.random(),
                y: Math.random() - 0.2,
            }
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    })();
}

function launchSmallConfetti(x, y) {
    confetti({
        particleCount: 20,
        spread: 20,
        startVelocity: 10,
        origin: { x, y }
    });
}

async function endGame() {
    clearInterval(timerInterval);
    saveResult(time, movesCount, currentLevel);
    const colors = Object.keys(paths);
    isMoving = true;
    for (const color of colors) {
        await moveAnimalToHome(color);
    }
    launchFireworks();
    const isGameEnd = currentLevel === levelCount;
    if (isGameEnd) {
        document.querySelector('.end-game p').innerHTML = `Вы закончили игру за ${formatTime(time)} и потратили ${movesCount} ходов`
    } else {
        document.querySelector('.end-level p').innerHTML = `Вы прошли уровень ${currentLevel} из ${levelCount}`
    }
    renderAllResults();
    renderModal(isGameEnd ? 'end-game' : 'end-level');
    isMoving = false;
}

function checkWin() {
    const isWin = Object.keys(paths).every(color => {
        const path = paths[color];
        if (path.length < 2) return false;

        const startCellIndex = path[0];
        const endCellIndex = path[path.length - 1];

        const filteredFixedAnimals = fixedAnimals.filter(el => el.color === color);

        return filteredFixedAnimals.find(el => el.index === startCellIndex) && filteredFixedAnimals.find(el => el.index === endCellIndex)
    });

    isWin && endGame();
}

function createBoard(size) {
    board.innerHTML = ''; 
    board.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
    board.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;

    board.addEventListener('touchstart', startPath);
    board.addEventListener('touchmove', (e) => {
        if(isMoving) return;
        const { clientX, clientY } = e.changedTouches[0];
        const el = document.elementFromPoint(clientX,clientY);
        drawPath(el)
    })
    board.addEventListener('touchend', endPath)

    // Инициализация возможных путей
    paths = fixedAnimals.reduce((acc, { color }) => {
        return {
            ...acc,
            [color]: [],
        };
    }, {});

    // Создаем ячейки
    for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.setAttribute('data-index', i);
        cell.style.width = cellSize;
        cell.style.height = cellSize;

        const animal = fixedAnimals.find(item => item.index === i);
        if (animal) {
            cell.style.color = animal.color;
            cell.addEventListener('mousedown', clearPath);
            cell.setAttribute('data-animal', animal.isAnimal);
        }

        cell.addEventListener('mousedown', startPath);
        cell.addEventListener('mouseenter', (e) => drawPath(e.target));
        cell.addEventListener('mouseup', endPath);
        board.appendChild(cell);
    }

    // Canvas для линий
    const canvasSize = cellSize * gridSize;
    canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    canvas.id = 'canvas';
    board.appendChild(canvas);
    ctx = canvas.getContext('2d');
}

function startPath(e) {
    if (isMoving) return;
    const cellIndex = parseInt(e.target.getAttribute('data-index'));
    const animal = fixedAnimals.find(({ index }) => index === cellIndex );

    if (animal) {
        isDrawing = true;
        currentColor = animal.color;
        paths[currentColor] = [cellIndex];
        movesCount++;
    } else {
        const path = Object.entries(paths).find(([ , value]) => value.includes(cellIndex));

        if (path) {
            const [ color, value ] = path;
            const index = value.indexOf(cellIndex);
            paths[color] = value.slice(0, index + 1);
            isDrawing = true;
            currentColor = color;
            movesCount++;
        }
    }
    updateMoveCounterContent();
    redrawCanvas();
}

function endPath() {
    if(isMoving) return;
    if (isDrawing) {
        isDrawing = false;
        currentColor = null;
    }
}

function clearPath() {
    if (currentColor) {
        paths[currentColor] = [];
        redrawCanvas();
    }
}

function drawPath(target) {
    if (!isDrawing || isMoving) return;

    const cellIndex = parseInt(target.getAttribute('data-index'));
    const preLastPathIndex = paths[currentColor].slice(-2, -1)[0]; 

    // Не рисуем если индекс клетки уже есть в каком-то пути
    // Допускаем возможность движения пути назад
    if (
        Object.keys(paths).some(key => paths[key].includes(cellIndex)) 
        && cellIndex !== preLastPathIndex
    ) {
        return;    
    }

    // Не рисуем, если клетка не является соседней
    if (!isNeighboringCell(cellIndex, paths[currentColor].slice(-1)[0])) {
        return;
    }

    // Не рисуем если попали на число, но другого цвета
    if (fixedAnimals.some(value => value.index === cellIndex && value.color !== currentColor)) {
        return;
    }

    // Добавляем клетку либо отступаем на шаг назад
    if (cellIndex === preLastPathIndex) {
        paths[currentColor].pop();
    } else {
        paths[currentColor].push(cellIndex);
    }
    
   // Завершаем рисование только если путь замкнулся между двумя разными точками одного цвета
   const startCellIndex = paths[currentColor][0];
   const isPathComplete = 
       cellIndex !== startCellIndex && // текущая клетка - не стартовая
       fixedAnimals.some(value => value.index === cellIndex && value.color === currentColor); // клетка того же цвета
   
   if (isPathComplete) {
       isDrawing = false;
       currentColor = null;
    }
    
    redrawCanvas();

    isPathComplete && checkWin();
}

function getCenterByIndex(index) {
    const boardRect = board.getBoundingClientRect();
    const cell = document.querySelector(`[data-index="${index}"]`).getBoundingClientRect();

    return {x: cell.left + cell.width / 2 - boardRect.left, y: cell.top + cell.height / 2 - boardRect.top};
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    Object.keys(paths).forEach(color => {
        const path = paths[color];
        if (path.length < 2) return;

        for (let i = 0; i < path.length - 1; i++) {
            drawLine(path[i], path[i + 1], color);
        }

        drawCircle(path[0], color);
        drawCircle(path[path.length - 1], color);
    });

    fixedAnimals.forEach(({index, image}) => drawImageInCell(index, image));
}

function drawImageInCell(index, image) {
    const imageSize = cellSize - 5;
    const {x,y} = getCenterByIndex(index);

    ctx.drawImage(image, x - imageSize / 2, y - imageSize / 2, imageSize, imageSize);
}

// Рисование линии между двумя индексами ячеек
function drawLine(index1, index2, color) {
    const {x: x1, y: y1} = getCenterByIndex(index1);
    const {x: x2, y: y2} = getCenterByIndex(index2);

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function drawCircle(cellIndex, color) {
    const {x, y} = getCenterByIndex(cellIndex);
    const radius = 6;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
}

function startLevel() {
    clearInterval(timerInterval);
    fixedAnimals = generateLevel();
    createBoard(gridSize);
    updateTimeContent();
    updateMoveCounterContent();
    updateLevelCounterContent();    
    redrawCanvas();

    Object.values(document.querySelectorAll('.header-control')).forEach((coontrol) => coontrol.style.display = 'block');

    hideModal();
    timerInterval = setInterval(() => {
        time++;
        updateTimeContent();
    }, 1000);
}

function restartLevel() {
    clearInterval(timerInterval);
    movesCount++;
    fixedAnimals = generateLevel();
    createBoard(gridSize);
    updateTimeContent();
    updateMoveCounterContent();
    updateLevelCounterContent();
    timerInterval = setInterval(() => {
        time++;
        updateTimeContent();
    }, 1000);
    redrawCanvas();
}

function toggleAudio() {
    if (isAudioPlaying) {
        music.pause();
        musicIcon.src = 'assets/mute.png';
        isAudioPlaying = false;
    } else {
        music.play()
        musicIcon.src = 'assets/volume.png';
        isAudioPlaying = true;
    }
}

// функция для генерации индексов
function shuffle () {
    const matrix = Array.from({ length: gridSize }, (_, row) => 
        Array.from({ length: gridSize }, (_, col) => row * gridSize + col)
    );

    // Извлекаем внутренние элементы
    const array = [];
    for (let i = 1; i < gridSize - 1; i++) {
        for (let j = 1; j < gridSize - 1; j++) {
            array.push(matrix[i][j]);
        }
    }

    var i = 0
      , j = 0
      , temp = null
  
    for (i = array.length - 1; i > 0; i -= 1) {
      j = Math.floor(Math.random() * (i + 1))
      temp = array[i]
      array[i] = array[j]
      array[j] = temp
    }

    return array;
}

function generateLevel () {
    const indexes = shuffle();

    return [
        { index: indexes[0], value: 1, color: 'red', image: animal1, isAnimal: true },
        { index: indexes[1], value: 1, color: 'red', image: house1, isAnimal: false },
        { index: indexes[2], value: 2, color: 'blue', image: animal2, isAnimal: true, },
        { index: indexes[3], value: 2, color: 'blue', image: house2, isAnimal: false },
        { index: indexes[4], value: 3, color: 'green', image: animal3, isAnimal: true },
        { index: indexes[5], value: 3, color: 'green', image: house3, isAnimal: false },
    ]
}

function moveAnimalToHome(color) {
    return new Promise((resolve) => {
        const index = fixedAnimals.findIndex(el => el.color === color && el.isAnimal);
        const animal = fixedAnimals[index];
        
        const path = paths[color][0] === animal.index ? paths[color] : paths[color].reverse();
        let i = 0;

        function moveNext() {
            if (i < path.length) {
                fixedAnimals[index].index = path[i];
                redrawCanvas();
                i++;
                setTimeout(moveNext, 500);
                if (i === path.length) {
                    const { x, y } = document.querySelector(`[data-index="${path[path.length - 1]}"]`).getBoundingClientRect();

                    launchSmallConfetti((x + cellSize / 2) / window.innerWidth, (y + cellSize / 2) / window.innerHeight);
                };
            } else {
                resolve(); // Разрешаем промис, когда движение завершено
            }
        }

        moveNext(); // Запускаем движение
    });
}

window.addEventListener('load', () => {
    Object.values(document.querySelectorAll('.start')).forEach(button => button.addEventListener('click', () => {
        clearGameInfo();
        startLevel();
    }));
    Object.values(document.querySelectorAll('.result-button')).forEach(button => button.addEventListener('click', () => {
        renderAllResults();
        renderModal('info')
    }));
    Object.values(document.querySelectorAll('.to-main-button')).forEach(button => button.addEventListener('click', () =>{
        Object.values(document.querySelectorAll('.header-control')).forEach((coontrol) => coontrol.style.display = 'none');
        board.innerHTML = '';
        renderModal('lobby');
    }));    
    document.querySelector('.restart').addEventListener('click', restartLevel);
    document.querySelector('.next-level').addEventListener('click', () => {
        currentLevel++;
        startLevel();
    });
    generateUserName();
    renderModal('start-game');
    
    document.getElementById('full-screen-button').addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });
    
    document.body.addEventListener('click', () => music.play(), { once: true });
    toggleAudioButton.addEventListener('click', toggleAudio)
});

