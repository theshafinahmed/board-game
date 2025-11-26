"use client";

import {
    INITIAL_BOARD,
    Player,
    Position,
    checkWinCondition,
    getNeighbors,
} from "@/lib/game-logic";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw, Trophy } from "lucide-react";
import { useState } from "react";
import { ModeToggle } from "./mode-toggle";

export default function GameBoard() {
    const [board, setBoard] = useState<(Player | null)[][]>(INITIAL_BOARD);
    const [currentPlayer, setCurrentPlayer] = useState<Player>("purple");
    const [winner, setWinner] = useState<Player | null>(null);
    const [selectedPiece, setSelectedPiece] = useState<Position | null>(null);
    const [validMoves, setValidMoves] = useState<Position[]>([]);

    // Reset game
    const resetGame = () => {
        setBoard([
            ["purple", null, null, "green"],
            ["purple", null, null, "green"],
            ["purple", null, null, "green"],
        ]);
        setCurrentPlayer("purple");
        setWinner(null);
        setSelectedPiece(null);
        setValidMoves([]);
    };

    const handleNodeClick = (row: number, col: number) => {
        if (winner) return;

        const clickedPiece = board[row][col];

        // Case 1: Select a piece
        if (clickedPiece === currentPlayer) {
            if (
                selectedPiece &&
                selectedPiece[0] === row &&
                selectedPiece[1] === col
            ) {
                // Deselect if clicking same piece
                setSelectedPiece(null);
                setValidMoves([]);
            } else {
                // Select new piece
                setSelectedPiece([row, col]);
                // Calculate valid moves
                const neighbors = getNeighbors(row, col);
                const moves = neighbors.filter(
                    ([r, c]) => board[r][c] === null
                );
                setValidMoves(moves);
            }
            return;
        }

        // Case 2: Move to an empty spot
        if (selectedPiece && clickedPiece === null) {
            const isValid = validMoves.some(([r, c]) => r === row && c === col);

            if (isValid) {
                // Execute move
                const newBoard = board.map((r) => [...r]);
                newBoard[selectedPiece[0]][selectedPiece[1]] = null;
                newBoard[row][col] = currentPlayer;

                setBoard(newBoard);

                // Check win
                const newWinner = checkWinCondition(newBoard);
                if (newWinner) {
                    setWinner(newWinner);
                } else {
                    // Switch turn
                    setCurrentPlayer(
                        currentPlayer === "purple" ? "green" : "purple"
                    );
                }

                // Reset selection
                setSelectedPiece(null);
                setValidMoves([]);
            }
        }
    };

    // Helper to check if a node is a valid move target
    const isValidTarget = (row: number, col: number) => {
        return validMoves.some(([r, c]) => r === row && c === col);
    };

    // Coordinate system for perfect alignment (percentages)
    const COL_POSITIONS = [10, 30, 70, 90];
    const ROW_POSITIONS = [15, 50, 85];

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-screen p-4">
            {/* Header / Status */}
            <div className="w-full max-w-2xl flex justify-end mb-4">
                <ModeToggle />
            </div>

            <div className="mb-8 text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tighter bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                    The Bridge Crossing
                </h1>

                <div className="flex items-center justify-center gap-4">
                    <div
                        className={cn(
                            "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 border-2",
                            currentPlayer === "purple"
                                ? "border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] shadow-[0_0_20px_rgba(111,102,217,0.3)]"
                                : "border-transparent text-muted-foreground opacity-50"
                        )}
                    >
                        Purple's Turn
                    </div>
                    <div
                        className={cn(
                            "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 border-2",
                            currentPlayer === "green"
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[0_0_20px_rgba(0,192,139,0.3)]"
                                : "border-transparent text-muted-foreground opacity-50"
                        )}
                    >
                        Green's Turn
                    </div>
                </div>
            </div>

            {/* Game Board Container */}
            <div className="relative w-full max-w-[600px] aspect-[1.6/1] bg-white/5 dark:bg-black/20 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl">
                {/* SVG Lines Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {/* Vertical Connections */}
                    {[0, 1, 2, 3].map((col) => (
                        <line
                            key={`v-${col}`}
                            x1={`${COL_POSITIONS[col]}%`}
                            y1={`${ROW_POSITIONS[0]}%`}
                            x2={`${COL_POSITIONS[col]}%`}
                            y2={`${ROW_POSITIONS[2]}%`}
                            stroke="var(--color-foreground)"
                            strokeOpacity="0.2"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                    ))}

                    {/* Horizontal Row 0 (Gap in middle) */}
                    <line
                        x1={`${COL_POSITIONS[0]}%`}
                        y1={`${ROW_POSITIONS[0]}%`}
                        x2={`${COL_POSITIONS[1]}%`}
                        y2={`${ROW_POSITIONS[0]}%`}
                        stroke="var(--color-foreground)"
                        strokeOpacity="0.2"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                    <line
                        x1={`${COL_POSITIONS[2]}%`}
                        y1={`${ROW_POSITIONS[0]}%`}
                        x2={`${COL_POSITIONS[3]}%`}
                        y2={`${ROW_POSITIONS[0]}%`}
                        stroke="var(--color-foreground)"
                        strokeOpacity="0.2"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />

                    {/* Horizontal Row 1 (The Bridge - Fully Connected) */}
                    <line
                        x1={`${COL_POSITIONS[0]}%`}
                        y1={`${ROW_POSITIONS[1]}%`}
                        x2={`${COL_POSITIONS[3]}%`}
                        y2={`${ROW_POSITIONS[1]}%`}
                        stroke="var(--color-foreground)"
                        strokeOpacity="0.2"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />

                    {/* Horizontal Row 2 (Gap in middle) */}
                    <line
                        x1={`${COL_POSITIONS[0]}%`}
                        y1={`${ROW_POSITIONS[2]}%`}
                        x2={`${COL_POSITIONS[1]}%`}
                        y2={`${ROW_POSITIONS[2]}%`}
                        stroke="var(--color-foreground)"
                        strokeOpacity="0.2"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                    <line
                        x1={`${COL_POSITIONS[2]}%`}
                        y1={`${ROW_POSITIONS[2]}%`}
                        x2={`${COL_POSITIONS[3]}%`}
                        y2={`${ROW_POSITIONS[2]}%`}
                        stroke="var(--color-foreground)"
                        strokeOpacity="0.2"
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                </svg>

                {/* Nodes */}
                {board.map((row, rIndex) =>
                    row.map((piece, cIndex) => (
                        <div
                            key={`${rIndex}-${cIndex}`}
                            className="absolute"
                            style={{
                                left: `${COL_POSITIONS[cIndex]}%`,
                                top: `${ROW_POSITIONS[rIndex]}%`,
                                transform: "translate(-50%, -50%)",
                            }}
                        >
                            <Node
                                row={rIndex}
                                col={cIndex}
                                piece={piece}
                                isSelected={
                                    selectedPiece?.[0] === rIndex &&
                                    selectedPiece?.[1] === cIndex
                                }
                                isValidTarget={isValidTarget(rIndex, cIndex)}
                                onClick={() => handleNodeClick(rIndex, cIndex)}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* Winner Overlay */}
            <AnimatePresence>
                {winner && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    >
                        <div className="bg-[var(--background)] p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-white/10">
                            <div className="mb-6 flex justify-center">
                                <div
                                    className={cn(
                                        "p-4 rounded-full",
                                        winner === "purple"
                                            ? "bg-[var(--color-secondary)]/20"
                                            : "bg-[var(--color-primary)]/20"
                                    )}
                                >
                                    <Trophy
                                        className={cn(
                                            "w-12 h-12",
                                            winner === "purple"
                                                ? "text-[var(--color-secondary)]"
                                                : "text-[var(--color-primary)]"
                                        )}
                                    />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold mb-2">
                                {winner === "purple" ? "Purple" : "Green"} Wins!
                            </h2>
                            <p className="text-muted-foreground mb-8">
                                Congratulations on crossing the bridge
                                successfully.
                            </p>
                            <button
                                onClick={resetGame}
                                className="w-full py-3 px-6 rounded-xl font-bold text-white transition-transform active:scale-95 flex items-center justify-center gap-2"
                                style={{
                                    backgroundColor:
                                        winner === "purple"
                                            ? "var(--color-secondary)"
                                            : "var(--color-primary)",
                                }}
                            >
                                <RefreshCw className="w-5 h-5" />
                                Play Again
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Controls */}
            <div className="mt-8">
                <button
                    onClick={resetGame}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Reset Board
                </button>
            </div>
        </div>
    );
}

interface NodeProps {
    row: number;
    col: number;
    piece: Player | null;
    isSelected: boolean;
    isValidTarget: boolean;
    onClick: () => void;
}

function Node({
    row,
    col,
    piece,
    isSelected,
    isValidTarget,
    onClick,
}: NodeProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "relative w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300",
                // Base node style
                "bg-[var(--background)] border-2",
                isValidTarget
                    ? "border-[var(--color-primary)] shadow-[0_0_15px_var(--color-primary)] scale-110 z-20"
                    : "border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500"
            )}
        >
            {/* Valid Move Indicator */}
            {isValidTarget && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-[var(--color-primary)]/20 rounded-full animate-pulse"
                />
            )}

            {/* Piece */}
            <AnimatePresence mode="wait">
                {piece && (
                    <motion.div
                        layoutId={`piece-${piece}-${row}-${col}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className={cn(
                            "w-8 h-8 md:w-12 md:h-12 rounded-full shadow-lg z-10",
                            piece === "purple"
                                ? "bg-[var(--color-secondary)]"
                                : "bg-[var(--color-primary)]",
                            isSelected &&
                                "ring-4 ring-white dark:ring-white/50 scale-110"
                        )}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
