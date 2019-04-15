import cluster from 'cluster';
import os from 'os';
import app from './app';
import service_config from '@/config/service.config';
import log from "@/classes/Logger";

const IS_DEV = process.env.NODE_ENV === 'development';

if (!IS_DEV) {
  process.env.NODE_ENV = 'production';
}

const { PORT = 3000 } = process.env;

if (IS_DEV) {
  app.listen(PORT, () => log.d(null, `Listening on port ${PORT} -> PID: ${process.pid }`));
} else {
  //워커 스케쥴을 Round Robin 방식으로 한다.
  cluster.schedulingPolicy = cluster.SCHED_RR;

  if (cluster.isMaster) {
    //CPU의 갯수만큼 워커 생성
    os.cpus().forEach(function (cpu) {
      cluster.fork();
    });

    // 자식이 죽었을 때 로그 기록
    cluster.on('death', function (worker) {
      log.e(null, 'worker ' + worker.pid + ' died'); // eslint-disable-line no-console
    });
  } else {
    app.listen(PORT, () => log.d(null, `Listening on port ${PORT} -> PID: ${process.pid}`));
  }
}

service_config.load();
