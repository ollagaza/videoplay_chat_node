import {Router} from 'express';
import wrap from '@/utils/express-async';
import StdObject from '@/classes/StdObject';
import SendMail from '@/classes/SendMail';
import FileInfo from '@/classes/surgbook/FileInfo';
import Util from '@/utils/baseutil';
import Auth from '@/middlewares/auth.middleware';
import service_config from '@/config/service.config';
import querystring from 'querystring';
import log from "@/classes/Logger";


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
    const media_path = "C:\\surgbook\\EHMD\\OBG\\강소라\\180510_000167418_M_388\\";

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
}

export default routes;
