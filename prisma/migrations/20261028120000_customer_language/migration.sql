-- Messages in the Customer's language (ADR 0021): the language they last
-- shopped in. Everyone so far shopped in English.
CREATE TYPE "Lang" AS ENUM ('en', 'fil');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN "lang" "Lang" NOT NULL DEFAULT 'en';
