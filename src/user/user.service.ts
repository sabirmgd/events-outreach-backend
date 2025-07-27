import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { Role } from '../auth/entities/role.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  save(user: User): Promise<User> {
    return this.userRepository.save(user);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { roleNames, ...rest } = createUserDto;

    // Generate invitation token
    const token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setDate(expires.getDate() + 1); // Token is valid for 1 day

    const user = this.userRepository.create({
      ...rest,
      is_active: false, // User is inactive until they accept the invitation
      invitation_token: token,
      invitation_expires_at: expires,
    });

    // Assign roles if provided
    if (roleNames && roleNames.length > 0) {
      const roles = await this.roleRepository.findBy({ name: In(roleNames) });
      user.roles = roles;
    }

    return this.userRepository.save(user);
  }

  async acceptInvitation(token: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: {
        invitation_token: token,
        invitation_expires_at: MoreThan(new Date()), // Check that the token is not expired
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired invitation token.');
    }

    const salt = await bcrypt.genSalt();
    user.password_hash = await bcrypt.hash(password, salt);
    user.is_active = true;
    user.invitation_token = null;
    user.invitation_expires_at = null;

    return this.userRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['organization', 'team', 'roles', 'roles.permissions'],
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['organization', 'team', 'roles', 'roles.permissions'],
      select: {
        id: true,
        email: true,
        name: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        password_hash: true, // Explicitly select the password hash
        organization: { id: true, name: true },
        team: { id: true, name: true },
        roles: { id: true, name: true, permissions: true },
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    const updated = this.userRepository.merge(user, updateUserDto);
    return this.userRepository.save(updated);
  }

  async remove(id: string): Promise<{ deleted: boolean; id?: string }> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { deleted: true, id };
  }
}
