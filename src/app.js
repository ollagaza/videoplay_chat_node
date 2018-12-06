import express from 'express';
import path from 'path';
import logger from 'morgan';
import bodyParser from 'body-parser';
import headerMiddleware from '@/middlewares/header.middleware';
import StdObject from '@/classes/StdObject';
import routes from '@/routes';

const app = express();

// Reverse proxy를 구축해야 하므로 아래 코드가 필수임
app.enable('trust proxy', 1);

// Express 라는 것을 숨김
app.disable('etag');
app.disable('x-powered-by');

// View engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');

app.use(logger('dev', {
  skip: () => app.get('env') === 'test'
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../public')));

// 기본 헤더 셋팅
app.use(headerMiddleware);

// Routes
app.use('/api', routes);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  next(new StdObject(-1, '요청하신 API Endpoint가 존재하지 않습니다.', 404));
});

// Error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  res.status(err.getHttpStatusCode())
    .json(err)
});

export default app;
