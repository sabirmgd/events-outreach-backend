import { Controller, Post, Request, UseGuards, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { UserService } from '../user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  @Public()
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req: any, @Body() loginDto: LoginDto) {
    // loginDto is captured to satisfy class-validator, but req.user is the source of truth
    return this.authService.login(req.user);
  }

  @Public()
  @Post('accept-invitation')
  async acceptInvitation(@Body() acceptInvitationDto: AcceptInvitationDto) {
    const user = await this.userService.acceptInvitation(
      acceptInvitationDto.token,
      acceptInvitationDto.password,
    );
    // Automatically log the user in after they accept the invitation
    return this.authService.login(user);
  }
}
