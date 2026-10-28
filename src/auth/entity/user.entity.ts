import { ApiProperty } from '@nestjs/swagger';

export class User {
  @ApiProperty({ example: 'Robus' })
  name: string;

  @ApiProperty({ example: 'robus@example.com', format: 'email' })
  email: string;
}
