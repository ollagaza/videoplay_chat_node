import mkdirp from 'mkdirp';
import path from 'path';
import util from 'util';
import multer from 'multer';
import { Router } from 'express';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve('/node-temp/temp/'))
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now())
  },
});
const routes = Router();
const upload = util.promisify(multer({
  storage,
  limits: {
    fileSize: 1 * 1024 * 1024 * 1024, ///< 1GB 제한
  }
}).single('target'));

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
  console.log('up start');
  await upload(req, res);
  console.log(req.file);

  res.json(new StdObject());
}));

/**
 * @brief 파일 삭제
 */
routes.delete('/', wrap(async(req, res) => {

}));

export default routes;
