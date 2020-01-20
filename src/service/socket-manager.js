import EventEmitter from 'events'
import io from 'socket.io-client';
import log from '../libs/logger';
import Util from '../utils/baseutil';
import ServiceConfig from './service-config';

const SocketManagerClass = class extends EventEmitter {
  constructor () {
    super()
    this.log_prefix = '[SocketManagerClass]'
  }

  init = async() => {
    this.uId = Util.getContentId();
    this.ip = ServiceConfig.get('socket_relay_server_ip');
    this.port = ServiceConfig.get('socket_relay_server_port');
    log.debug(this.log_prefix, `[init]`, `connect to ${this.ip}:${this.port}/backend`)
    this.socket = io(`${this.ip}:${this.port}/backend`, {
      path: '/',
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 100,
      timeout: 1000,
      query: {
        uId: this.uId,
        hostname: process.env.HOSTNAME,
      }
    })

    this.socket.on('connect', () => {
      log.d(null, 'Connect socket.id : ', this.socket.id);
    })

    this.socket.on('disconnet', () => {
      log.d(null, 'Disconnect socket.id : ', this.socket.id);
    })

    this.socket.on('reconnect', (attemptNumber) => {
      log.d(null, 'reconnect attemptNum:', attemptNumber, ' Socket ID:', this.socket.id);
    })

    this.socket.on('reconnecting', (attemptNumber) => {
      log.d(null, 'reconnecting attemptNum:', attemptNumber, ' Socket ID:', this.socket.id);
    })

    this.socket.on('reconnect_error', (error) => {
      log.d(null, 'Reconnect Error:', error);
    })

    this.socket.on('error', (error) => {
      log.d(null, 'Error:', error);
    })

    this.socket.on('connect_error', (error) => {
      log.d(null, 'Connect Error:', error);
    })

    this.socket.on('status', this.onStatus)
    this.socket.on('sendMsg', this.onSendMsg)
    this.socket.on('reloadServiceConfig', this.onReloadServiceConfig)
  }

  sendMsg = async (data) => {
    log.debug(this.log_prefix, '[sendMsg]', data)
    this.socket.emit('sendMsg', data)
  }

  onSendMsg = async (data) => {
    log.debug(this.log_prefix, '[onSendMsg]', data)

  }

  onStatus = async () => {
    // log.debug(this.log_prefix, '[onStatus]', this.socket.id );
    this.socket.emit('status', this.uId);
  }

  onReloadServiceConfig = async () => {
    log.debug(this.log_prefix, '[onReloadServiceConfig]')
    this.emit('onReloadServiceConfig')
  }

  requestReloadService = async () => {
    this.socket.emit('reloadServiceConfig')
  }

  sendToFrontOne = async (user_id, data = null) => {
    const request_data = data ? data : {}
    request_data.uid = user_id
    this.socket.emit('sendFrontMsg', request_data);
  }

  sendToFrontAll = async (request_data) => {
    this.socket.emit('sendFrontGloMsg', request_data);
  }
}

const socketManager = new SocketManagerClass()

export default socketManager
