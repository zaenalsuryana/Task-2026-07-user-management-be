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

  private async generateTokens(user: any) {
    const permissions = user.position?.position_permissions?.map(
      (pp) => pp.permission.name,
    ) ?? [];

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      positionId: user.position?.id ?? 0,
      positionName: user.position?.name ?? '',
      permissions,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(
      { userId: user.id },
      { expiresIn: '7d' },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: refreshToken },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.profile?.first_name ?? '',
        last_name: user.profile?.last_name ?? '',
        phone_number: user.profile?.phone_number ?? null,
        address: user.profile?.address ?? null,
        birth_date: user.profile?.birth_date ?? null,
        position: {
          id: user.position?.id ?? 0,
          name: user.position?.name ?? '',
        },
        permissions,
      },
    };
  }

  async loginOAuth(googleUser: {
    email: string;
    first_name: string;
    last_name: string;
    picture: string;
    accessToken: string;
  }): Promise<AuthResponseDto> {
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
      include: {
        profile: true,
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
      const defaultPosition = await this.prisma.position.findFirst();

      if (!defaultPosition) {
        throw new BadRequestException('Tidak ada posisi/role default di sistem. Harap buat minimal satu posisi.');
      }

      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          password: '',
          is_active: true,
          position_id: defaultPosition.id,
          profile: {
            create: {
              first_name: googleUser.first_name,
              last_name: googleUser.last_name,
            },
          },
        },
        include: {
          profile: true,
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
    }

    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
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

    const isPasswordValid = await PasswordUtil.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const permissions = user.position.position_permissions.map((pp) => pp.permission.name);

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
      { userId: user.id },
      { expiresIn: '7d' },
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refresh_token: refreshToken },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.profile?.first_name ?? '',
        last_name: user.profile?.last_name ?? '',
        phone_number: user.profile?.phone_number ?? null,
        address: user.profile?.address ?? null,
        birth_date: user.profile?.birth_date ?? null,
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
          id: Number(payload.userId),
        },
        include: {
          profile: true,
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

      const permissions = user.position.position_permissions.map((pp) => pp.permission.name);

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
      where: { id: userId },
      include: {
        profile: true,
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

    const permissions = user.position.position_permissions.map((pp) => pp.permission.name);

    return {
      id: user.id,
      email: user.email,
      first_name: user.profile?.first_name ?? '',
      last_name: user.profile?.last_name ?? '',
      phone_number: user.profile?.phone_number ?? null,
      address: user.profile?.address ?? null,
      birth_date: user.profile?.birth_date ?? null,
      position: {
        id: user.position.id,
        name: user.position.name,
      },
      permissions,
    };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const { old_password, new_password } = changePasswordDto;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const isPasswordValid = await PasswordUtil.compare(old_password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Password lama tidak sesuai');
    }

    const hashedPassword = await PasswordUtil.hash(new_password);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      message: 'Password berhasil diubah',
    };
  }

  async logout(userId: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refresh_token: null },
    });
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, first_name, last_name, phone_number, address, birth_date, position_id } = registerDto as any;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

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
      throw new ConflictException('Default member position is not configured in the database');
    }

    const hashedPassword = await PasswordUtil.hash(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        position_id,
        profile: {
          create: {
            first_name,
            last_name,
            phone_number,
            address,
            birth_date: birth_date ? new Date(birth_date) : undefined,
          },
        },
      },
      include: {
        profile: true,
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

    return this.generateTokens(user);
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
      { email: user.email, id: user.id },
      { expiresIn: '15m' },
    );

    const resetLink = `http://localhost:3001/reset-password?token=${token}`;

    await this.mailService.sendResetPasswordEmail(user.email, resetLink);

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
        data: { password: hashedPassword },
      });

      return {
        message: 'Password berhasil direset',
      };
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError')
      ) {
        throw new BadRequestException('Token tidak valid atau sudah kadaluarsa');
      }

      throw error;
    }
  }
}