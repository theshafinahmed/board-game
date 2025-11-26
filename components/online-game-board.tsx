"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { Copy, RefreshCw, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { ModeToggle } from "./mode-toggle";

// Types (should match convex/games.ts)
type Player = "purple" | "green";

export default function OnlineGameBoard() {
    const [playerToken, setPlayerToken] = useState<string>("");
    const [gameId, setGameId] = useState<Id<"games"> | null>(null);
    const [joinInput, setJoinInput] = useState("");

    // Convex hooks
    const createGame = useMutation(api.games.create);
    const joinGame = useMutation(api.games.join);
    const makeMove = useMutation(api.games.move);
    const gameState = useQuery(api.games.get, gameId ? { gameId } : "skip");

    // Local selection state
    const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(
        null
    );

    // Initialize player token
    useEffect(() => {
        let token = localStorage.getItem("bridge_player_token");
        if (!token) {
            token = Math.random().toString(36).substring(7);
            localStorage.setItem("bridge_player_token", token);
        }
        setPlayerToken(token);
    }, []);

    const handleCreateGame = async () => {
        if (!playerToken) return;
        const newGameId = await createGame({ playerToken });
        setGameId(newGameId);
    };

    const handleJoinGame = async () => {
        if (!playerToken || !joinInput) return;
        try {
            // Cast string to ID - in real app validate format
            const id = joinInput as Id<"games">;
            await joinGame({ gameId: id, playerToken });
            setGameId(id);
        } catch (error) {
            alert("Failed to join game: " + error);
        }
    };

    const handleNodeClick = async (row: number, col: number) => {
        if (!gameState || !gameId || !playerToken) return;
        if (gameState.status !== "playing") return;

        const piece = gameState.board[row][col];
        const isMyTurn =
            gameState.currentPlayer ===
            (gameState.playerPurple === playerToken ? "purple" : "green");

        // If it's not my turn, I can't do anything (except maybe select to see valid moves? No, keep it simple)
        if (!isMyTurn) return;

        const myColor =
            gameState.playerPurple === playerToken ? "purple" : "green";

        // Select my piece
        if (piece === myColor) {
            setSelectedPiece([row, col]);
            return;
        }

        // Move to empty spot
        if (selectedPiece && piece === null) {
            try {
                await makeMove({
                    gameId,
                    playerToken,
                    from: selectedPiece,
                    to: [row, col],
                });
                setSelectedPiece(null);
            } catch (error) {
                console.error("Move failed:", error);
                // Optionally show error toast
            }
        }
    };

    // Helper to check valid moves (client-side prediction/visuals)
    // We can reuse the logic from lib/game-logic or just rely on server validation for now.
    // For UI feedback, we should ideally reuse the logic.
    // I'll skip complex validation visualization for this step to ensure basic connectivity first.

    // Coordinate system for perfect alignment (percentages)
    const COL_POSITIONS = [10, 30, 70, 90];
    const ROW_POSITIONS = [15, 50, 85];

    if (!gameId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8">
                <div className="w-full max-w-2xl flex justify-end">
                    <ModeToggle />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                    The Bridge Crossing (Online)
                </h1>
                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button
                        onClick={handleCreateGame}
                        className="w-full py-3 px-6 rounded-xl font-bold text-white bg-[var(--color-secondary)] hover:opacity-90 transition-all"
                    >
                        Create New Game
                    </button>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Enter Game ID"
                            value={joinInput}
                            onChange={(e) => setJoinInput(e.target.value)}
                            className="flex-1 px-4 py-2 rounded-xl border bg-background"
                        />
                        <button
                            onClick={handleJoinGame}
                            className="px-4 py-2 rounded-xl font-bold text-white bg-[var(--color-primary)] hover:opacity-90 transition-all"
                        >
                            Join
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!gameState) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                Loading game...
            </div>
        );
    }

    const myColor = gameState.playerPurple === playerToken ? "purple" : "green";
    const isMyTurn = gameState.currentPlayer === myColor;
    const opponentConnected = !!gameState.playerGreen;

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-screen p-4">
            {/* Header / Status */}
            <div className="w-full max-w-2xl flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Game ID: {gameId}</span>
                    <button
                        onClick={() => navigator.clipboard.writeText(gameId)}
                        className="p-1 hover:text-foreground"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                </div>
                <ModeToggle />
            </div>

            <div className="mb-8 text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tighter bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] bg-clip-text text-transparent">
                    {gameState.status === "waiting"
                        ? "Waiting for Opponent..."
                        : "The Bridge Crossing"}
                </h1>

                {gameState.status === "playing" && (
                    <div className="flex items-center justify-center gap-4">
                        <div
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 border-2",
                                gameState.currentPlayer === "purple"
                                    ? "border-[var(--color-secondary)] bg-[var(--color-secondary)]/10 text-[var(--color-secondary)] shadow-[0_0_20px_rgba(111,102,217,0.3)]"
                                    : "border-transparent text-muted-foreground opacity-50"
                            )}
                        >
                            Purple {myColor === "purple" && "(You)"}
                        </div>
                        <div
                            className={cn(
                                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 border-2",
                                gameState.currentPlayer === "green"
                                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] shadow-[0_0_20px_rgba(0,192,139,0.3)]"
                                    : "border-transparent text-muted-foreground opacity-50"
                            )}
                        >
                            Green {myColor === "green" && "(You)"}
                        </div>
                    </div>
                )}
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
                {gameState.board.map((row, rIndex) =>
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
                                isValidTarget={false} // TODO: Add move validation visualization
                                onClick={() => handleNodeClick(rIndex, cIndex)}
                                isMyTurn={isMyTurn}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* Winner Overlay */}
            <AnimatePresence>
                {gameState.winner && (
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
                                        gameState.winner === "purple"
                                            ? "bg-[var(--color-secondary)]/20"
                                            : "bg-[var(--color-primary)]/20"
                                    )}
                                >
                                    <Trophy
                                        className={cn(
                                            "w-12 h-12",
                                            gameState.winner === "purple"
                                                ? "text-[var(--color-secondary)]"
                                                : "text-[var(--color-primary)]"
                                        )}
                                    />
                                </div>
                            </div>
                            <h2 className="text-3xl font-bold mb-2">
                                {gameState.winner === "purple"
                                    ? "Purple"
                                    : "Green"}{" "}
                                Wins!
                            </h2>
                            <p className="text-muted-foreground mb-8">
                                {gameState.winner === myColor
                                    ? "You Won!"
                                    : "You Lost!"}
                            </p>
                            <button
                                onClick={() => setGameId(null)}
                                className="w-full py-3 px-6 rounded-xl font-bold text-white transition-transform active:scale-95 flex items-center justify-center gap-2 bg-[var(--color-secondary)]"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Back to Lobby
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
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
    isMyTurn: boolean;
}

function Node({
    row,
    col,
    piece,
    isSelected,
    isValidTarget,
    onClick,
    isMyTurn,
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
                    : "border-gray-300 dark:border-gray-700",
                // Hover effect only if it's my turn and I can interact
                isMyTurn &&
                    !piece &&
                    "hover:border-gray-400 dark:hover:border-gray-500",
                isMyTurn && piece && "hover:ring-2 hover:ring-white/50"
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
