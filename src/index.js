import config from './config/config';
import app from './app';
import log from "./libs/logger";
import InitService from './service/init'

const { PORT = 3000 } = process.env;

app.listen(PORT, async () => {
  log.d(null, `Listening on port ${PORT} -> PID: ${process.pid }`)
  await InitService.init()
});
