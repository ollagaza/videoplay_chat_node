import { Server } from 'http';
import cluster from 'cluster';
import sticky from 'socketio-sticky-session'; // socketio 사용 대비
import app from './app';

if (process.env.NODE_ENV !== 'development') {
  process.env.NODE_ENV = 'production';
}

const { PORT = 3000 } = process.env;
const options = {
  proxy: true,
  header: 'x-forwarded-for',
  ignoreMissingHeader: true,
};

// 마스터 프로세스인 경우 자식이 죽었을 때 로그 기록
if (cluster.isMaster) {
  cluster.on('death', function(worker) {
      console.log('worker ' + worker.pid + ' died'); // eslint-disable-line no-console
  });
}

// 멀티프로세스 서버 시작
const server = sticky(options, () => Server(app));

// 리스닝 시작
server.listen(PORT, () => console.log(`Listening on port ${PORT}`)); // eslint-disable-line no-console
