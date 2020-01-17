import Promise from 'promise'
import mongoose from 'mongoose'
import mongodb_config from '../config/mongodb.config'
import config from '../config/config'
import log from '../libs/logger'
import Constants from '../constants/constants'

const ENV = config.getEnv()
const database_config = config.isLocal() ? mongodb_config[Constants.LOCAL] : mongodb_config[ENV]

const init = async () => {
  const async_func = new Promise(resolve => {
    const db = mongoose.connection
    db.on('error', log.error)
    db.once('open', function () {
      log.debug('Connected to mongod server')
    })

    mongoose.Promise = global.Promise
    mongoose.connect(`mongodb://${database_config.user}:${database_config.password}@${database_config.domain}:${database_config.port}/${database_config.database}`, {
      useNewUrlParser: true,
      useFindAndModify: true,
      useUnifiedTopology: true
    })
      .then(() => {
        log.d(null, 'Successfully connected to mongodb')
        resolve(true)
      })
      .catch((error) => {
        log.e(null, 'mongodb connection error', error)
        resolve(false)
      })
  })

  return await async_func
}

export default {
  init
}
