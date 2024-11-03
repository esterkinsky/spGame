const cellSize = 75;
const board = document.getElementById('game-board');
const modalWindowBlock =  document.getElementById('modal');
const gameBlock = document.querySelector('.game');
const timerBlock = document.getElementById('timer');
const moveCounterBlock = document.getElementById('move-counter');

let time = 0;
let movesCount = 0;
let timerInterval = null;
let isDrawing = false;
let gridSize = 5;
let currentColor = '';
let paths = {};
let canvas = null;
let ctx = null;

const fixedAnimals = [
    { index: 0, value: 1, color: 'red' },
    { index: 4, value: 1, color: 'red' },
    { index: 6, value: 2, color: 'blue' },
    { index: 10, value: 2, color: 'blue' },
    { index: 12, value: 3, color: 'green' },
    { index: 14, value: 3, color: 'green' }
];

const STORAGE_KEY = 'gameResults';
let userName;

function generateUserName() {
    const results = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    const lastId = Object.keys(results).length;
    userName = `user${lastId + 1}`;
}

function getBestResult(user) {
    const results = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return results[user] || { time: Infinity, moves: Infinity };
}

function saveResult(time, moves) {
    const results = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    const bestResult = getBestResult(userName);

    if (time < bestResult.time) {
        results[userName] = { time, moves };
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
    document.querySelectorAll('#modal > div').forEach(modal => { 
        if (modal.classList.contains(modalType)) {
            modal.style.display = 'flex';
        } else {
            modal.style.display = 'none';
        }
    });
}

function renderAllResults() {
    const resultsContainer = document.querySelector('.results');
    const results = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    
    const sortedResults = Object.entries(results).sort(([, a], [, b]) => {
        if (a.time !== b.time) return a.time - b.time;
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
        </tr>
    `;

    // Заполняем таблицу результатами
    sortedResults.forEach(([user, { time, moves }], index) => {
        const row = document.createElement('tr');
        
        // Добавляем класс для выделения текущего пользователя
        if (user === userName) {
            row.classList.add('highlight');
        }

        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${user}</td>
            <td>${formatTime(time)}</td>
            <td>${moves}</td>
        `;

        table.appendChild(row);
    });

    resultsContainer.appendChild(table);
}


function endGame() {
    clearInterval(timerInterval);
    saveResult(time, movesCount);
    document.querySelector('.end-game p').innerHTML = `Вы закончили игру за ${formatTime(time)} и потратили ${movesCount} ходов`;
    renderAllResults();
    renderModal('end-game');
}

function checkWin() {
    const isWin = Object.keys(paths).every(color => {
        const path = paths[color];
        if (path.length < 2) return false;

        const startCellIndex = path[0];
        const endCellIndex = path[path.length - 1];

        return fixedAnimals.some(animal => 
            (animal.index === startCellIndex || animal.index === endCellIndex) &&
            animal.color === color
        );
    });

    isWin && endGame();
}

function createBoard(size) {
    board.innerHTML = ''; 
    board.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
    board.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;

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
            cell.textContent = animal.value;
            cell.style.color = animal.color;
            cell.addEventListener('mousedown', clearPath);
        }

        cell.addEventListener('mousedown', startPath);
        cell.addEventListener('mouseenter', drawPath);
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

function drawPath(e) {
    if (!isDrawing) return;

    const cellIndex = parseInt(e.target.getAttribute('data-index'));
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
}

// Рисование линии между двумя индексами ячеек
function drawLine(index1, index2, color) {
    const boardRect = board.getBoundingClientRect();

    const cell1 = document.querySelector(`[data-index="${index1}"]`).getBoundingClientRect();
    const cell2 = document.querySelector(`[data-index="${index2}"]`).getBoundingClientRect();

    const startX = cell1.left + cell1.width / 2 - boardRect.left;
    const startY = cell1.top + cell1.height / 2 - boardRect.top;
    const endX = cell2.left + cell2.width / 2 - boardRect.left;
    const endY = cell2.top + cell2.height / 2 - boardRect.top;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
}

function drawCircle(cellIndex, color) {
    const boardRect = board.getBoundingClientRect();
    const cell = document.querySelector(`[data-index="${cellIndex}"]`).getBoundingClientRect();

    const centerX = cell.left + cell.width / 2 - boardRect.left;
    const centerY = cell.top + cell.height / 2 - boardRect.top;
    const radius = 6;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fill();
}

function startGame() {
    createBoard(gridSize);
    time = 0;
    movesCount = 0;
    clearInterval(timerInterval);
    updateTimeContent();
    updateMoveCounterContent();

    gameBlock.style.display = 'flex';
    modalWindowBlock.style.display = 'none';
    timerInterval = setInterval(() => {
        time++;
        updateTimeContent();
    }, 1000);
}

window.addEventListener('load', () => {
    Object.values(document.querySelectorAll('.start')).forEach(button => button.addEventListener('click', startGame));
    Object.values(document.querySelectorAll('.result-button')).forEach(button => button.addEventListener('click', () => renderModal('info')));
    document.querySelector('.to-main-button').addEventListener('click', () => {
        renderModal('start-game')
        gameBlock.style.display = 'none';
    });
    generateUserName();
    renderAllResults();
    renderModal('start-game');
});

