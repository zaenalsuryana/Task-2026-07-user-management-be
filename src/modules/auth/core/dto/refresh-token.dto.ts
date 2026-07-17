import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
    @ApiProperty({
        example:    
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxxxxxxxxxxxxxx',
        description: 'Refresh token yang diperoleh saat login',  
    })
    @IsString()
    @IsNotEmpty()
    refresh_token: string;
}