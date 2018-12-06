import { Router } from 'express';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';

const routes = Router();

/**
 * @brief 파일 리스팅
 */
routes.get('/', wrap(async(req, res) => {
  res.json(new StdObject(0, process.env.NODE_ENV));
}));

/**
 * @brief 파일 업로드
 */
routes.post('/', wrap(async(req, res) => {

}));

/**
 * @brief 파일 삭제
 */
routes.delete('/', wrap(async(req, res) => {

}));

export default routes;
