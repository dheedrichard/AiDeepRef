import { Controller, Post, Body, HttpCode, HttpStatus, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { SigninDto } from './dto/signin.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { MagicLinkDto } from './dto/magic-link.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Create new user account' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    schema: {
      properties: {
        userId: { type: 'string' },
        email: { type: 'string' },
        token: { type: 'string' },
      },
    },
  })
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email/password or magic link' })
  @ApiResponse({
    status: 200,
    description: 'User successfully authenticated',
    schema: {
      properties: {
        userId: { type: 'string' },
        token: { type: 'string' },
        role: { type: 'string' },
      },
    },
  })
  async signin(@Body() signinDto: SigninDto) {
    return this.authService.signin(signinDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with OTP or magic link' })
  @ApiResponse({
    status: 200,
    description: 'Email successfully verified',
    schema: {
      properties: {
        verified: { type: 'boolean' },
      },
    },
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request magic link for passwordless authentication' })
  @ApiResponse({
    status: 200,
    description: 'Magic link sent if account exists',
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  async requestMagicLink(@Body() magicLinkDto: MagicLinkDto) {
    return this.authService.requestMagicLink(magicLinkDto);
  }

  @Get('magic-link/verify/:token')
  @ApiOperation({ summary: 'Verify magic link and auto-login user' })
  @ApiResponse({
    status: 200,
    description: 'User authenticated via magic link',
    schema: {
      properties: {
        userId: { type: 'string' },
        token: { type: 'string' },
        role: { type: 'string' },
        email: { type: 'string' },
      },
    },
  })
  async verifyMagicLink(@Param('token') token: string) {
    return this.authService.verifyMagicLink(token);
  }
}
