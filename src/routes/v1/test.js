import {Router} from 'express';
import _ from 'lodash';
import querystring from 'querystring';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import SendMail from '@/classes/SendMail';
import FileInfo from '@/classes/surgbook/FileInfo';
import Util from '@/utils/baseutil';
import Auth from '@/middlewares/auth.middleware';
import log from "@/classes/Logger";
import roles from "@/config/roles";
import mime from "mime-types";
import service_config from "@/config/service.config";
import config from "@/config/config";
import TestModel from '@/db/mongodb/model/test';
import ContentIdManager from '@/classes/ContentIdManager'
import {VideoProjectModel} from '@/db/mongodb/model/VideoProject';
import SequenceModel from '@/models/sequence/SequenceModel';
import text2png from "../../utils/textToImage";

const IS_DEV = config.isDev();

const routes = Router();

if (IS_DEV) {
  routes.get('/video/:project_seq(\\d+)/:scale', wrap(async(req, res) => {
    const project_seq = req.params.project_seq;
    const scale = Util.parseFloat(req.params.scale, 1);
    const video_project = await VideoProjectModel.findOneById(project_seq);
    const sequence_list = video_project.sequence_list;
    const sequence_model_list = [];
    for (let i = 0; i < sequence_list.length; i++) {
      const sequence_model = new SequenceModel().init(sequence_list[i]);
      if (sequence_model.type) {
        sequence_model_list.push(sequence_model.getXmlJson(i, scale));
      }
    }

    const video_xml_json = {
      "VideoInfo": {
        "MediaInfo": {
          "ContentId": video_project.content_id,
          "Width": 1920 * scale,
          "Height": 1080 * scale,
        },
        "SequenceList": {
          "Sequence": sequence_model_list
        }
      }
    };

    await Util.writeXmlFile(service_config.get('media_root') + video_project.project_path, 'video_project.xml', video_xml_json);

    res.json(video_xml_json);
  }));

  routes.get('/reg', wrap(async (req, res) => {
    const check_regex = /^\/static\/(index|storage)\/(.+)$/g;
    const url = '/static/storage/EHMD/OBG/강소라/180504_000167275_W_385/SEQ/Trans_180504_000167275_W_385_SEQ.mp4';
    log.d(req, url.match(check_regex));

    res.send(Util.urlToPath(url));
  }));

  routes.get('/co/:code', wrap(async (req, res) => {
    const code = req.params.code;
    res.send(Util.colorCodeToHex(code));
  }));

  routes.post('/mon', wrap(async (req, res) => {
    const sequence = req.body;
    const result = await TestModel.findBySequence(sequence);
    res.json(result);
  }));

  routes.get('/mon/:id', wrap(async (req, res) => {
    const id = req.params.id;
    const result = await TestModel.findOneById(id);
    res.json(result);
  }));

  routes.get('/mon', wrap(async (req, res) => {
    const content_id = await ContentIdManager.getContentId();
    const result = await TestModel.create(content_id, [1, 5, 10]);
    res.json(result);
  }));

  routes.get('/t/:id', wrap(async (req, res) => {
    console.log(req.params.id);
    res.send("" + Util.getRandomNumber(parseInt(req.params.id)));
  }));

  routes.get('/crypto', wrap(async (req, res) => {
    const data = {
      r: Util.getRandomString(5),
      s: 155
    };

    const enc_text = Util.encrypt(data);
    const dec = JSON.parse(Util.decrypt(enc_text));

    const output = new StdObject();
    output.add("enc", enc_text);
    output.add("dec", dec);

    res.json(output);
  }));

  routes.get('/token', wrap(async (req, res) => {
    const result = await Auth.verifyToken(req);
    res.json(result);
  }));

  routes.get('/uuid', wrap(async (req, res) => {
    const uuid = await Util.getUuid();
    const output = new StdObject();
    output.add('uuid', uuid);

    res.json(output);
  }));

  routes.get('/forward', wrap(async (req, res, next) => {
    const url = 'http://localhost:3000/api/v1/operations/9/request/analysis';
    const admin_member_info = {
      seq: 0,
      role: roles.ADMIN
    };
    const token_result = Auth.generateTokenByMemberInfo(admin_member_info);
    const forward_result = await Util.forward(url, 'POST', token_result.token);
    res.json(forward_result);
  }));
}

export default routes;
