import {Router} from 'express';
import Wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import Util from '@/utils/baseutil';
import service_config from '@/config/service.config';
import Constants from '@/config/constants';
import log from "@/classes/Logger";

const routes = Router();

routes.post('/notice', Wrap(async(req, res) => {
  req.accepts('application/json');
  const user_id = req.body.user_id;
  const output = new StdObject();
  output.add('notices', 
    {
      20190910: [
        { content: '서지스토리 가입을 축하드립니다.', date: 201909100943 },
        { content: '가입축하 포인트 200점이 적립되었습니다.', date: 201909100943 },
      ],
      20190922: [
        { content: '업로드 하신 수술(시술) “화상수술2호님＂의 분석이 완료되었습니다. 마이드라이브에서 확인해 주세요.', date: 201909221117 },
        { content: '‘how to make my own AI?” 클립을 커뮤니티에 공유하였습니다.', date: 201909221417 },
        { content: '커뮤니티에 공유하신 클립에 “나잘람”님이 좋아요를 눌렀습니다.', date: 201909221617 },
      ],
    });
  res.json(output);
}));

export default routes;