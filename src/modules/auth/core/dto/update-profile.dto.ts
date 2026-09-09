import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    first_name?: string;

    @IsOptional()
    @IsString()
    phone_number?: string;

    @IsOptional()
    @IsDateString()
    birth_date?:String;
} 