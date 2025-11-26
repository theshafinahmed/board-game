import GameBoard from "@/components/game-board";

export default function Home() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
            <GameBoard />
        </main>
    );
}
