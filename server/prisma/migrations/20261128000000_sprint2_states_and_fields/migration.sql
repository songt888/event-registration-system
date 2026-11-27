-- AlterEnum
ALTER TYPE "EventStatus" ADD VALUE 'CLOSED';
ALTER TYPE "EventStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "RegistrationStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "registrationDeadline" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN "cancelledAt" TIMESTAMPTZ(3);
