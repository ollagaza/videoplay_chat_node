import {Router} from 'express';
import _ from 'lodash';
import natsort from 'natsort';
import path from 'path';
import querystring from 'querystring';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import SendMail from '@/classes/SendMail';
import FileInfo from '@/classes/surgbook/FileInfo';
import Util from '@/utils/baseutil';
import Auth from '@/middlewares/auth.middleware';
import service_config from '@/config/service.config';
import log from "@/classes/Logger";
import roles from "@/config/roles";
import request from 'request-promise';

const IS_DEV = process.env.NODE_ENV === 'development';

const routes = Router();

if (IS_DEV) {
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

  routes.get('/xml/:xml_name', wrap(async (req, res) => {
    const xml_name = req.params.xml_name;
    const media_path = "\\\\192.168.1.54\\dev\\data\\EHMD\\OBG\\강소라\\180504_000167275_W_385\\";

    const json = await Util.loadXmlFile(media_path, xml_name + '.xml');
    const output = new StdObject();
    output.add('xml', json);

    await Util.writeXmlFile(media_path, xml_name + '2.xml', json);

    res.json(output);
  }));

  routes.get('/replace', wrap(async (req, res) => {
    const source = "SEQ\\Trans_180510_000167418_M_s001.mp4";
    const dest_rename_regex = /^[\w]+\\([\w]+)\.([\w]+)$/i;
    const start_frame = 12456;
    const end_frame = 35717;
    res.send(source.replace(dest_rename_regex, 'Clip\\$1_' + start_frame + '_' + end_frame + '.$2'));
  }));

  routes.get('/mail', wrap(async (req, res) => {
    await new SendMail().test();
    res.send('ok');
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

  routes.get('/deletedir', wrap(async (req, res) => {
    let result = null;
    try{
      result = await Util.deleteDirectory("C:\\trash\\1547023141_1032_39_test2");
    } catch (e) {
      result = e;
      log.e(req, e);
    }

    const output = new StdObject();
    output.add('result', result);

    res.json(output);
  }));

  routes.get('/sort', wrap(async (req, res) => {
    const service_info = service_config.getServiceInfo();
    const content_id = 'aaa';
    const video_file_name = 'test.mp4';
    const index_list_data = {
      "ContentID": content_id,
      "PageNum": 1,
      "CountOfPage": 1000,
      "Type": 1,
      "PassItem": "false"
    };
    const index_list_api_params = querystring.stringify(index_list_data);

    const index_list_api_options = {
      hostname: service_info.hawkeye_server_domain,
      port: service_info.hawkeye_server_port,
      path: service_info.hawkeye_index_list_api + '?' + index_list_api_params,
      method: 'GET'
    };
    const index_list_api_url = 'http://' + service_info.hawkeye_server_domain + ':' + service_info.hawkeye_server_port + service_info.hawkeye_index_list_api + '?' + index_list_api_params;
    log.d(req, 'call hawkeye index list api', index_list_api_url);

    const index_list_request_result = await Util.httpRequest(index_list_api_options, false);
    const index_list_xml_info = await Util.loadXmlString(index_list_request_result);
    if (!index_list_xml_info || !index_list_xml_info.errorimage || index_list_xml_info.errorimage.error) {
      if (index_list_xml_info.errorimage && index_list_xml_info.errorimage.error) {
        throw new StdObject(Util.getXmlText(index_list_xml_info.errorimage.error), Util.getXmlText(index_list_xml_info.errorimage.msg), 500);
      } else {
        throw new StdObject(3, "XML 파싱 오류", 500);
      }
    }

    let index_file_list = [];
    let frame_info = index_list_xml_info.errorimage.frameinfo;
    if (frame_info) {
      if (_.isArray(frame_info)) {
        frame_info = frame_info[0];
      }
      const index_xml_list = frame_info.item;
      if (index_xml_list) {
        for (let i = 0; i < index_xml_list.length; i++) {
          const index_xml_info = index_xml_list[i];
          const image_path = Util.getXmlText(index_xml_info.orithumb);
          const image_file_name = path.basename(image_path);
          index_file_list.push(video_file_name + "_" + image_file_name);
        }
      }
      index_file_list.sort(natsort());
    }
    const index_xml_info = {
      "IndexInfo": {
        "Index": index_file_list
      }
    };
    res.json(index_xml_info);
  }));

  routes.get('/meta', wrap(async (req, res) => {
    const dir = "\\\\192.168.0.54\\surgbook\\EHMD\\OBG\\강소라\\180510_000167418_M_388\\SEQ";
    const file_list = Util.getDirectoryFileList(dir);
    for (let i = 0; i < file_list.length; i++) {
      const file = file_list[i];
      if (file.isFile()) {
        const file_path = dir + "\\" + file.name;
        const file_info = new FileInfo().getByFilePath(file_path, "\\EHMD\\OBG\\강소라\\180510_000167418_M_388\\", file.name);
        log.d(file_info.toJSON());
      }

    }
    const output = new StdObject();
    output.add('size', Util.getDirectoryFileSize(dir));
    res.json(output);
  }));

  routes.get('/request', wrap(async (req, res) => {
    const service_info = service_config.getServiceInfo();
    const dir = "\\\\192.168.0.54\\surgbook\\EHMD\\OBG\\강소라\\180510_000167418_M_388\\SEQ";
    const query_data = {
      "DirPath": dir,
      "ContentID": "b50d2f70-1c37-11e9-b69d-b94419138e86"
    };
    const query_str = querystring.stringify(query_data);

    const request_options = {
      hostname: service_info.trans_server_domain,
      port: service_info.trans_server_port,
      path: service_info.hawkeye_index_list_api + '?' + query_str,
      method: 'GET'
    };
    const api_url = 'http://' + service_info.trans_server_domain + ':' + service_info.trans_server_port + service_info.hawkeye_index_list_api + '?' + query_str;
    log.d(api_url);

    let api_request_result = null;
    let is_execute_success = false;
    try {
      api_request_result = await Util.httpRequest(request_options, false);
      is_execute_success = api_request_result && api_request_result.toLowerCase() === 'done';
    } catch (e) {
      log.e(e);
      api_request_result = e.message;
    }
    const output = new StdObject();
    output.add('api_request_result', api_request_result);
    output.add('is_execute_success', is_execute_success);
    res.json(output);
  }));

  routes.get('/forward', wrap(async (req, res, next) => {
    const url = 'http://localhost:3000/api/v1/operations/9/request/analysis';
    const admin_member_info = {
      seq: 0,
      role: roles.ADMIN,
      hospital_code: 'XXXX',
      depart_code: 'ZZZ'
    };
    const token_result = Auth.generateTokenByMemberInfo(admin_member_info);
    const forward_result = await Util.forward(url, 'POST', token_result.token);
    res.json(forward_result);
  }));
}

export default routes;
