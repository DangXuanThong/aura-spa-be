import { OmitType } from '@nestjs/swagger';
import { CreateStaffDto } from './create-staff.dto';

// Position is always StaffPosition.Manager — omit it from the request body.
export class CreateManagerDto extends OmitType(CreateStaffDto, ['position'] as const) {}
