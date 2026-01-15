import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../roles/entities/role.entity';

export class UserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Alexa Kinuthia' })
  username: string;

  @ApiProperty({ example: 'alexa@kinuthia.com' })
  email: string;

  @ApiProperty({ example: 'alexaKinuthiaStrongPassword123' })
  password: string;

  @ApiProperty({
    example: [],
    description: 'Array of roles',
    type: [Role],
  })
  roles: Role[];

  @ApiProperty({ example: [], description: 'Welfare Assessments' })
  welfareAssessments?: any[];

  @ApiProperty({ example: [], description: 'Vet Visits' })
  vetVisits?: any[];

  @ApiProperty({ example: [], description: 'Animals' })
  animals?: any[];

  @ApiProperty({ example: '2025-08-02T19:55:08.885Z' })
  createdAt?: string;

  @ApiProperty({ example: '2025-08-02T19:55:08.885Z' })
  updatedAt?: string;

  constructor(partial: Partial<UserDto>) {
    Object.assign(this, partial);
  }
}
