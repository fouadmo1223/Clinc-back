import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedPatient } from '../strategies/patient-jwt.strategy';

export const CurrentPatient = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedPatient => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
