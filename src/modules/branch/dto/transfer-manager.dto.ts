import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class TransferManagerDto {
  @ApiProperty({ example: '2', description: 'ID of the target branch to transfer manager to' })
  @IsNotEmpty()
  @IsString()
  targetBranchId!: string;
}
