import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    games: defineTable({
        board: v.array(
            v.array(v.union(v.literal("purple"), v.literal("green"), v.null()))
        ),
        currentPlayer: v.union(v.literal("purple"), v.literal("green")),
        winner: v.union(v.literal("purple"), v.literal("green"), v.null()),
        playerPurple: v.string(), // Token/ID of player 1
        playerGreen: v.union(v.string(), v.null()), // Token/ID of player 2 (null if waiting)
        status: v.union(
            v.literal("waiting"),
            v.literal("playing"),
            v.literal("finished")
        ),
    }),
});
