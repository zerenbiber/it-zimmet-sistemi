-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reset_code_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reset_code_expires_at" TIMESTAMP(3),
ADD COLUMN     "reset_code_hash" VARCHAR(128);
