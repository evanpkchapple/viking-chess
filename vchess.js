const gameboard = document.querySelector("#gameboard");
const curr_player = document.querySelector("#curr_player");
const info_display = document.querySelector("#info_display");
const width = 11;
let player_go = 'black';
curr_player.textContent = player_go

const black_spots = [3, 4, 5, 6, 7, 16, 33, 44, 55, 56, 66, 77, 43, 54, 65, 76, 87, 64, 104, 113, 114, 115, 116, 117];

const white_spots = [58, 59, 60, 61, 62, 48, 49, 50, 38, 70, 71, 72, 82];

const goal_spots = [0, 10, 120, 110];

const illegal_spaces = [0, 10, 120, 110];

const restrictedSquares = [0, 10, 120, 110, 60];
const alwaysHostile = [0, 10, 120, 110];

const throne = [60];

const start_formation = "3bbbbb8b88b4w4bb3www3bbb1wwkww1bbb3www3bb4w4b88b8bbbbb3";

var start_array = get_starting_positions();

function get_starting_positions() {
    let start_array = []
    for (let i=0; i < start_formation.length; i++) {
        var curr_char = start_formation.charAt(i);
        if (is_numeric_char(curr_char)) {
            for (let j=0; j < parseInt(curr_char); j++) {
                start_array.push('');
            }
        }
        else {
            if (curr_char === 'b') {
                start_array.push(black_piece);
            } else if (curr_char === 'w') {
                start_array.push(white_piece);
            } else if (curr_char === 'k') {
                start_array.push(white_king);
            }
        }
    }
    return start_array;
}

function is_numeric_char(c) {
    return /\d/.test(c);
}

function create_board(board_state) {
    board_state.forEach((piece, i) => {
        let square = document.createElement('div');
        square.classList.add('square');
        square.innerHTML = piece;
        square.firstChild?.setAttribute('draggable', true);
        square.setAttribute('square-id', i);
        gameboard.append(square);
        if (black_spots.includes(i)) {
            square.classList.add('black-mark');
        } else if (white_spots.includes(i)) {
            square.classList.add('white-mark');
        } else if (goal_spots.includes(i)) {
            square.classList.add('goal-mark');
        } else {
            square.classList.add('normal-mark');
        }
        if (piece === black_piece) {
            square.firstChild.classList.add('black');
        } else if (piece === white_piece || piece === white_king) {
            square.firstChild.classList.add('white');
        }
    })
}

create_board(start_array);

const all_squares = document.querySelectorAll("#gameboard .square")

all_squares.forEach(square => {
    square.addEventListener("dragstart", drag_start);
    square.addEventListener("dragover", drag_over);
    square.addEventListener("drop", drag_drop);
})

let start_position_id
let dragged_element

function drag_start (e) {
    start_position_id = e.target.parentNode.getAttribute("square-id");
    dragged_element = e.target;
}

function drag_over (e) {
    e.preventDefault();
}

function drag_drop (e) {
    e.stopPropagation();
    const correct_go = dragged_element.classList.contains(player_go);
    const targetId = parseInt(e.target.getAttribute('square-id')) || parseInt(e.target.parentNode.getAttribute('square-id'))
    const taken =  e.target.classList.contains("piece");
    const opponent_go = player_go === 'white' ? 'black' : 'white';
    const space_occupied = e.target.hasChildNodes();
    let legal_space = true;
    
    if ((illegal_spaces.includes(parseInt(e.target.parentNode.getAttribute('square-id'))) || 
         illegal_spaces.includes(parseInt(e.target.getAttribute('square-id')))) && 
         dragged_element.id === 'pawn') {
        legal_space = false;
    }

    if (!correct_go) {
        info_display.textContent = 'This piece cannot move as it is not their turn.';
        setTimeout(() =>info_display.textContent="", 2000);
        return
    }
    
    if (!legal_space) {
        info_display.textContent = 'This piece may not land on this square.';
        setTimeout(() =>info_display.textContent="", 2000);
        return
    }
    
    if (space_occupied) {
        info_display.textContent = "This space is occupied, therefore cannot be landed on.";
        setTimeout(() =>info_display.textContent="", 2000);
        return
    }
    
    if (!check_valid(targetId)) {
        info_display.textContent = 'Invalid move.';
        setTimeout(() => info_display.textContent="", 2000);
        return;
    }
    
    e.target.append(dragged_element);
    checkCaptures(targetId);
    checkWinCondition();
    change_player();
}

