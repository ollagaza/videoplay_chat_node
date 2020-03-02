import Promise from 'promise'
import mongoose from 'mongoose'
import mongodb_config from '../config/mongodb.config'
import Config from '../config/config'
import log from '../libs/logger'
import Constants from '../constants/constants'
import { MedicalModel } from './mongodb/Medical';
import { InterrestModel } from './mongodb/Interrest';
import { LogCodeModel } from './mongodb/MemberLogCode';

const ENV = Config.getEnv()
const database_config = Config.isLocal() ? mongodb_config[Constants.LOCAL] : mongodb_config[ENV]

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
      defaultMongoCollections();
      resolve(true)
    })
    .catch((error) => {
      log.e(null, 'mongodb connection error', error)
      resolve(false)
    })
  })

  return await async_func
}

const defaultMongoCollections = async () => {
  const medical = await MedicalModel.findAll();
  if (medical.length === 0) {
    await MedicalModel.InsertDefaultData();
  }

  const interrest = await InterrestModel.findAll();
  if (interrest.length === 0) {
    await InterrestModel.InsertDefaultData();
  }

  const logcode = await LogCodeModel.findAll();
  if (logcode.length === 0) {
    await LogCodeModel.InsertDefaultData();
  }
}

export default {
  init
}
