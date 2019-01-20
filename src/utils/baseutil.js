import fs from 'fs';
import fse from 'fs-extra';
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
import base64url from 'base64-url';
import uuidv1 from 'uuid/v1';
import http from 'http';
import https from 'https';

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
  try{
    await promisify(fs.writeFile)(file_path, context, 'utf8');
    return true;
  } catch(error) {
    console.log(error);
    return false;
  }
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

const fileExists = (file_path) => {
  try{
    return fs.existsSync(file_path);
  } catch (error) {
    return false;
  }
};

const getDirectoryFileList = (directory_path) => {
  if (fileExists(directory_path)) {
    return fs.readdirSync(directory_path, {withFileTypes: true});
  } else {
    return [];
  }
};

const getFileStat = (file_path) => {
  if (fileExists(file_path)) {
    return fs.statSync(file_path);
  } else {
    return null;
  }
};

const loadXmlString = async (context) => {
  let result = {};
  if (!isEmpty(context)) {
    try {
      result = await promisify(XML_PARSER.parseString.bind(XML_PARSER))(context);
    } catch (e) {
      console.error(e);
    }
  }
  return result;
};

const isEmpty = (value) => {
  if (value === undefined || value === null) {
    return true;
  }
  if (_.isNumber(value)) {
    return false;
  }
  if (_.isString(value)) {
    return _.trim(value) === '';
  }
  return _.isEmpty(value);
};

export default {
  "convert": convert,

  "removePathSEQ": removePathSEQ,

  "getMediaDirectory": getMediaDirectory,

  "getUrlPrefix": getUrlPrefix,

  "saveToFile": saveToFile,

  "timeStrToSecond": timeStrToSecond,

  "secondToTimeStr": (second, format='HH:MM:ss') => { return dateFormatter(second*1000, format, true); },

  "dateFormat": (timestamp, format='yyyy-mm-dd HH:MM:ss') => { return dateFormatter(timestamp, format); },

  "currentFormattedDate": (format='yyyy-mm-dd HH:MM:ss') => { return dateFormatter(new Date().getTime(), format); },

  "loadXmlFile": async (directory, xml_file_name) => {
    const xml_file_path = directory + xml_file_name;

    let result = {};
    let context = null;
    if (!fileExists(xml_file_path)) {
      console.log(`${xml_file_path} not exists`);
      return result;
    }

    try {
      context = await promisify(fs.readFile)(xml_file_path);
    } catch (e) {
      console.log(e);
      return result;
    }
    if (context == null) {
      console.log(xml_file_path + ' context is empty');
      return result;
    }

    context = context.toString();
    return await loadXmlString(context);
  },

  "loadXmlString": loadXmlString,

  "writeXmlFile": async (directory, xml_file_name, context_json) => {
    const xml_file_path = directory + xml_file_name;

    const xml = XML_BUILDER.buildObject(JSON.parse(JSON.stringify(context_json)));
    await saveToFile(xml_file_path, xml);
    return true;
  },

  "isEmpty": isEmpty,

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
      output.add('result', result.stdout)
    }
    catch(error) {
      console.error(error);
      output.error = -1;
      output.stack = error;
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

  "fileExists": fileExists,

  "createDirectory": (dir_path) => {
    try{
      if (!fileExists(dir_path)) {
        fs.mkdirSync(dir_path, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  "rename": (target_path, dest_path) => {
    try{
      fs.renameSync(target_path, dest_path);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  },

  "delete": (target_path) => {
    try{
      fse.removeSync(target_path);
      return true;
    } catch (error) {
      console.error(error);
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
      console.error(e);
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
  },

  "getXmlText": (element) => {
    if (!element) {
      return "";
    }
    if (element._) {
      return element._;
    }
    if (_.isArray(element)) {
      return element[0];
    }
    return element;
  },

  "getUuid": () => {
    return uuidv1();
  },

  "httpRequest": (options, post_data, is_https=false) => {
    return new Promise((resolve, reject) => {
      let req;
      if (is_https) {
        req = https.request(options);
      } else {
        req = http.request(options);
      }

      req.on('response', res => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error('statusCode=' + res.statusCode));
        }

        const body = [];
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body.push(Buffer.from(chunk));
        });
        res.on('end', () => {
          resolve(Buffer.concat(body).toString());
        });
      });

      req.on('error', err => {
        console.log(err);
        reject(err);
      });

      if (post_data) {
        req.write(post_data);
      }
      req.end();
    });
  },

  "getDirectoryFileList": getDirectoryFileList,

  "getDirectoryFileSize": (directory_path) => {
    const file_list = getDirectoryFileList(directory_path);
    let file_size = 0;
    for (let i = 0; i < file_list.length; i++) {
      const file = file_list[i];
      if (file.isFile()) {
        const file_info = getFileStat(directory_path + "\\" + file.name);
        file_size += file_info.size;
      }
    }
    return file_size;
  },

  "getFileStat": getFileStat,

  "byteToMB": (byte) => {
    return Math.ceil(byte/1024/1024);
  }
};
