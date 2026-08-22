import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { ClinicsService } from '../clinics/clinics.service';
import { RegisterClinicDto } from './dto/register-clinic.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../common/constants/roles.enum';
import { JwtPayload } from './strategies/jwt.strategy';
import { MailService } from '../mail/mail.service';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private clinicsService: ClinicsService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailService: MailService,
  ) {}

  private async buildPayload(userId: string): Promise<JwtPayload> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: this.usersService.effectivePermissions(user),
      clinicId: user.clinicId ? user.clinicId.toString() : null,
      branchIds: (user.branchIds ?? []).map((b) => b.toString()),
      doctorId: user.doctorId?.toString(),
      staffId: user.staffId?.toString(),
    };
  }

  private async issueTokens(userId: string): Promise<TokenPair> {
    const payload = await this.buildPayload(userId);
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('jwt.secret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
    });
    const refreshToken = this.jwtService.sign(
      { sub: payload.sub },
      {
        secret: this.config.get<string>('jwt.refreshSecret'),
        expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
      },
    );
    const refreshHash = await argon2.hash(refreshToken);
    await this.usersService.setRefreshTokenHash(userId, refreshHash);
    return { accessToken, refreshToken };
  }

  async registerClinic(dto: RegisterClinicDto) {
    const existing = await this.usersService.findByEmail(dto.email, null);
    if (existing) throw new ConflictException('An account with this email already exists');

    const clinic = await this.clinicsService.create({
      name: dto.clinicName,
      nameAr: dto.clinicNameAr,
      contactEmail: dto.email,
      contactPhone: dto.clinicPhone,
    });

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.usersService.create({
      fullName: dto.ownerFullName,
      email: dto.email,
      passwordHash,
      phone: dto.phone,
      role: Role.CLINIC_OWNER,
      clinicId: clinic._id as any,
      branchIds: [],
    });

    const tokens = await this.issueTokens(user.id);
    return { ...tokens, user: await this.publicUser(user.id) };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid email or password');
    if (!user.isActive) throw new UnauthorizedException('This account has been deactivated');

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Invalid email or password');

    await this.usersService.touchLastLogin(user.id);
    const tokens = await this.issueTokens(user.id);
    return { ...tokens, user: await this.publicUser(user.id) };
  }

  async refresh(userIdFromToken: string, refreshToken: string) {
    const user = await this.usersService.findByIdWithSecrets(userIdFromToken);
    if (!user?.refreshTokenHash) throw new UnauthorizedException('Session expired, please log in again');

    const valid = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!valid) throw new UnauthorizedException('Session expired, please log in again');

    return this.issueTokens(user.id);
  }

  async logout(userId: string) {
    await this.usersService.setRefreshTokenHash(userId, null);
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    // Always respond as if it succeeded — never reveal whether an email exists.
    if (!user) return { message: 'If that email exists, a reset link has been sent.' };

    const resetUrl = await this.issueResetLink(user.id);
    await this.mailService.sendPasswordReset(user.email, user.fullName, resetUrl);

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  /** Generates and stores a fresh hashed reset token, returning the raw link to email out. */
  private async issueResetLink(userId: string, expiresInMs = 1000 * 60 * 30): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + expiresInMs);
    await this.usersService.setPasswordResetToken(userId, tokenHash, expiresAt);
    return `${this.config.get<string>('appUrl')}/reset-password?token=${rawToken}`;
  }

  /**
   * Used by Doctors/Staff creation flows: makes a login account with no usable
   * password and emails the person a set-password link (7-day expiry, longer
   * than a plain forgot-password link since it's their first login).
   */
  async createInvitedUser(data: {
    fullName: string;
    email: string;
    role: Role;
    clinicId: string;
    branchIds?: string[];
    doctorId?: string;
    staffId?: string;
  }) {
    const existing = await this.usersService.findByEmail(data.email, data.clinicId);
    if (existing) throw new ConflictException('An account with this email already exists in this clinic');

    const unusablePasswordHash = await argon2.hash(randomBytes(32).toString('hex'));
    const user = await this.usersService.create({
      fullName: data.fullName,
      email: data.email,
      passwordHash: unusablePasswordHash,
      role: data.role,
      clinicId: data.clinicId as any,
      branchIds: (data.branchIds ?? []) as any,
      doctorId: data.doctorId as any,
      staffId: data.staffId as any,
    });

    const setupUrl = await this.issueResetLink(user.id, 1000 * 60 * 60 * 24 * 7);
    await this.mailService.sendAccountInvite(user.email, user.fullName, setupUrl);
    return user;
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const user = await this.usersService.findByValidResetToken(tokenHash);
    if (!user) throw new BadRequestException('This reset link is invalid or has expired');

    const passwordHash = await argon2.hash(newPassword);
    await this.usersService.setPassword(user.id, passwordHash);
    await this.usersService.setRefreshTokenHash(user.id, null);
    return { message: 'Password updated successfully' };
  }

  async me(userId: string) {
    return this.publicUser(userId);
  }

  private async publicUser(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) return null;
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
      branchIds: user.branchIds,
      preferredLanguage: user.preferredLanguage,
      avatarUrl: user.avatarUrl,
      permissions: this.usersService.effectivePermissions(user),
    };
  }
}