function checkWinCondition() {
    const kingSquare = document.querySelector('#king').parentNode.getAttribute('square-id');
    const kingSquareId = parseInt(kingSquare);

    // Check if the king has reached a corner square
    if (goal_spots.includes(kingSquareId)) {
        info_display.textContent = "The king has escaped! Defenders win.";
        return;
    }

    if (checkStalemate(player_go)) {
        info_display.textContent = `${player_go.charAt(0).toUpperCase() + player_go.slice(1)} cannot move, they lose the game.`;
        return;
    }

    if (areDefendersEncircled()) {
        info_display.textContent = "Attackers win. The defenders are completely surrounded.";
        return;
    }
}

function areDefendersEncircled() {
    const defenders = Array.from(document.querySelectorAll('.white:not(#king)'));
    const freeSquares = new Set();

    // Flood-fill from each defender to see if they can reach the board edge
    defenders.forEach(defender => {
        floodFill(parseInt(defender.parentNode.getAttribute('square-id')), freeSquares);
    });

    // If no free squares touch the edge, defenders are encircled
    for (let id of freeSquares) {
        if (isEdge(id)) {
            return false;  // Found an escape path to the edge
        }
    }
    return true;  // No escape path found
}

function floodFill(startId, freeSquares) {
    const stack = [startId];
    const directions = [1, -1, width, -width];

    while (stack.length) {
        const currentId = stack.pop();
        if (freeSquares.has(currentId)) continue;

        freeSquares.add(currentId);
        directions.forEach(direction => {
            const neighborId = currentId + direction;
            if (isValid(neighborId) && !isHostileSquare(neighborId) && document.querySelector(`[square-id="${neighborId}"]`).firstChild === null) {
                stack.push(neighborId);
            }
        });
    }
}

function isValid(squareId) {
    return squareId >= 0 && squareId < width * width; // Assuming a square board
}

function isHostileSquare(squareId) {
    return document.querySelector(`[square-id="${squareId}"]`).firstChild?.classList.contains('black');
}

function isEdge(squareId) {
    return squareId % width === 0 || squareId % width === width - 1 || Math.floor(squareId / width) === 0 || Math.floor(squareId / width) === width - 1;
}

function checkStalemate(playerClass) {
    let pieces = document.querySelectorAll(`.${playerClass}`);
    return Array.from(pieces).every(piece => {
        let squareId = parseInt(piece.parentNode.getAttribute('square-id'));
        return !canMove(squareId, piece.id);
    });
}

function canMove(squareId, pieceType) {
    const directions = pieceType === 'king' ? [1, -1, width, -width] : [width, -width]; // Kings move in all directions, pawns might be restricted
    return directions.some(direction => {
        const targetId = squareId + direction;
        if (!document.querySelector(`[square-id="${targetId}"]`)) return false; // Out of bounds
        return isPathClear(squareId, targetId, direction);
    });
}


function isKingCaptured(kingSquareId) {
    const surroundingIds = [kingSquareId + 1, kingSquareId - 1, kingSquareId + width, kingSquareId - width];
    const isNextToThrone = throne.includes(kingSquareId - width) || throne.includes(kingSquareId + width) ||
                           throne.includes(kingSquareId - 1) || throne.includes(kingSquareId + 1);

    let captureCount = 0;
    surroundingIds.forEach(id => {
        const square = document.querySelector(`[square-id="${id}"]`);
        if (square && square.firstChild && square.firstChild.classList.contains('black')) {
            captureCount++;
        } else if (isHostileSquare(id)) {
            captureCount++;
        }
    });

    if (isNextToThrone) {
        return captureCount === 4; // King next to the throne needs all four sides covered
    } else {
        return captureCount === 4; // Regular capture check
    }
}


