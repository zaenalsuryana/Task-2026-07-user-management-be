import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @ApiProperty({
        example: 'your-reset-token',
    })

    @IsString()
    token: string;

    @ApiProperty({
        example: 'PasswordBaru123',
    })
    @IsString()
    @MinLength(8)
    password: string;
}