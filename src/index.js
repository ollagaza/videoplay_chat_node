import config from '@/config/config';
import app from './app';
import service_config from '@/config/service.config';
import code_scene_service from '@/service/code/CodeSceneService';
import log from "@/classes/Logger";
import mongoose from 'mongoose';
import Io from './middlewares/socket_io';

const { PORT = 3000 } = process.env;

const db = mongoose.connection;
db.on('error', log.error);
db.once('open', function(){
  // CONNECTED TO MONGODB SERVER
  log.debug("Connected to mongod server");
});

mongoose.set('useFindAndModify', false);
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://mteg_vas:dpaxldlwl_!@localhost:27017/surgstory', { useNewUrlParser: true, useFindAndModify: false } )
  .then(() => {
    log.d(null, 'Successfully connected to mongodb');
    if (config.isDemon()) {
      const OperationScheduler = require('./scheduler/OperationScheduler');
      OperationScheduler.default.startSchedule();
    }
  })
  .catch(e => log.e(null, 'mongodb connection error', e));

app.listen(PORT, () => log.d(null, `Listening on port ${PORT} -> PID: ${process.pid }`));

(
  async () => {
    await service_config.init();   

    await Io.init();
  }
)();

code_scene_service.init();
