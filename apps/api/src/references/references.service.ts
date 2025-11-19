import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reference } from '../database/entities';
import { SubmitReferenceDto } from './dto/submit-reference.dto';
import { ReferenceStatus } from '../database/entities';

@Injectable()
export class ReferencesService {
  constructor(
    @InjectRepository(Reference)
    private referenceRepository: Repository<Reference>,
  ) {}

  async getReference(id: string) {
    const reference = await this.referenceRepository.findOne({
      where: { id },
      relations: ['seeker', 'referrer'],
    });

    if (!reference) {
      throw new NotFoundException('Reference not found');
    }

    return {
      id: reference.id,
      seekerId: reference.seekerId,
      referrerId: reference.referrerId,
      status: reference.status,
      rcsScore: reference.rcsScore,
      format: reference.format,
    };
  }

  async submitReference(id: string, dto: SubmitReferenceDto) {
    const reference = await this.referenceRepository.findOne({ where: { id } });
    if (!reference) {
      throw new NotFoundException('Reference not found');
    }

    // TODO: Upload media content to storage
    // TODO: Trigger AI verification
    // TODO: Calculate RCS score

    const rcsScore = Math.floor(Math.random() * 100); // Placeholder

    reference.format = dto.format;
    reference.contentUrl = dto.content;
    reference.attachments = dto.attachments || null;
    reference.status = ReferenceStatus.COMPLETED;
    reference.rcsScore = rcsScore;
    reference.submittedAt = new Date();

    await this.referenceRepository.save(reference);

    return {
      referenceId: reference.id,
      rcsScore,
    };
  }
}
