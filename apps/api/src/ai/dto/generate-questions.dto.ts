import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateQuestionsDto {
  @ApiProperty({ example: 'Senior Full Stack Developer with React and Node.js' })
  @IsString()
  jobDescription: string;

  @ApiProperty({ example: 'Software Engineer' })
  @IsString()
  role: string;
}
