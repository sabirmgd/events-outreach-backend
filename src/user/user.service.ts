import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
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
      password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10), // Temporary password
    });

    // Assign roles if provided
    if (roleNames && roleNames.length > 0) {
      const roles = await this.roleRepository.findBy({ name: In(roleNames) });
      user.roles = roles;
    }

    const savedUser = await this.userRepository.save(user);
    
    // Return user with invitation token for response  
    return { ...savedUser, invitation_token: token } as any;
  }

  async acceptInvitation(token: string, password: string): Promise<User> {
    // Since we don't store invitation tokens in the User entity,
    // you would need to implement a separate invitation tracking system
    // For now, throwing an error
    throw new NotFoundException('Invitation system needs to be implemented separately');
  }

  findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'name', 'password', 'is_active', 'created_at', 'updated_at'],
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
