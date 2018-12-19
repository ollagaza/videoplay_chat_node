import fs from 'fs';
import Iconv from 'iconv';
import dateFormat from 'dateformat';
import { promisify } from 'util';
import { exec } from 'child_process';
import _ from 'lodash';
import StdObject from "@/classes/StdObject";
import xml2js from 'xml2js';

const parser = new xml2js.Parser({trim: true});
const builder = new xml2js.Builder({trim: true});

const random_key_space = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const timezone_offset = new Date().getTimezoneOffset() * 60000;

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
    timestamp += timezone_offset;
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

    const result = await promisify(parser.parseString.bind(parser))(context);
    return result;
  },

  "writeXmlFile": async (directory, xml_file_name, context_json) => {
    const xml_file_path = directory + xml_file_name;

    const xml = builder.buildObject(JSON.parse(JSON.stringify(context_json)));
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
    const space_length = random_key_space.length;
    for (let i = 0; i < length; i++) {
      str += random_key_space[Math.ceil(Math.random()*space_length)];
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
      const result = await exec(command);
      output.add('result', result)
    }
    catch(e) {
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
    return fs.existsSync(file_path);
  },

  "createDirectory": (dir_path) => {
    return fs.mkdirSync(dir_path);
  }
};
