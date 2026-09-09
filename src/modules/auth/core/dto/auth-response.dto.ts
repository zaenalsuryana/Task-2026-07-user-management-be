import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty()
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string | null;
    address?: string | null;
    birth_date?: Date | string | null;
    position: {
      id: number;
      name: string;
    };
    permissions: string[];
  };
}