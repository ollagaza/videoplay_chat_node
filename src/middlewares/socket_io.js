import io from 'socket.io-client';
import log from '@/classes/Logger';
import util from '@/utils/baseutil';
import service_config from '@/config/service.config';

let socket;

const init = async() => {
  const uId = util.getContentId();
  const ip = service_config.get('socket_relay_server_ip');
  const port = service_config.get('socket_relay_server_port');

  socket = io(`${ip}:${port}/backend`, {
    path: '/',
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 100,
    timeout: 1000,
    query: {
      uId: uId,
      hostname: process.env.HOSTNAME,
    }
  });

  socket.on('connect', () => {
    log.d(null, 'Connect socket.id : ', socket.id);
  });

  socket.on('disconnet', () => {
    log.d(null, 'Disconnect socket.id : ', socket.id);
  });

  socket.on('reconnect', (attemptNumber) => {
    log.d(null, 'reconnect attemptNum:', attemptNumber, ' Socket ID:', socket.id);
  });

  socket.on('reconnecting', (attemptNumber) => {
    log.d(null, 'reconnecting attemptNum:', attemptNumber, ' Socket ID:', socket.id);
  });

  socket.on('reconnect_error', (error) => {
    log.d(null, 'Reconnect Error:', error);
  });

  socket.on('error', (error) => {
    log.d(null, 'Error:', error);
  });

  socket.on('connect_error', (error) => {
    log.d(null, 'Connect Error:', error);
  });

  socket.on('status', () => {
    log.d(null, socket.id, );
    socket.emit('status', uId);
  }),

  socket.on('sendMsg', (data) => {
    log.debug(data);
  });
};

export default {
  init: async() => {
    await init();
  },
  getSocket: () => {
    return socket;
  }
}
