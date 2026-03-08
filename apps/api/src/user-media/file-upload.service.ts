// ============================================================
// File Upload Service — Multer-based file handling with storage
// ============================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/pdf',
  'text/plain',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export function getUploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly uploadDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.uploadDir = getUploadDir();
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    const dirs = [
      this.uploadDir,
      path.join(this.uploadDir, 'images'),
      path.join(this.uploadDir, 'videos'),
      path.join(this.uploadDir, 'audio'),
      path.join(this.uploadDir, 'documents'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created upload directory: ${dir}`);
      }
    }
  }

  /**
   * Validate uploaded file before processing
   */
  validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}. Tipos permitidos: imagen, video, audio, PDF`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }
  }

  /**
   * Check workspace storage limit before upload
   */
  async checkStorageLimit(
    workspaceId: string,
    fileSizeBytes: number,
  ): Promise<{ allowed: boolean; usedMb: number; limitMb: number }> {
    // Get current usage
    const usage = await this.prisma.userMedia.aggregate({
      _sum: { sizeBytes: true },
      where: {
        user: {
          workspaces: { some: { workspaceId } },
        },
      },
    });

    const usedBytes = usage._sum.sizeBytes || 0;

    // Get plan storage limit
    const sub = await this.prisma.subscription.findUnique({
      where: { workspaceId },
      include: { plan: true },
    });

    const limitMb = sub?.plan?.maxStorageMb ?? 100;
    const limitBytes = limitMb * 1024 * 1024;
    const usedMb = Math.round((usedBytes / (1024 * 1024)) * 100) / 100;

    // -1 means unlimited
    if (limitMb === -1) {
      return { allowed: true, usedMb, limitMb };
    }

    const allowed = usedBytes + fileSizeBytes <= limitBytes;
    return { allowed, usedMb, limitMb };
  }

  /**
   * Get the subfolder for a file based on its MIME type
   */
  getSubfolder(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'images';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'documents';
  }

  /**
   * Generate a unique filename for storage
   */
  generateFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50);
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${base}_${timestamp}_${random}${ext}`;
  }

  /**
   * Process and store an uploaded file
   */
  async processUpload(
    file: Express.Multer.File,
    userId: string,
    workspaceId: string,
    options: {
      folderId?: string;
      tags?: string[];
      category?: string;
    } = {},
  ) {
    this.validateFile(file);

    // Check storage limit
    const storageCheck = await this.checkStorageLimit(workspaceId, file.size);
    if (!storageCheck.allowed) {
      // Clean up temp file
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException(
        `Almacenamiento insuficiente. Usados: ${storageCheck.usedMb}MB / ${storageCheck.limitMb}MB. Actualiza tu plan.`,
      );
    }

    // Determine subfolder and final path
    const subfolder = this.getSubfolder(file.mimetype);
    const filename = this.generateFilename(file.originalname);
    const destDir = path.join(this.uploadDir, subfolder);
    const destPath = path.join(destDir, filename);

    // Move file from temp to final location
    if (file.path) {
      fs.renameSync(file.path, destPath);
    } else if (file.buffer) {
      fs.writeFileSync(destPath, file.buffer);
    }

    // Generate URL (relative for now; in prod this would be CDN/S3)
    const fileUrl = `/uploads/${subfolder}/${filename}`;

    // Determine category from mimetype if not provided
    const category = (options.category || 'OTHER') as any;

    // Create database record
    const media = await this.prisma.userMedia.create({
      data: {
        userId,
        filename: file.originalname,
        url: fileUrl,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        folderId: options.folderId || null,
        tags: options.tags || [],
        category,
      },
    });

    this.logger.log(
      `📁 File uploaded: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB) → ${fileUrl}`,
    );

    return media;
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl.startsWith('/uploads/')) return;

    const filePath = path.join(process.cwd(), fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.debug(`Deleted file: ${filePath}`);
    }
  }
}
