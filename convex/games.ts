import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// --- Game Logic Helpers (Ported from lib/game-logic.ts) ---

type Player = "purple" | "green";
type Board = (Player | null)[][];
type Position = [number, number];

const INITIAL_BOARD: Board = [
    ["purple", null, null, "green"],
    ["purple", null, null, "green"],
    ["purple", null, null, "green"],
];

function getNeighbors(row: number, col: number): Position[] {
    const neighbors: Position[] = [];

    // 1. Vertical connections (always connected)
    if (row > 0) neighbors.push([row - 1, col]);
    if (row < 2) neighbors.push([row + 1, col]);

    // 2. Horizontal connections
    // Row 1 (Middle): The Bridge - Fully connected
    if (row === 1) {
        if (col > 0) neighbors.push([row, col - 1]);
        if (col < 3) neighbors.push([row, col + 1]);
    }
    // Row 0 & 2: Top and Bottom - Gap in the middle (between col 1 and 2)
    else {
        // Left side (0-1)
        if (col === 0) neighbors.push([row, 1]);
        if (col === 1) neighbors.push([row, 0]);
        // Right side (2-3)
        if (col === 2) neighbors.push([row, 3]);
        if (col === 3) neighbors.push([row, 2]);
    }

    return neighbors;
}

function checkWinCondition(board: Board): Player | null {
    // Purple wins if they occupy all of Green's starting column (Col 3)
    const purpleWins =
        board[0][3] === "purple" &&
        board[1][3] === "purple" &&
        board[2][3] === "purple";
    if (purpleWins) return "purple";

    // Green wins if they occupy all of Purple's starting column (Col 0)
    const greenWins =
        board[0][0] === "green" &&
        board[1][0] === "green" &&
        board[2][0] === "green";
    if (greenWins) return "green";

    return null;
}

// --- Convex Functions ---

export const create = mutation({
    args: { playerToken: v.string() },
    handler: async (ctx, args) => {
        const gameId = await ctx.db.insert("games", {
            board: INITIAL_BOARD,
            currentPlayer: "purple",
            winner: null,
            playerPurple: args.playerToken,
            playerGreen: null,
            status: "waiting",
        });
        return gameId;
    },
});

export const join = mutation({
    args: { gameId: v.id("games"), playerToken: v.string() },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) throw new Error("Game not found");
        if (game.status !== "waiting")
            throw new Error("Game is not waiting for players");
        if (game.playerPurple === args.playerToken)
            throw new Error("You are already in this game");

        await ctx.db.patch(args.gameId, {
            playerGreen: args.playerToken,
            status: "playing",
        });
        return "green";
    },
});

export const get = query({
    args: { gameId: v.id("games") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.gameId);
    },
});

export const move = mutation({
    args: {
        gameId: v.id("games"),
        playerToken: v.string(),
        from: v.array(v.number()), // [row, col]
        to: v.array(v.number()), // [row, col]
    },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) throw new Error("Game not found");
        if (game.status !== "playing") throw new Error("Game is not active");
        if (game.winner) throw new Error("Game is over");

        // Validate turn
        const isPurple = game.playerPurple === args.playerToken;
        const isGreen = game.playerGreen === args.playerToken;

        if (!isPurple && !isGreen)
            throw new Error("You are not a player in this game");

        const playerColor = isPurple ? "purple" : "green";
        if (game.currentPlayer !== playerColor)
            throw new Error("It is not your turn");

        const [fromRow, fromCol] = args.from;
        const [toRow, toCol] = args.to;

        // Validate move logic
        const board = game.board as Board;

        // Check ownership
        if (board[fromRow][fromCol] !== playerColor)
            throw new Error("That is not your piece");

        // Check destination empty
        if (board[toRow][toCol] !== null)
            throw new Error("Destination is not empty");

        // Check adjacency
        const neighbors = getNeighbors(fromRow, fromCol);
        const isNeighbor = neighbors.some(
            ([r, c]) => r === toRow && c === toCol
        );
        if (!isNeighbor)
            throw new Error("Invalid move: Nodes are not connected");

        // Execute move
        const newBoard = board.map((row) => [...row]);
        newBoard[fromRow][fromCol] = null;
        newBoard[toRow][toCol] = playerColor;

        // Check win
        const winner = checkWinCondition(newBoard);

        await ctx.db.patch(args.gameId, {
            board: newBoard,
            currentPlayer: playerColor === "purple" ? "green" : "purple",
            winner: winner,
            status: winner ? "finished" : "playing",
        });
    },
});
