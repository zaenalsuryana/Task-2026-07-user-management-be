import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@common/prisma/prisma.service';
import { PasswordUtil } from '@common/utils/password.util';
import { LoginDto } from './core/dto/login.dto';
import { RegisterDto } from './core/dto/register.dto';
import { AuthResponseDto } from './core/dto/auth-response.dto';
import { JwtPayload } from './core/interfaces/jwt-payload.interface';
import { ForgotPasswordDto } from './core/dto/forgot-password.dto';
import { ResetPasswordDto } from './core/dto/reset-password.dto';
import { MailService } from '../mail/mail.service';
import { RefreshTokenDto } from './core/dto/refresh-token.dto';
import { ChangePasswordDto } from './core/dto/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user with position and permissions
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        position: {
          include: {
            position_permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await PasswordUtil.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Build permissions array
    const permissions = user.position.position_permissions.map(
      (pp) => pp.permission.name,
    );

    // Generate JWT token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      positionId: user.position.id,
      positionName: user.position.name,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(
      {
        userId: user.id,
      },
      {
        expiresIn: '7d',
      },
    );

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refresh_token: refreshToken,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        position: {
          id: user.position.id,
          name: user.position.name,
        },
        permissions,
      },
    };
  }


  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const { refresh_token } = refreshTokenDto;

    try {
      const payload = this.jwtService.verify<{
        userId: number;
      }>(refresh_token);

      const user = await this.prisma.user.findUnique({
        where: {
          id: payload.userId,
        },
        include: {
          position: {
            include: {
              position_permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user || user.refresh_token !== refresh_token) {
        throw new UnauthorizedException('Refresh token tidak valid');
      }

      const permissions = user.position.position_permissions.map(
        (pp) => pp.permission.name,
      );

      const newAccessToken = this.jwtService.sign(
        {
          userId: user.id,
          email: user.email,
          positionId: user.position.id,
          positionName: user.position.name,
          permissions,
        },
        {
          expiresIn: '15m',
        },
      );

      return {
        access_token: newAccessToken,
      };
      
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid');
    }
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        position: {
          include: {
            position_permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const permissions = user.position.position_permissions.map(
      (pp) => pp.permission.name,
    );

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      position: {
        id: user.position.id,
        name: user.position.name,
      },
      permissions,
    };
  }

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ) {
    const { old_password, new_password } = changePasswordDto;
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const isPasswordValid = await PasswordUtil.compare(
      old_password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Password lama tidak sesuai');
    }

    const hashedPassword = await PasswordUtil.hash(new_password);

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: hashedPassword,
      },
    });

    return {
      message: 'Password berhasil diubah',
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, first_name, last_name, position_id } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Validate position exists
    const position = await this.prisma.position.findUnique({
      where: { id: position_id },
      include: {
        position_permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!position) {
      throw new BadRequestException('Invalid position ID');
    }

    // Hash password
    const hashedPassword = await PasswordUtil.hash(password);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        first_name,
        last_name,
        position_id,
      },
      include: {
        position: {
          include: {
            position_permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // Build permissions array
    const permissions = user.position.position_permissions.map(
      (pp) => pp.permission.name,
    );

    // Generate JWT token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      positionId: user.position.id,
      positionName: user.position.name,
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(
      {
        userId: user.id,
      },
      {
        expiresIn: '7d',
      },
    );

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        refresh_token: refreshToken,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        position: {
          id: user.position.id,
          name: user.position.name,
        },
        permissions,
      },
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('Email tidak ditemukan');
    }

    const token = this.jwtService.sign(
      {
        email: user.email,
        id: user.id,
      },
      {
        expiresIn: '15m',
      },
    );

    const resetLink = `http://localhost:3001/reset-password?token=${token}`;

    await this.mailService.sendResetPasswordEmail(
      user.email,
      resetLink,
    );

    return {
      message: 'Link reset password berhasil dikirim ke email',
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    try {
      const payload = this.jwtService.verify<{
        id: number;
        email: string;
      }>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.id },
      });

      if (!user) {
        throw new BadRequestException('User tidak ditemukan');
      }

      const hashedPassword = await PasswordUtil.hash(password);

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
        },
      });

      return {
        message: 'Password berhasil direset',
      };
    } catch (error) {
      if (
        error instanceof Error &&
        (
          error.name === 'TokenExpiredError' ||
          error.name === 'JsonWebTokenError'
        )
        
      ) {
      throw new BadRequestException('Token tidak valid atau sudah kadaluarsa',);
    }

    throw error;
  }
}
}


