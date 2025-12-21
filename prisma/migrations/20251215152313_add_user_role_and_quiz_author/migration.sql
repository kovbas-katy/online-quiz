-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- AlterTable: Add role to users
ALTER TABLE "users" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';

-- AlterTable: Add authorId as nullable first
ALTER TABLE "quizzes" ADD COLUMN "authorId" TEXT;

-- Set authorId for existing quizzes to the first user (or any existing user)
UPDATE "quizzes" SET "authorId" = (SELECT "id" FROM "users" LIMIT 1) WHERE "authorId" IS NULL;

-- Make authorId NOT NULL after data migration
ALTER TABLE "quizzes" ALTER COLUMN "authorId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "quizzes_authorId_idx" ON "quizzes"("authorId");

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
