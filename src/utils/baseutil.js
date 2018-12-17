import fs from 'fs';
import xmlParser from 'fast-xml-parser';
import Iconv from 'iconv';
import dateFormat from 'dateformat';
import { promisify } from 'util';
import _ from 'lodash';
import xmlOptions from '@/config/xml.options';
import IndexFileInfo from '@/classes/surgbook/IndexFileInfo';

const random_key_space = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
const index_file_regexp = /(.+\.[a-z0-9]+)_([0-9]+)_([0-9]+)_(0x[0-9]+)_0\.jpg$/i;
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
  fs.open(file_path, 'w', function(err, fd) {
    if (err) {
      throw 'error opening file: ' + err;
    }

    const context_buffer = new Buffer("<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + context);
    fs.write(fd, context_buffer, 0, context_buffer.length, null, function(err) {
      if (err) throw 'error writing file: ' + err;
      fs.close(fd, function() {
        console.log('file written');
      })
    });
  });
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
    const xml_file_path = directory + xml_file_name + '.xml';

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

    if (xmlParser.validate(context) === true) {
      return xmlParser.parse(context, xmlOptions);
    }
    else {
      console.log(xml_file_path + ' invalid xml file');
      return {};
    }
  },

  "writeXmlFile": (directory, xml_file_name, context_json) => {
    const xml_file_path = directory + xml_file_name + '.xml';

    const parser = new xmlParser.j2xParser(xmlOptions);
    let xml = parser.parse(context_json);
    xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" + xml;
    saveToFile(xml_file_path, xml);
  },

  "parseIndexFileName": (file_name) => {
    const matchs = file_name.match(index_file_regexp);
    if (matchs == null || matchs.length == 0) {
      return null;
    }

    return new IndexFileInfo(matchs[1], matchs[2], matchs[3], matchs[4]);
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
  }
};
