-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CredentialProvider" ADD VALUE 'GOOGLE';
ALTER TYPE "CredentialProvider" ADD VALUE 'TWITTER';
ALTER TYPE "CredentialProvider" ADD VALUE 'LINKEDIN';
ALTER TYPE "CredentialProvider" ADD VALUE 'TIKTOK';
ALTER TYPE "CredentialProvider" ADD VALUE 'YOUTUBE';
ALTER TYPE "CredentialProvider" ADD VALUE 'PINTEREST';
ALTER TYPE "CredentialProvider" ADD VALUE 'WHATSAPP';
ALTER TYPE "CredentialProvider" ADD VALUE 'MERCADOLIBRE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Platform" ADD VALUE 'TWITTER';
ALTER TYPE "Platform" ADD VALUE 'LINKEDIN';
ALTER TYPE "Platform" ADD VALUE 'TIKTOK';
ALTER TYPE "Platform" ADD VALUE 'YOUTUBE';
ALTER TYPE "Platform" ADD VALUE 'PINTEREST';
ALTER TYPE "Platform" ADD VALUE 'META_ADS';
ALTER TYPE "Platform" ADD VALUE 'GOOGLE_ADS';
ALTER TYPE "Platform" ADD VALUE 'WHATSAPP';
ALTER TYPE "Platform" ADD VALUE 'MERCADOLIBRE';
ALTER TYPE "Platform" ADD VALUE 'DISCORD';
ALTER TYPE "Platform" ADD VALUE 'TELEGRAM';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserCredentialProvider" ADD VALUE 'TWITTER';
ALTER TYPE "UserCredentialProvider" ADD VALUE 'LINKEDIN';
ALTER TYPE "UserCredentialProvider" ADD VALUE 'TIKTOK';
ALTER TYPE "UserCredentialProvider" ADD VALUE 'YOUTUBE';
ALTER TYPE "UserCredentialProvider" ADD VALUE 'PINTEREST';
ALTER TYPE "UserCredentialProvider" ADD VALUE 'GOOGLE';
ALTER TYPE "UserCredentialProvider" ADD VALUE 'WHATSAPP';
ALTER TYPE "UserCredentialProvider" ADD VALUE 'MERCADOLIBRE';
