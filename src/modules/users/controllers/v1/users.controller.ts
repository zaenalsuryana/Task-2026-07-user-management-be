import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCookieAuth, ApiParam } from '@nestjs/swagger';
import { UsersService } from '../../users.service';
import { CreateUserDto } from '@modules/users/core/dto/create-user.dto';
import { UpdateUserDto } from '@modules/users/core/dto/update-user.dto';
import { ChangePositionDto } from '@modules/users/core/dto/change-position.dto';
import { ManagePermissionsDto } from '@modules/users/core/dto/manage-permissions.dto';
import { UserQueryDto } from '@modules/users/core/dto/user-query.dto';
import { UserEntity } from '../../core/entities/user.entity';
import { Permissions } from '@common/decorators/permissions.decorator';
import { PERMISSIONS } from '@common/constants/permissions.constant';
import {
  ApiSuccessResponse,
  ApiSuccessArrayResponse,
} from '@common/decorators/api-response.decorator';
import { PaginatedResponseDto } from '@common/dto/pagination.dto';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { UpdateProfileDto } from '../../core/dto/update-profile.dto';

@ApiTags('Users')
@ApiCookieAuth('access_token')
@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions(PERMISSIONS.USER.ADD)
  @ApiOperation({ summary: 'Create a new user' })
  @ApiSuccessResponse(UserEntity)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Permissions(PERMISSIONS.USER.VIEW)
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @ApiSuccessResponse(PaginatedResponseDto<UserEntity>)
  async findAll(@Query() query: UserQueryDto): Promise<PaginatedResponseDto<UserEntity>> {
    return this.usersService.findAll(query);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req: any) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    return this.usersService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.USER.VIEW)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiSuccessResponse(UserEntity)
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserEntity> {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.USER.UPDATE)
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', type: String })
  @ApiSuccessResponse(UserEntity)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.USER.DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  @ApiParam({ name: 'id', type: String })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }

  @Patch(':id/position')
  @Permissions(PERMISSIONS.USER.CHANGE_POSITION)
  @ApiOperation({ summary: 'Change user position/role' })
  @ApiParam({ name: 'id', type: String })
  @ApiSuccessResponse(UserEntity)
  async changePosition(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() changePositionDto: ChangePositionDto,
  ): Promise<UserEntity> {
    return this.usersService.changePosition(id, changePositionDto);
  }

  @Post(':id/permissions/assign')
  @Permissions(PERMISSIONS.USER.MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Assign permissions to user position' })
  @ApiParam({ name: 'id', type: String })
  @ApiSuccessResponse(UserEntity)
  async assignPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() managePermissionsDto: ManagePermissionsDto,
  ): Promise<UserEntity> {
    return this.usersService.assignPermissions(id, managePermissionsDto);
  }

  @Post(':id/permissions/revoke')
  @Permissions(PERMISSIONS.USER.MANAGE_PERMISSION)
  @ApiOperation({ summary: 'Revoke permissions from user position' })
  @ApiParam({ name: 'id', type: String })
  @ApiSuccessResponse(UserEntity)
  async revokePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() managePermissionsDto: ManagePermissionsDto,
  ): Promise<UserEntity> {
    return this.usersService.revokePermissions(id, managePermissionsDto);
  }
}
