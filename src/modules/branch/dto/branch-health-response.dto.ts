import { ApiProperty } from '@nestjs/swagger';

export class BranchHealthDataDto {
  @ApiProperty({ example: 'branch' })
  module!: 'branch';

  @ApiProperty({ example: 'ready' })
  status!: 'ready';

  @ApiProperty({ example: 0 })
  activeBranchCount!: number;
}

export class BranchHealthResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ type: BranchHealthDataDto })
  data!: BranchHealthDataDto;
}
