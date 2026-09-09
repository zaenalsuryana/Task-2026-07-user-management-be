import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { PasswordUtil } from '@common/utils/password.util';
import { CreateUserDto } from './core/dto/create-user.dto';
import { UpdateUserDto } from './core/dto/update-user.dto';
import { ChangePositionDto } from './core/dto/change-position.dto';
import { ManagePermissionsDto } from './core/dto/manage-permissions.dto';
import { UserQueryDto } from './core/dto/user-query.dto';
import { UpdateProfileDto } from './core/dto/update-profile.dto';
import { UserEntity } from './core/entities/user.entity';
import { UserTransformHelper } from './core/helpers/user-transform.helper';
import { PaginatedResponseDto } from '@common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    const { email, password, position_id, ...userData } = createUserDto;

    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Validate position exists (position_id is a String UUID)
    const position = await this.prisma.position.findUnique({
      where: { id: Number(position_id) },
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
        position_id: Number(position_id),
        ...userData,
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

    return UserTransformHelper.toEntity(user);
  }

  async findAll(query: UserQueryDto): Promise<PaginatedResponseDto<UserEntity>> {
    const { page = 1, limit = 10, search, is_active, position_id } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      deleted_at: null,
    };

    if (search) {
      where.OR = [
        { profile: { first_name: { contains: search, mode: 'insensitive' } } },
        { profile: { last_name: { contains: search, mode: 'insensitive' } } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (is_active !== undefined) {
      where.is_active = is_active;
    }

    if (position_id) {
      where.position_id = position_id;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
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
        orderBy: {
          created_at: 'desc',
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    if (total === 0) {
      throw new NotFoundException('No users found');
    }

    return {
      data: UserTransformHelper.toEntities(users),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<UserEntity> {
    const numericId = Number(id);
    const user = await this.prisma.user.findFirst({
      where: { id: numericId, deleted_at: null },
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
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return UserTransformHelper.toEntity(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    const numericId = Number(id);
    const user = await this.prisma.user.findFirst({
      where: { id: numericId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { email, password, ...updateData } = updateUserDto;

    // Check email uniqueness if changing email
    if (email && email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    // Hash password if provided
    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await PasswordUtil.hash(password);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: numericId },
      data: {
        ...updateData,
        ...(email && { email }),
        ...(hashedPassword && { password: hashedPassword }),
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

    return UserTransformHelper.toEntity(updatedUser);
  }

  async remove(id: string): Promise<void> {
    const numericId = Number(id);
    const user = await this.prisma.user.findFirst({
      where: { id: numericId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id: numericId },
      data: { deleted_at: new Date() },
    });
  }

  async changePosition(id: string, changePositionDto: ChangePositionDto): Promise<UserEntity> {
    const numericId = Number(id);
    const user = await this.prisma.user.findFirst({
      where: { id: numericId, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Validate position exists
    const position = await this.prisma.position.findUnique({
      where: { id: Number(changePositionDto.position_id) },
    });

    if (!position) {
      throw new BadRequestException('Invalid position ID');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: numericId },
      data: { position_id: Number(changePositionDto.position_id) },
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

    return UserTransformHelper.toEntity(updatedUser);
  }

  async assignPermissions(
    userId: string,
    managePermissionsDto: ManagePermissionsDto,
  ): Promise<UserEntity> {
    const numericUserId = Number(userId);
    const user = await this.prisma.user.findFirst({
      where: { id: numericUserId, deleted_at: null },
      include: { position: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { name: { in: managePermissionsDto.permissions } },
    });

    if (permissions.length !== managePermissionsDto.permissions.length) {
      throw new BadRequestException('One or more permissions are invalid');
    }

    // Get current permissions for the position
    const currentPermissions = await this.prisma.positionPermission.findMany({
      where: { position_id: user.position_id },
    });

    const currentPermissionIds = currentPermissions.map((pp) => pp.permission_id);
    const newPermissionIds = permissions.map((p) => p.id);

    // Find permissions to add
    const permissionsToAdd = newPermissionIds.filter((id) => !currentPermissionIds.includes(id));

    // Add new permissions
    if (permissionsToAdd.length > 0) {
      await this.prisma.positionPermission.createMany({
        data: permissionsToAdd.map((permission_id) => ({
          position_id: user.position_id,
          permission_id,
        })),
        skipDuplicates: true,
      });
    }

    // Return updated user
    return this.findOne(userId);
  }

  async revokePermissions(
    userId: string,
    managePermissionsDto: ManagePermissionsDto,
  ): Promise<UserEntity> {
    const numericUserId = Number(userId);
    const user = await this.prisma.user.findFirst({
      where: { id: numericUserId, deleted_at: null },
      include: { position: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Validate all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: { name: { in: managePermissionsDto.permissions } },
    });

    if (permissions.length !== managePermissionsDto.permissions.length) {
      throw new BadRequestException('One or more permissions are invalid');
    }

    const permissionIds = permissions.map((p) => p.id);

    // Remove permissions
    await this.prisma.positionPermission.deleteMany({
      where: {
        position_id: user.position_id,
        permission_id: { in: permissionIds },
      },
    });

    // Return updated user
    return this.findOne(userId);
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      id: user.id,
      email: user.email,
      first_name: user.profile?.first_name ?? null,
      last_name: user.profile?.last_name ?? null,
      phone_number: user.profile?.phone_number ?? null,
      address: user.profile?.address ?? null,
      birth_date: user.profile?.birth_date ?? null,
    };
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
    const { first_name, last_name, phone_number, address, birth_date } = updateProfileDto as any;

    const user = await this.prisma.user.findUnique({
      where: { id: Number(userId) },
    });

    if (!user) {
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
    }

    const updatedProfile = await this.prisma.userProfile.upsert({
      where: { user_id: Number(userId) },
      update: {
        ...(first_name !== undefined && { first_name }),
        ...(last_name !== undefined && { last_name }),
        ...(phone_number !== undefined && { phone_number }),
        ...(address !== undefined && { address }),
        ...(birth_date !== undefined && {
          birth_date: birth_date ? new Date(birth_date) : null,
        }),
      },
      create: {
        user_id: Number(userId),
        first_name: first_name ?? '',
        last_name: last_name ?? '',
        phone_number,
        address,
        birth_date: birth_date ? new Date(birth_date) : undefined,
      },
    });

    return {
      message: 'Profil berhasil diperbarui',
      data: updatedProfile,
    };
  }
}