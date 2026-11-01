-- AlterTable
ALTER TABLE "hubs" ADD COLUMN     "notice" TEXT,
ADD COLUMN     "notice_until" TIMESTAMPTZ(3),
ADD COLUMN     "online_paused" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "heartbeats" (
    "name" TEXT NOT NULL,
    "at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "heartbeats_pkey" PRIMARY KEY ("name")
);
