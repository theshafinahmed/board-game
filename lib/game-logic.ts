export type Player = "purple" | "green";
export type Position = [number, number]; // [row, col]

export interface GameState {
    board: (Player | null)[][]; // 3x4 grid
    currentPlayer: Player;
    winner: Player | null;
    selectedPiece: Position | null;
    validMoves: Position[]; // Valid moves for the selected piece
}

export const INITIAL_BOARD: (Player | null)[][] = [
    ["purple", null, null, "green"],
    ["purple", null, null, "green"],
    ["purple", null, null, "green"],
];

// Adjacency logic based on the specific graph topology
export function getNeighbors(row: number, col: number): Position[] {
    const neighbors: Position[] = [];

    // Vertical connections (Always connected within column)
    if (row > 0) neighbors.push([row - 1, col]);
    if (row < 2) neighbors.push([row + 1, col]);

    // Horizontal connections
    if (row === 1) {
        // The Bridge: All connected horizontally
        if (col > 0) neighbors.push([row, col - 1]);
        if (col < 3) neighbors.push([row, col + 1]);
    } else {
        // Top and Bottom Rows: Gap between col 1 and 2
        // (0,0)-(0,1) and (0,2)-(0,3)
        // (2,0)-(2,1) and (2,2)-(2,3)
        if (col === 0) neighbors.push([row, 1]);
        if (col === 1) neighbors.push([row, 0]);
        if (col === 2) neighbors.push([row, 3]);
        if (col === 3) neighbors.push([row, 2]);
    }

    return neighbors;
}

export function isValidMove(
    board: (Player | null)[][],
    from: Position,
    to: Position
): boolean {
    const [toRow, toCol] = to;

    // Destination must be empty
    if (board[toRow][toCol] !== null) return false;

    // Must be a direct neighbor
    const neighbors = getNeighbors(from[0], from[1]);
    return neighbors.some(([r, c]) => r === toRow && c === toCol);
}

export function checkWinCondition(board: (Player | null)[][]): Player | null {
    // Purple wins if they occupy all of Green's starting column (col 3)
    const purpleWins =
        board[0][3] === "purple" &&
        board[1][3] === "purple" &&
        board[2][3] === "purple";

    if (purpleWins) return "purple";

    // Green wins if they occupy all of Purple's starting column (col 0)
    const greenWins =
        board[0][0] === "green" &&
        board[1][0] === "green" &&
        board[2][0] === "green";

    if (greenWins) return "green";

    return null;
}
