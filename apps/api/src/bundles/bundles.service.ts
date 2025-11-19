import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Bundle, Reference } from '../database/entities';
import { CreateBundleDto } from './dto/create-bundle.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BundlesService {
  constructor(
    @InjectRepository(Bundle)
    private bundleRepository: Repository<Bundle>,
    @InjectRepository(Reference)
    private referenceRepository: Repository<Reference>,
  ) {}

  async createBundle(seekerId: string, dto: CreateBundleDto) {
    // Fetch references
    const references = await this.referenceRepository.find({
      where: {
        id: In(dto.referenceIds),
        seekerId,
      },
    });

    if (references.length !== dto.referenceIds.length) {
      throw new NotFoundException('Some references not found');
    }

    // Calculate aggregated RCS
    const totalRCS = references.reduce((sum, ref) => sum + (ref.rcsScore || 0), 0);
    const aggregatedRCS = references.length > 0 ? totalRCS / references.length : 0;

    // Generate unique share link
    const shareLink = `https://deepref.ai/bundles/${this.generateShareCode()}`;

    // Hash password if provided
    const hashedPassword = dto.password ? await bcrypt.hash(dto.password, 10) : null;

    const bundle = this.bundleRepository.create({
      seekerId,
      title: dto.title,
      description: dto.description || null,
      shareLink,
      password: hashedPassword,
      aggregatedRCS,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
    });

    const savedBundle = await this.bundleRepository.save(bundle);

    // Associate references - would need to save the join table entries
    // For simplicity, this is omitted in the stub

    return {
      bundleId: savedBundle.id,
      shareLink: savedBundle.shareLink,
    };
  }

  async getBundle(id: string) {
    const bundle = await this.bundleRepository.findOne({
      where: { id },
      relations: ['references', 'seeker'],
    });

    if (!bundle) {
      throw new NotFoundException('Bundle not found');
    }

    return {
      id: bundle.id,
      title: bundle.title,
      aggregatedRCS: bundle.aggregatedRCS,
      references: bundle.references || [],
    };
  }

  private generateShareCode(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
