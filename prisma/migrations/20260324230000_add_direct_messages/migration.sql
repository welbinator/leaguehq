-- Add DIRECT to ChatRoomType enum
ALTER TYPE "ChatRoomType" ADD VALUE IF NOT EXISTS 'DIRECT';

-- Make leagueId nullable on ChatRoom (DMs are not league-specific)
ALTER TABLE "ChatRoom" ALTER COLUMN "leagueId" DROP NOT NULL;
