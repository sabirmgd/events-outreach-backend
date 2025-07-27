import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { Role } from '../auth/entities/role.entity';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Action } from '../auth/enums/action.enum';
import { Permission } from '../auth/entities/permission.entity';
import { Subject } from '../auth/enums/subject.enum';

@Injectable()
export class SeedService implements OnModuleInit {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedPermissions();
    await this.seedSuperAdmin();
  }

  private async seedPermissions() {
    const permissions = [
      // Organization Permissions
      { action: Action.Create, subject: Subject.Organization },
      { action: Action.Read, subject: Subject.Organization },
      { action: Action.Update, subject: Subject.Organization },
      { action: Action.Delete, subject: Subject.Organization },
      // User Permissions
      { action: Action.Create, subject: Subject.User },
      { action: Action.Read, subject: Subject.User },
      { action: Action.Update, subject: Subject.User },
      { action: Action.Delete, subject: Subject.User },
      // Event Permissions
      { action: Action.Create, subject: Subject.Event },
      { action: Action.Read, subject: Subject.Event },
      { action: Action.Update, subject: Subject.Event },
      { action: Action.Delete, subject: Subject.Event },
    ];

    for (const p of permissions) {
      const existing = await this.permissionRepository.findOne({ where: p });
      if (!existing) {
        const newPermission = this.permissionRepository.create(p);
        await this.permissionRepository.save(newPermission);
      }
    }
  }

  private async seedSuperAdmin() {
    let superAdminRole = await this.roleRepository.findOne({
      where: { name: 'SUPER_ADMIN' },
      relations: ['permissions'],
    });

    if (!superAdminRole) {
      const allPermissions = await this.permissionRepository.find();
      superAdminRole = this.roleRepository.create({
        name: 'SUPER_ADMIN',
        permissions: allPermissions,
      });
      await this.roleRepository.save(superAdminRole);
    }

    const superAdmin = await this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name = :roleName', { roleName: 'SUPER_ADMIN' })
      .getOne();

    if (!superAdmin) {
      const email = this.configService.get<string>('SUPER_ADMIN_EMAIL');
      const password = this.configService.get<string>('SUPER_ADMIN_PASSWORD');

      if (email && password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newSuperAdmin = this.userRepository.create({
          email,
          password_hash: hashedPassword,
          name: 'Super Admin',
          roles: [superAdminRole],
          is_active: true,
        });
        await this.userRepository.save(newSuperAdmin);
      }
    }
  }
}
