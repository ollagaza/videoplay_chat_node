import { Router } from 'express';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import database from '@/config/database';
import DoctorModel from '@/models/doctor.model';

const routes = Router();

routes.get('/', wrap(async(req, res) => {
  // 트랜젝션이 필요 없는 쿼리 예시
  const oDoctorModel = new DoctorModel({ database });
  const result = await oDoctorModel.findPaginated(req.query);

  const output = new StdObject();
  output.adds(result);

  res.json(output);
}));

export default routes;
