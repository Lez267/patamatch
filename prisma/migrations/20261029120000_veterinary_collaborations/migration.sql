CREATE TYPE "CollaborationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'ENDED');

CREATE TABLE "VeterinaryProfile" (
    "userId" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "specialty" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "available" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VeterinaryProfile_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "Collaboration" (
    "id" TEXT NOT NULL,
    "shelterId" TEXT NOT NULL,
    "veterinarianId" TEXT NOT NULL,
    "status" "CollaborationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Collaboration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Collaboration_shelterId_veterinarianId_key" ON "Collaboration"("shelterId", "veterinarianId");
CREATE INDEX "Collaboration_veterinarianId_status_idx" ON "Collaboration"("veterinarianId", "status");
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
ALTER TABLE "VeterinaryProfile" ADD CONSTRAINT "VeterinaryProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_shelterId_fkey" FOREIGN KEY ("shelterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Collaboration" ADD CONSTRAINT "Collaboration_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
