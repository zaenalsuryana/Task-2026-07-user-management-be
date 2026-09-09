import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsInt,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'bhagaskoro@kulidigital.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({ example: 'Bhagas Koro' })
  @IsString()
  @IsNotEmpty({ message: 'Fullname is required' })
  fullname: string;

  @ApiProperty({ example: 'Kuli Digital', required: false })
  @IsString()
  @IsOptional()
  company_name?: string;

  @ApiProperty({ example: '192.168.1.1' })
  @IsString()
  @IsNotEmpty({ message: 'IP Address is required' })
  ip_address: string;

  @ApiProperty({ example: 2, description: 'Position ID' })
  @IsInt({ message: 'Position ID must be an integer' })
  @IsNotEmpty({ message: 'Position ID is required' })
  position_id: string;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean = true;
}
