import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
    @ApiProperty({
        example: 'Passwordlama123',
        description: 'Password lama',
    })
    @IsString()
    @IsNotEmpty()
    old_password: string;

    @ApiProperty({
        example: 'PasswordBaru123',
        description: 'Password baru',
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    new_password: string;
}