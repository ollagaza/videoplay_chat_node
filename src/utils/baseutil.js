import fs from 'fs';
import Iconv from 'iconv';
import dateFormat from 'dateformat';
import { promisify } from 'util';
import { exec } from 'child_process';
import _ from 'lodash';
import StdObject from "@/classes/StdObject";
import xml2js from 'xml2js';
import crypto from 'crypto';
import aes256 from 'nodejs-aes256';
import service_config from '@/config/service.config';
import  base64url from 'base64-url';

const XML_PARSER = new xml2js.Parser({trim: true});
const XML_BUILDER = new xml2js.Builder({trim: true});

const RANDOM_KEY_SPACE = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const TIMEZONE_OFFSET = new Date().getTimezoneOffset() * 60000;
const NEW_LINE_REGEXP = /\r?\n/g;

const convert = (from_charset, to_charset, str) => {
  const iconv = new Iconv.Iconv(from_charset, to_charset);
  return iconv.convert(str).toString();
};

const removePathSEQ = (media_path) => {
  return media_path.replace(/SEQ.*$/i, '');
};

const getMediaDirectory = (media_root, media_path) => {
  const path = removePathSEQ(media_path);

  return media_root + path;
};

const getUrlPrefix = (media_root, media_path) => {
  let path = media_root + removePathSEQ(media_path);
  path = path.replace(/\\/g, '/');
  path = path.replace(/^\/+/g, '');

  return '/' + path;
};

const saveToFile = async (file_path, context) => {
  fs.writeFileSync(file_path, context, 'utf8');

  return true;
};

const timeStrToSecond = (time_str) => {
  let sec = 0;
  let multi = 1;
  const time_list = time_str.split(':');
  const list_length = time_list.length;

  for(let i = list_length-1; i >= 0; i--){
    sec += parseInt(time_list[i], 10) * multi;
    multi *= 60;
  }

  return sec;
};

const dateFormatter = (timestamp, format='HH:MM:ss', use_offset) => {
  if (use_offset) {
    timestamp += TIMEZONE_OFFSET;
  }
  return dateFormat(timestamp, format);
};

export default {
  "convert": convert,

  "getMediaDirectory": getMediaDirectory,

  "getUrlPrefix": getUrlPrefix,

  "saveToFile": saveToFile,

  "timeStrToSecond": timeStrToSecond,

  "secondToTimeStr": (second, format='HH:MM:ss') => { return dateFormatter(second*1000, format, true); },

  "dateFormat": (timestamp, format='yyyy-mm-dd HH:MM:ss') => { return dateFormatter(timestamp, format); },

  "currentFormattedDate": (format='yyyy-mm-dd HH:MM:ss') => { return dateFormatter(new Date().getTime(), format); },

  "loadXmlFile": async (directory, xml_file_name) => {
    const xml_file_path = directory + xml_file_name;

    let context = null;
    try {
      context = await promisify(fs.readFile)(xml_file_path);
    } catch (e) {
      console.log(e);
      return {};
    }
    if (context == null) {
      console.log(xml_file_path + ' context is empty');
      return {};
    }

    context = context.toString();

    const result = await promisify(XML_PARSER.parseString.bind(XML_PARSER))(context);
    return result;
  },

  "writeXmlFile": async (directory, xml_file_name, context_json) => {
    const xml_file_path = directory + xml_file_name;

    const xml = XML_BUILDER.buildObject(JSON.parse(JSON.stringify(context_json)));
    await saveToFile(xml_file_path, xml);
    return true;
  },

  "isEmpty": (value) => {
    if (value === undefined || value === null) {
      return true;
    }
    if (_.isNumber(value)) {
      return false;
    }
    if (_.isString(value)) {
      return _.trim(value) == '';
    }
    return _.isEmpty(value);
  },

  "trim": (value) => {
    if (value === undefined || value === null) {
      return '';
    }

    return _.trim(value);
  },

  "getRandomString": (length=10) => {
    let str = '';
    const space_length = RANDOM_KEY_SPACE.length;
    for (let i = 0; i < length; i++) {
      str += RANDOM_KEY_SPACE[Math.floor(Math.random()*space_length)];
    }
    return str;
  },

  "equals": (target, compare, ignore_case=true) => {
    if (!target || !compare) {
      return false;
    }
    if (ignore_case) {
      return target.toLowerCase() === compare.toLowerCase();
    }
    else {
      return target === compare;
    }
  },

  "execute": async (command) => {
    const output = new StdObject();
    try {
      const result = await promisify(exec)(command);
      console.log(result.stdout);
      output.add('result', result.stdout)
    }
    catch(e) {
      console.log(e);
      output.error = -1;
      output.stack = e;
    }
    return output;
  },

  "copyFile": async (source, destination) => {
    let result = null;
    const output = new StdObject();
    try {
      result = await promisify(fs.copyFile)(source, destination);
      output.add("copy_result", result);
    } catch (e) {
      output.error = -1;
      output.message = "파일복사 오류";
      output.stack = e;
      output.source = source;
      output.destination = destination;
    }

    return output;
  },

  "fileExists": (file_path) => {
    try{
      return fs.existsSync(file_path);
    } catch (error) {
      return false;
    }
  },

  "createDirectory": (dir_path) => {
    try{
      fs.mkdirSync(dir_path, { recursive: true });
      return true;
    } catch (error) {
      return false;
    }
  },

  "rename": (target_path, dest_path) => {
    try{
      fs.renameSync(target_path, dest_path);
      return true;
    } catch (error) {
      return false;
    }
  },

  "hourDifference": (target_date) => {
    const time_diff = Math.abs(target_date.getTime() - Date.now());
    const diff_hours = Math.ceil(time_diff / (1000 * 3600));
    return diff_hours;
  },

  "hash": (text, hash_algorithm='sha256') => {
    return crypto.createHash(hash_algorithm).update(text).digest('base64');
  },

  "encrypt": (plain_data) => {
    let plain_text;
    if (_.isObject(plain_data)) {
      plain_text = JSON.stringify(plain_data);
    } else {
      plain_text = plain_data;
    }

    return base64url.encode(aes256.encrypt(service_config.get('crypto_key'), plain_text), 'utf-8');
  },

  "decrypt": (encrypted_data) => {
    try{
      return aes256.decrypt(service_config.get('crypto_key'), base64url.decode(encrypted_data, 'utf-8'));
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  "nlToBr": (text) => {
    if (!text) {
      return "";
    }
    return text.replace(NEW_LINE_REGEXP, "<br>\n");
  },

  "pathToUrl": (path) => {
    path = path.replace(/\\/g, '/');
    path = path.replace(/^\/+/g, '');

    return '/' + path;
  }
};