function checkCaptures(targetId) {
    checkDirection(targetId, width);  // Vertical check
    checkDirection(targetId, 1);      // Horizontal check
    // After moving pieces, always check if king is captured
    const kingSquare = document.querySelector('#king').parentNode.getAttribute('square-id');
    if (isKingCaptured(parseInt(kingSquare))) {
        info_display.textContent = "The king is captured! Attackers win.";
    }
}

function checkDirection(targetId, step) {
    const currentPlayerClass = player_go === 'black' ? 'black' : 'white';
    const opponentPlayerClass = player_go === 'white' ? 'black' : 'white';

    // Check in both directions from the targetId
    [1, -1].forEach(direction => {
        let nextId = targetId + step * direction;
        let nextSquare = document.querySelector(`[square-id="${nextId}"]`);
        let beyondId = nextId + step * direction;
        let beyondSquare = document.querySelector(`[square-id="${beyondId}"]`);

        if (nextSquare && nextSquare.firstChild && nextSquare.firstChild.classList.contains(opponentPlayerClass)) {
            if (beyondSquare && (beyondSquare.firstChild && beyondSquare.firstChild.classList.contains(currentPlayerClass) || 
                                 isHostileSquare(beyondId) && beyondSquare.firstChild === null)) {
                // Capture the opponent piece unless it's a king
                if (nextSquare.firstChild.id !== 'king') {
                    nextSquare.innerHTML = '';  // Remove the captured piece
                    info_display.textContent = "Captured an opponent's piece!";
                    setTimeout(() => info_display.textContent = "", 2000);
                }
            }
        }
    });
}

function isHostileSquare(squareId) {
    return alwaysHostile.includes(squareId) || (squareId === 60 && !document.querySelector('[square-id="60"]').firstChild);
}


function check_valid(targetId) {
    const startId = parseInt(start_position_id);
    const piece = dragged_element.id;
    const deltaY = targetId - startId;
    const stepY = width * (deltaY < 0 ? -1 : 1);
    const stepX = (deltaY < 0 ? -1 : 1); 

    if (restrictedSquares.includes(targetId) && piece !== 'king') {
        return false;
    }

    if (piece === 'pawn') {
        return checkMoveValidity(deltaY, stepY, stepX, startId);
    } else if (piece === 'king') {
        return Math.abs(deltaY) === 1 || Math.abs(deltaY) === width;
    }
    return false;
}

function checkMoveValidity(deltaY, stepY, stepX, startId) {
    if (Math.abs(deltaY) % width === 0 && isPathClear(startId, startId + deltaY, stepY)) {
        return true;
    }
    if (Math.floor(startId / width) === Math.floor((startId + deltaY) / width) && isPathClear(startId, startId + deltaY, stepX)) {
        return true;
    }
    return false;
}



function isPathClear(startId, targetId, step) {
    if (Math.abs(step) === width) {
        for (let i = step; Math.abs(i) <= Math.abs(targetId - startId); i += step) {
            if (document.querySelector(`[square-id="${startId + i}"]`).firstChild) {
                return false;
            }
        }
    } else {
        const startRow = Math.floor(startId / width);
        const targetRow = Math.floor(targetId / width);
        if (startRow !== targetRow) return false;
        for (let i = step; Math.abs(i) < Math.abs(targetId - startId); i += step) {
            if (document.querySelector(`[square-id="${startId + i}"]`).firstChild) {
                return false;
            }
        }
    }
    return true;
}

function change_player() {
    if (player_go === 'black') {
        player_go = 'white';
        curr_player.textContent = player_go;
    } else {
        player_go = 'black';
        curr_player.textContent = player_go;
    }
}