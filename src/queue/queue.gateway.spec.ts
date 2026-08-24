import { QueueGateway } from './queue.gateway';

function makeSocket(handshake: Record<string, unknown>) {
  return {
    handshake,
    data: {} as Record<string, unknown>,
    join: jest.fn(),
    disconnect: jest.fn(),
  };
}

describe('QueueGateway', () => {
  let gateway: QueueGateway;
  let jwtService: { verify: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(() => {
    jwtService = { verify: jest.fn() };
    config = { get: jest.fn().mockReturnValue('test-secret') };
    gateway = new QueueGateway(jwtService as never, config as never);
    gateway.server = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } as never;
  });

  describe('handleConnection', () => {
    it('disconnects a socket with no token', () => {
      const socket = makeSocket({ auth: {}, query: {} });

      gateway.handleConnection(socket as never);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('disconnects a socket whose token fails verification', () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });
      const socket = makeSocket({ auth: { token: 'bad-token' }, query: {} });

      gateway.handleConnection(socket as never);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('disconnects a socket whose token has no clinicId (e.g. a super-admin token)', () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', clinicId: null });
      const socket = makeSocket({ auth: { token: 'valid-token' }, query: {} });

      gateway.handleConnection(socket as never);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('joins the clinic-scoped room for a valid token', () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', clinicId: 'clinic-1' });
      const socket = makeSocket({ auth: { token: 'valid-token' }, query: {} });

      gateway.handleConnection(socket as never);

      expect(socket.join).toHaveBeenCalledWith('clinic:clinic-1');
      expect(socket.disconnect).not.toHaveBeenCalled();
    });

    it('accepts a token passed via handshake query as a fallback to auth', () => {
      jwtService.verify.mockReturnValue({ sub: 'user-1', clinicId: 'clinic-1' });
      const socket = makeSocket({ auth: {}, query: { token: 'valid-token' } });

      gateway.handleConnection(socket as never);

      expect(socket.join).toHaveBeenCalledWith('clinic:clinic-1');
    });
  });

  describe('emitCheckedIn / emitUpdated', () => {
    it('emits only to the room of the given clinic', () => {
      const emit = jest.fn();
      const to = jest.fn().mockReturnValue({ emit });
      gateway.server = { to } as never;

      gateway.emitCheckedIn('clinic-1', { _id: 'entry-1' });

      expect(to).toHaveBeenCalledWith('clinic:clinic-1');
      expect(emit).toHaveBeenCalledWith('queue:checked-in', { _id: 'entry-1' });
    });
  });
});
