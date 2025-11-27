"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Copy, LogOut, RefreshCw, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ModeToggle } from "./mode-toggle";

// Types (should match convex/games.ts)
type Player = "purple" | "green";

// --- Client-side Game Logic for Validation ---
function getNeighbors(row: number, col: number): [number, number][] {
    const neighbors: [number, number][] = [];
    // 1. Vertical connections
    if (row > 0) neighbors.push([row - 1, col]);
    if (row < 2) neighbors.push([row + 1, col]);
    // 2. Horizontal connections
    if (row === 1) {
        // Bridge
        if (col > 0) neighbors.push([row, col - 1]);
        if (col < 3) neighbors.push([row, col + 1]);
    } else {
        // Top/Bottom
        if (col === 0) neighbors.push([row, 1]);
        if (col === 1) neighbors.push([row, 0]);
        if (col === 2) neighbors.push([row, 3]);
        if (col === 3) neighbors.push([row, 2]);
    }
    return neighbors;
}

export default function OnlineGameBoard() {
    const router = useRouter();
    const [playerToken, setPlayerToken] = useState<string>("");
    const [gameId, setGameId] = useState<Id<"games"> | null>(null);
    const [inviteCode, setInviteCode] = useState<string | null>(null);
    const [joinInput, setJoinInput] = useState("");

    // Convex hooks
    const createGame = useMutation(api.games.create);
    const joinGame = useMutation(api.games.join);
    const makeMove = useMutation(api.games.move);
    const leaveGame = useMutation(api.games.leave);
    const gameState = useQuery(api.games.get, gameId ? { gameId } : "skip");

    // Local selection state
    const [selectedPiece, setSelectedPiece] = useState<[number, number] | null>(
        null
    );
    const [validMoves, setValidMoves] = useState<[number, number][]>([]);

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
        try {
            const result = await createGame({ playerToken });
            setGameId(result.gameId);
            setInviteCode(result.inviteCode);
        } catch (error) {
            console.error("Failed to create game:", error);
            alert("Failed to create game. Please try again.");
        }
    };

    const handleJoinGame = async () => {
        if (!playerToken || !joinInput) return;
        try {
            const result = await joinGame({
                inviteCode: joinInput.toUpperCase(),
                playerToken,
            });
            setGameId(result.gameId);
            // We don't have the invite code in the result if we just joined, but we can get it from gameState later
        } catch (error) {
            alert("Failed to join game: " + error);
        }
    };

    const handleLeaveGame = async () => {
        if (gameId && playerToken) {
            await leaveGame({ gameId, playerToken });
        }
        setGameId(null);
        setInviteCode(null);
        setSelectedPiece(null);
        setValidMoves([]);
        router.push("/"); // Or just stay on /online but reset state
    };

    const handleNodeClick = async (row: number, col: number) => {
        if (!gameState || !gameId || !playerToken) return;
        if (gameState.status !== "playing") return;

        const piece = gameState.board[row][col];
        const myColor =
            gameState.playerPurple === playerToken ? "purple" : "green";
        const isMyTurn = gameState.currentPlayer === myColor;

        // If it's not my turn, I can't do anything
        if (!isMyTurn) return;

        // Select my piece
        if (piece === myColor) {
            if (
                selectedPiece &&
                selectedPiece[0] === row &&
                selectedPiece[1] === col
            ) {
                // Deselect
                setSelectedPiece(null);
                setValidMoves([]);
            } else {
                // Select
                setSelectedPiece([row, col]);
                const neighbors = getNeighbors(row, col);
                const moves = neighbors.filter(
                    ([r, c]) => gameState.board[r][c] === null
                );
                setValidMoves(moves);
            }
            return;
        }

        // Move to empty spot
        if (selectedPiece && piece === null) {
            const isValid = validMoves.some(([r, c]) => r === row && c === col);
            if (isValid) {
                try {
                    await makeMove({
                        gameId,
                        playerToken,
                        from: selectedPiece,
                        to: [row, col],
                    });
                    setSelectedPiece(null);
                    setValidMoves([]);
                } catch (error) {
                    console.error("Move failed:", error);
                }
            }
        }
    };

    // --- Rendering Logic ---

    if (!gameId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-12 bg-[var(--background)] font-sans">
                <div className="w-full max-w-md flex justify-between items-center">
                    <button
                        onClick={() => router.push("/")}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <ModeToggle />
                </div>

                <div className="text-center space-y-2">
                    <h1 className="text-5xl font-light tracking-tight text-[var(--foreground)]">
                        Bridge Crossing
                    </h1>
                    <p className="text-muted-foreground tracking-widest uppercase text-xs font-medium">
                        Online Multiplayer
                    </p>
                </div>

                <div className="flex flex-col gap-6 w-full max-w-xs">
                    <button
                        onClick={handleCreateGame}
                        className="w-full py-4 px-6 rounded-2xl font-medium text-white bg-[var(--color-secondary)] shadow-lg shadow-[var(--color-secondary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                    >
                        Create New Game
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200 dark:border-gray-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[var(--background)] px-2 text-muted-foreground">
                                Or join existing
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="ENTER CODE"
                            value={joinInput}
                            onChange={(e) => setJoinInput(e.target.value)}
                            className="flex-1 px-4 py-3 rounded-xl border-none bg-white dark:bg-white/5 shadow-sm focus:ring-2 focus:ring-[var(--color-primary)] outline-none text-center font-mono uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
                            maxLength={6}
                        />
                        <button
                            onClick={handleJoinGame}
                            className="px-6 py-3 rounded-xl font-bold text-white bg-[var(--color-primary)] shadow-lg shadow-[var(--color-primary)]/20 hover:scale-[1.05] active:scale-[0.95] transition-all duration-300"
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
            <div className="flex items-center justify-center min-h-screen text-muted-foreground animate-pulse">
                Connecting...
            </div>
        );
    }

    const myColor = gameState.playerPurple === playerToken ? "purple" : "green";
    const isMyTurn = gameState.currentPlayer === myColor;
    const currentInviteCode = inviteCode || gameState.inviteCode;

    // --- Perspective Transformation ---
    // We want to render the board vertically.
    // If I am Purple (Col 0): Bottom is Col 0. Top is Col 3.
    // If I am Green (Col 3): Bottom is Col 3. Top is Col 0.
    // The board is logically 3 Rows x 4 Cols.
    // We will render a grid of 4 Rows x 3 Cols visually.

    // Helper to map logical (row, col) to visual (vRow, vCol)
    // Visual Grid: vRow 0..3 (Top to Bottom), vCol 0..2 (Left to Right)

    // If Purple:
    // vRow 0 (Top) -> Logical Col 3
    // vRow 3 (Bottom) -> Logical Col 0
    // vCol 0 (Left) -> Logical Row 0
    // vCol 2 (Right) -> Logical Row 2

    // If Green:
    // vRow 0 (Top) -> Logical Col 0
    // vRow 3 (Bottom) -> Logical Col 3
    // vCol 0 (Left) -> Logical Row 2 (To keep "my right" consistent? Or just mirror?)
    // Let's mirror: Green's "Left" should be Row 2?
    // Actually, let's keep it simple. If I rotate 180, Left becomes Right.
    // Purple: Left is Row 0.
    // Green: Left is Row 2.

    const getVisualPiece = (vRow: number, vCol: number) => {
        let logicalRow, logicalCol;

        if (myColor === "purple") {
            logicalCol = 3 - vRow; // vRow 0 -> Col 3, vRow 3 -> Col 0
            logicalRow = vCol; // vCol 0 -> Row 0, vCol 2 -> Row 2
        } else {
            logicalCol = vRow; // vRow 0 -> Col 0, vRow 3 -> Col 3
            logicalRow = 2 - vCol; // vCol 0 -> Row 2, vCol 2 -> Row 0
        }

        return {
            piece: gameState.board[logicalRow][logicalCol],
            row: logicalRow,
            col: logicalCol,
        };
    };

    // Coordinate system for Vertical Board (Percentages)
    // 3 Columns (Horizontal): 15%, 50%, 85%
    // 4 Rows (Vertical): 10%, 30%, 70%, 90%
    const V_COL_POSITIONS = [15, 50, 85];
    const V_ROW_POSITIONS = [10, 30, 70, 90];

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-screen p-4 bg-[var(--background)] font-sans">
            {/* Header */}
            <div className="w-full max-w-md flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleLeaveGame}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
                            Room Code
                        </span>
                        <button
                            onClick={() =>
                                navigator.clipboard.writeText(currentInviteCode)
                            }
                            className="flex items-center gap-2 text-lg font-mono font-bold tracking-widest hover:opacity-70 transition-opacity"
                        >
                            {currentInviteCode}
                            <Copy className="w-3 h-3 text-muted-foreground" />
                        </button>
                    </div>
                </div>
                <ModeToggle />
            </div>

            {/* Status Indicator */}
            <div className="mb-8 text-center">
                {gameState.status === "waiting" ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-sm font-medium animate-pulse">
                        Waiting for opponent...
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <div className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
                            Current Turn
                        </div>
                        <div
                            className={cn(
                                "text-2xl font-light transition-colors duration-500",
                                gameState.currentPlayer === "purple"
                                    ? "text-[var(--color-secondary)]"
                                    : "text-[var(--color-primary)]"
                            )}
                        >
                            {gameState.currentPlayer === myColor
                                ? "Your Turn"
                                : "Opponent's Turn"}
                        </div>
                    </div>
                )}
            </div>

            {/* Vertical Game Board */}
            <div className="relative w-full max-w-[360px] aspect-[1/1.6] bg-white dark:bg-white/5 rounded-[3rem] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                {/* SVG Lines Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    {/* We need to draw lines based on the visual grid (4 Rows x 3 Cols) */}
                    {/* Vertical Lines (Visual) -> Correspond to Logical Horizontal connections */}
                    {/* Left Col (Visual Col 0) -> Logical Row 0 (Purple) or Row 2 (Green) */}
                    {/* Middle Col (Visual Col 1) -> Logical Row 1 (Bridge) */}
                    {/* Right Col (Visual Col 2) -> Logical Row 2 (Purple) or Row 0 (Green) */}

                    {/* Visual Col 0 (Left Side) - Gap in middle */}
                    <line
                        x1={`${V_COL_POSITIONS[0]}%`}
                        y1={`${V_ROW_POSITIONS[0]}%`}
                        x2={`${V_COL_POSITIONS[0]}%`}
                        y2={`${V_ROW_POSITIONS[1]}%`}
                        stroke="var(--color-foreground)"
                        strokeOpacity="0.1"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <line
                        x1={`${V_COL_POSITIONS[0]}%`}
                        y1={`${V_ROW_POSITIONS[2]}%`}
                        x2={`${V_COL_POSITIONS[0]}%`}
                        y2={`${V_ROW_POSITIONS[3]}%`}
                        stroke="var(--color-foreground)"
                        strokeOpacity="0.1"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />

                    {/* Visual Col 1 (Middle) - The Bridge - Fully Connected */}
                    <line
                        x1={`${V_COL_POSITIONS[1]}%`}
                        y1={`${V_ROW_POSITIONS[0]}%`}
                        x2={`${V_COL_POSITIONS[1]}%`}
                        y2={`${V_ROW_POSITIONS[3]}%`}
                        stroke="var(--color-foreground)"
                        strokeOpacity="0.1"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />

                    {/* Visual Col 2 (Right Side) - Gap in middle */}
                    <line
                        x1={`${V_COL_POSITIONS[2]}%`}
                        y1={`${V_ROW_POSITIONS[0]}%`}
                        x2={`${V_COL_POSITIONS[2]}%`}
                        y2={`${V_ROW_POSITIONS[1]}%`}
                        stroke="var(--color-foreground)"
                        strokeOpacity="0.1"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <line
                        x1={`${V_COL_POSITIONS[2]}%`}
                        y1={`${V_ROW_POSITIONS[2]}%`}
                        x2={`${V_COL_POSITIONS[2]}%`}
                        y2={`${V_ROW_POSITIONS[3]}%`}
                        stroke="var(--color-foreground)"
                        strokeOpacity="0.1"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />

                    {/* Horizontal Lines (Visual) -> Correspond to Logical Vertical connections */}
                    {/* All visual rows are fully connected horizontally */}
                    {[0, 1, 2, 3].map((vRow) => (
                        <line
                            key={`h-${vRow}`}
                            x1={`${V_COL_POSITIONS[0]}%`}
                            y1={`${V_ROW_POSITIONS[vRow]}%`}
                            x2={`${V_COL_POSITIONS[2]}%`}
                            y2={`${V_ROW_POSITIONS[vRow]}%`}
                            stroke="var(--color-foreground)"
                            strokeOpacity="0.1"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    ))}
                </svg>

                {/* Nodes */}
                {Array.from({ length: 4 }).map((_, vRow) =>
                    Array.from({ length: 3 }).map((_, vCol) => {
                        const { piece, row, col } = getVisualPiece(vRow, vCol);
                        const isSelected =
                            selectedPiece?.[0] === row &&
                            selectedPiece?.[1] === col;
                        const isValid = validMoves.some(
                            ([r, c]) => r === row && c === col
                        );

                        return (
                            <div
                                key={`${vRow}-${vCol}`}
                                className="absolute"
                                style={{
                                    left: `${V_COL_POSITIONS[vCol]}%`,
                                    top: `${V_ROW_POSITIONS[vRow]}%`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            >
                                <Node
                                    row={row}
                                    col={col}
                                    piece={piece}
                                    isSelected={isSelected}
                                    isValidTarget={isValid}
                                    onClick={() => handleNodeClick(row, col)}
                                    isMyTurn={isMyTurn}
                                    myColor={myColor}
                                />
                            </div>
                        );
                    })
                )}
            </div>

            {/* Winner Overlay */}
            <AnimatePresence>
                {gameState.winner && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-md p-6"
                    >
                        <div className="bg-[var(--background)] p-10 rounded-[2rem] shadow-2xl max-w-sm w-full text-center border border-black/5 dark:border-white/10">
                            <div className="mb-8 flex justify-center">
                                <div
                                    className={cn(
                                        "p-6 rounded-full bg-gradient-to-br shadow-lg",
                                        gameState.winner === "purple"
                                            ? "from-[var(--color-secondary)] to-purple-400"
                                            : "from-[var(--color-primary)] to-emerald-400"
                                    )}
                                >
                                    <Trophy className="w-12 h-12 text-white" />
                                </div>
                            </div>
                            <h2 className="text-4xl font-light mb-2 text-[var(--foreground)]">
                                {gameState.winner === myColor
                                    ? "Victory"
                                    : "Defeat"}
                            </h2>
                            <p className="text-muted-foreground mb-10 text-sm uppercase tracking-widest">
                                {gameState.winner === "purple"
                                    ? "Purple"
                                    : "Green"}{" "}
                                Team Wins
                            </p>
                            <button
                                onClick={handleLeaveGame}
                                className="w-full py-4 px-6 rounded-2xl font-bold text-white bg-[var(--foreground)] hover:opacity-90 transition-transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Return to Lobby
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
    myColor: Player;
}

function Node({
    row,
    col,
    piece,
    isSelected,
    isValidTarget,
    onClick,
    isMyTurn,
    myColor,
}: NodeProps) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "relative w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300",
                // Base node style
                "bg-[var(--background)] border border-black/10 dark:border-white/10 shadow-inner",
                isValidTarget &&
                    "ring-2 ring-[var(--color-primary)] ring-offset-2 ring-offset-[var(--background)] z-10",
                !piece && isMyTurn && "hover:bg-black/5 dark:hover:bg-white/5"
            )}
        >
            {/* Valid Move Indicator */}
            {isValidTarget && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-3 h-3 rounded-full bg-[var(--color-primary)]"
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
                            "w-10 h-10 rounded-full shadow-lg z-20",
                            piece === "purple"
                                ? "bg-[var(--color-secondary)] shadow-[var(--color-secondary)]/40"
                                : "bg-[var(--color-primary)] shadow-[var(--color-primary)]/40",
                            isSelected &&
                                "ring-4 ring-white dark:ring-white/50 scale-110"
                        )}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
