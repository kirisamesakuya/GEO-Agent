-- AlterTable
CREATE SEQUENCE "User_userNo_seq";

ALTER TABLE "User" ADD COLUMN "userNo" INTEGER;

UPDATE "User"
SET "userNo" = nextval('"User_userNo_seq"')
WHERE "userNo" IS NULL;

ALTER TABLE "User" ALTER COLUMN "userNo" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "userNo" SET DEFAULT nextval('"User_userNo_seq"');
ALTER SEQUENCE "User_userNo_seq" OWNED BY "User"."userNo";

CREATE UNIQUE INDEX "User_userNo_key" ON "User"("userNo");
