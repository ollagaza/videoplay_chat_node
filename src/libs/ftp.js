import * as ftp from 'basic-ftp'
import log from './logger'
import Util from '../utils/baseutil'

const FTP = class {
  _timeout = null
  _host = null
  _port = null
  _user = null
  _password = null
  _secure = false
  _ftp_client = null
  _log_prefix = '[FTP]'

  constructor (ftp_info = null) {
    this._timeout = ftp_info.timeout ? ftp_info.timeout : 0
    this._ftp_client = new ftp.Client(this._timeout)
    if (ftp_info.debug) {
      this._ftp_client.ftp.verbose = true
    }
    if (ftp_info.encoding) {
      this._ftp_client.ftp.encoding = ftp_info.encoding
    }
    this._ftp_client.ftp.log = this.ftpLog
    this.setConnectionInfo(ftp_info)
  }

  ftpLog = (...args) => {
    log.debug(this._log_prefix, ...args)
  }

  progressLog = (progress_info) => {
    const percent = Math.round(progress_info.bytes / progress_info.bytesOverall * 1000) / 10
    log.debug(this._log_prefix, '[progress]', {
      name: progress_info.name,
      type: progress_info.type,
      progress: `${Util.fileSizeText(progress_info.bytes)} / ${Util.fileSizeText(progress_info.bytesOverall)}`,
      percent: `${percent}%`,
    })
  }

  setConnectionInfo = (connect_info) => {
    if (connect_info) {
      this._host = connect_info.host
      this._port = connect_info.port ? connect_info.port : 21
      this._user = connect_info.user
      this._password = connect_info.password
      this._secure = connect_info.secure === true

      this._log_prefix = `[FTP] [host: ${this._host}, port: ${this._port}, user: ${this._user}, timeout: ${this._timeout}]`
    }
  }

  getConnectionInfo = () => {
    return {
      host: this._host,
      port: this._port,
      user: this._user,
      password: this._password,
      secure: this._secure
    }
  }

  connect = async () => {
    if (!this._ftp_client) return false

    try {
      await this._ftp_client.access(this.getConnectionInfo())
      log.debug(this._log_prefix, '[connect]', 'connect success')
      return true
    } catch (e) {
      log.error(this._log_prefix, '[connect]', e)
      throw e
    }
  }

  reconnect = async () => {
    if (this.isClosed) {
      return await this.connect()
    }
    return true
  }

  close = () => {
    if (!this._ftp_client) return
    this._ftp_client.close()
    log.debug(this._log_prefix, '[close]', 'close connection')
  }

  get isClosed() {
    return this._ftp_client.closed
  }

  createDirectory = async (remote_path) => {
    await this.reconnect()

    try {
      log.debug(this._log_prefix, '[createDirectory]', remote_path)
      await this._ftp_client.ensureDir(remote_path)
    } catch (e) {
      log.error(this._log_prefix, '[createDirectory]', remote_path, e)
      throw e
    }
    return true
  }

  uploadFile = async (local_file_path, remote_file_name, remote_path = null, progress_log = false) => {
    await this.reconnect()

    if (remote_path) remote_path = Util.trim(remote_path)
    if (!remote_path || remote_path === '/') remote_path = ''

    if (remote_path !== '') {
      await this.createDirectory(remote_path)
    }

    let is_success = false
    if (progress_log) {
      this._ftp_client.trackProgress(this.progressLog)
    }

    try {
      await this._ftp_client.uploadFrom(local_file_path, `${remote_path}/${remote_file_name}`)
      is_success = true
    } catch (e) {
      log.error(this._log_prefix, '[createDirectory]', remote_path, e)
      this._ftp_client.trackProgress()
      throw e
    }

    this._ftp_client.trackProgress()
    return is_success
  }

  uploadDirectory = async (local_path, remote_path, progress_log = false) => {
    await this.reconnect()

    if (remote_path) remote_path = Util.trim(remote_path)
    if (!remote_path || remote_path === '') remote_path = '/'

    let is_success = false
    if (progress_log) {
      this._ftp_client.trackProgress(this.progressLog)
    }

    try {
      await this._ftp_client.uploadFromDir(local_path, remote_path)
      is_success = true
    } catch (e) {
      log.error(this._log_prefix, '[createDirectory]', remote_path, e)
      throw e
    }

    this._ftp_client.trackProgress()
    return is_success
  }
}

export default FTP
