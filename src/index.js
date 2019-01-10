import { Server } from 'http';
import cluster from 'cluster';
import os from 'os';
import sticky from 'socketio-sticky-session'; // socketio 사용 대비
import app from './app';
import service_config from '@/config/service.config';

if (process.env.NODE_ENV !== 'development') {
  process.env.NODE_ENV = 'production';
}

const { PORT = 3000 } = process.env;
const options = {
  proxy: true,
  header: 'x-forwarded-for',
  ignoreMissingHeader: true,
};

//워커 스케쥴을 Round Robin 방식으로 한다.
cluster.schedulingPolicy = cluster.SCHED_RR;

if (cluster.isMaster) {
  //CPU의 갯수만큼 워커 생성
  os.cpus().forEach(function (cpu) {
    cluster.fork();
  });

  // 자식이 죽었을 때 로그 기록
  cluster.on('death', function(worker) {
      console.log('worker ' + worker.pid + ' died'); // eslint-disable-line no-console
  });
}
else {
  app.listen(PORT, () => console.log(`Listening on port ${PORT} -> PID: ${process.pid }`));
}

// 멀티프로세스 서버 시작
//const server = sticky(options, () => Server(app));
//
// const server = Server(app);
//
// // 리스닝 시작
// server.listen(PORT, () => console.log(`Listening on port ${PORT}`)); // eslint-disable-line no-console

service_config.load();
