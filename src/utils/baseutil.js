import fs from 'fs';
import Iconv from 'iconv';
import dateFormat from 'dateformat';
import { promisify } from 'util';
import { exec } from 'child_process';
import _ from 'lodash';
import xml2js from 'xml2js';
import crypto from 'crypto';
import aes256 from 'nodejs-aes256';
import base64url from 'base64-url';
import uuidv1 from 'uuid/v1';
import http from 'http';
import https from 'https';
import request from 'request-promise';
import getDimension from 'get-video-dimensions';
import getDuration from 'get-video-duration';
import path from 'path';
import multer from 'multer';
import service_config from '@/config/service.config';
import constants from '@/config/constants';
import log from "@/classes/Logger";
import JsonPath from "jsonpath";

const XML_PARSER = new xml2js.Parser({trim: true});
const XML_BUILDER = new xml2js.Builder({trim: true, cdata: true});

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
  let full_path = media_root + removePathSEQ(media_path);
  full_path = full_path.replace(/\\/g, '/');
  full_path = full_path.replace(/^\/+/g, '');

  return '/' + full_path;
};

const timeStrToSecond = (time_str) => {
  let sec = 0;
  let multi = 1;
  const time_list = time_str.split(':');
  const list_length = time_list.length;

  for(let i = list_length-1; i >= 0; i--){
    sec += getInt(time_list[i], 10) * multi;
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

const fileExists = async (file_path, permission=null) => {
  const async_func = new Promise( resolve => {
    if (!permission) {
      permission = fs.constants.W_OK;
    }
    fs.access(file_path, permission, (error) => {
      if (error) {
        // log.e(null, 'Util.fileExists', error);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });

  return await async_func;
};

const readFile = async (file_path) => {
  const async_func = new Promise( async resolve => {
    if ( !( await fileExists(file_path) ) ) {
      log.d(null, 'Util.readFile', `file not exists. path=${file_path}`);
      resolve(null);
    } else {
      const read_stream = fs.createReadStream(file_path);
      const body = [];
      read_stream.setEncoding('utf8');
      read_stream.on('data', (chunk) => {
        body.push(Buffer.from(chunk));
      });
      read_stream.on('end', () => {
        resolve(Buffer.concat(body).toString());
      });
      read_stream.on('error', function(error){
        log.e(null, 'Util.readFile', `path=${file_path}`, error);
        resolve(null);
      });
    }
  });

  return await async_func;
};

const writeFile = async (file_path, context) => {
  const async_func = new Promise( async resolve => {
    // 쓰기를 위한 스트림 생성
    const write_stream = fs.createWriteStream(file_path);

    write_stream.on('finish', function() {
      resolve(true);
    });

    write_stream.on('error', function(error){
      log.e(null, 'Util.writeFile', `path=${file_path}`, error);
      resolve(false);
    });

    write_stream.write(context,'utf8');
    write_stream.end();
  });

  return await async_func;
};

const deleteFile = async (target_path) => {
  const async_func = new Promise( async resolve => {
    if ( !( await fileExists(target_path) ) ) {
      log.d(null, 'Util.deleteFile', `file not exists. path=${target_path}`);
      resolve(true);
    } else {
      fs.unlink(target_path, (error) => {
        if (error) {
          log.e(null, 'Util.deleteFile', `path=${target_path}`, error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    }
  });

  return await async_func;
};

const renameFile = async (target_path, dest_path) => {
  const async_func = new Promise( async resolve => {
    if ( !( await fileExists(target_path) ) ) {
      log.d(null, 'Util.renameFile', `file not exists. target_path=${target_path}`);
      resolve(false);
    } else if ( ( await fileExists(dest_path) ) ) {
      log.d(null, 'Util.renameFile', `file already exists. dest_path=${dest_path}`);
      resolve(false);
    } else {
      fs.rename(target_path, dest_path, (error) => {
        if (error) {
          log.e(null, 'Util.renameFile', `target_path=${target_path}, dest_path=${dest_path}`, error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    }
  });

  return await async_func;
};

const copyFile = async (target_path, dest_path) => {
  const async_func = new Promise( async resolve => {
    if ( !( await fileExists(target_path) ) ) {
      log.d(null, 'Util.renameFile', `file not exists. target_path=${target_path}`);
      resolve(false);
    } else {
      fs.copyFile(target_path, dest_path, (error) => {
        if (error) {
          log.e(null, 'Util.copyFile', `target_path=${target_path}, dest_path=${dest_path}`, error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    }
  });

  return await async_func;
};

const getFileStat = async (file_path) => {
  const async_func = new Promise( async resolve => {
    if ( !( await fileExists(file_path) ) ) {
      log.d(null, 'Util.getFileStat', `file not exists. path=${file_path}`);
      resolve(null);
    } else {
      fs.stat(file_path, (error, stats) => {
        if (error) {
          log.e(null, 'Util.getFileStat', `path=${file_path}`, error);
          resolve(null);
        } else {
          resolve(stats);
        }
      });
    }
  });

  return await async_func;
};

const createDirectory = async (dir_path) => {
  const async_func = new Promise( async resolve => {
    if ( ( await fileExists(dir_path) ) ) {
      log.d(null, 'Util.createDirectory', `directory already exists. path=${dir_path}`);
      resolve(true);
    } else {
      fs.mkdir(dir_path, { recursive: true }, (error) => {
        if (error) {
          log.e(null, 'Util.createDirectory', `path=${dir_path}`, error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    }
  });

  return await async_func;
};

const deleteDirectory = async (path) => {
  const file_list = await getDirectoryFileList(path);
  for (let i = 0; i < file_list.length; i++) {
    const file = file_list[i];
    if (file.isDirectory()) {
      await deleteDirectory( path + "\\" + file.name );
    } else {
      await deleteFile( path + "\\" + file.name );
    }
  }
};

const getDirectoryFileList = async (directory_path) => {
  const async_func = new Promise( async resolve => {
    if ( !( await fileExists(directory_path) ) ) {
      log.d(null, 'Util.getDirectoryFileList', `directory not exists. path=${directory_path}`);
      resolve([]);
    } else {
      fs.readdir(directory_path, {withFileTypes: true}, (error, files) => {
        if (error) {
          log.e(null, 'Util.getDirectoryFileList', `path=${directory_path}`, error);
          resolve([]);
        } else {
          resolve(files);
        }
      });
    }
  });

  return await async_func;
};

const loadXmlString = async (context) => {
  let result = {};
  if (!isEmpty(context)) {
    try {
      result = await promisify(XML_PARSER.parseString.bind(XML_PARSER))(context);
    } catch (error) {
      log.e(null, 'Util.loadXmlString', error);
    }
  }
  return result;
};

const isNumber = (str) => {
  try {
    return !isNaN(parseFloat(str)) && isFinite(str);
  } catch (e) {
    log.e(null, 'Util.isNumber', e);
    return false;
  }
};

const getInt = (str, on_error_result=0) => {
  if (isNumber(str)) {
    try {
      return parseInt(str, 10);
    } catch (e) {
      return on_error_result;
    }
  } else {
    return on_error_result;
  }
};

const getFloat = (str, on_error_result=0) => {
  if (isNumber(str)) {
    try {
      return parseFloat(str);
    } catch (e) {
      return on_error_result;
    }
  } else {
    return on_error_result;
  }
};

const isEmpty = (value) => {
  if (value === undefined || value === null) {
    return true;
  }
  if (typeof value === 'object') {
    return _.isEmpty(value);
  }
  if (isNumber(value)) {
    return false;
  }
  if (_.isString(value)) {
    return _.trim(value) === '';
  }
  return _.isEmpty(value);
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.resolve(req.upload_directory))
  },
  filename: function (req, file, cb) {
    cb(null, 'upload_' + file.originalname)
  },
});

const uploadByRequest = async (req, res, key, upload_directory) => {
  const async_func = new Promise( (resolve, reject) => {
    const uploader = multer({
      storage,
      limits: {
        fileSize: 20 * 1024 * 1024 * 1024, ///< 20GB 제한
      }
    }).single(key);
    req.upload_directory = upload_directory;
    uploader(req, res, error => {
      if (error) {
        log.e(req, error);
        reject(error);
      } else {
        log.d(req, 'on upload job finished');
        resolve(true);
      }
    });
  });

  return await async_func;
};

const execute = async (command) => {
  const result = {
    success: false,
    message: '',
    out: null,
    command: command
  };
  try {
    const exec_result = await promisify(exec)(command);
    result.success = true;
    result.out = exec_result.stdout;
  }
  catch(error) {
    log.e(null, 'Util.execute', error);
    result.message = error.message;
  }
  return result;
};

const getMediaInfo = async (media_path) => {
  const async_func = new Promise( async (resolve) => {
    const execute_result = await execute(`mediainfo --Full --Output=JSON "${media_path}"`);
    const media_result = {
      success: false,
      media_type: constants.NO_MEDIA,
      media_info: {}
    };

    if (execute_result.success && execute_result.out) {
      const media_info = JSON.parse(execute_result.out);
      const video = JsonPath.value(media_info, '$..track[?(@.@type=="Video")]');
      const audio = JsonPath.value(media_info, '$..track[?(@.@type=="Audio")]');
      const image = JsonPath.value(media_info, '$..track[?(@.@type=="Image")]');

      media_result.success = true;
      if (!isEmpty(video)) {
        media_result.media_type = constants.MEDIA_VIDEO;
        media_result.media_info.width = getInt(video.Width);
        media_result.media_info.height = getInt(video.Height);
        media_result.media_info.fps = getFloat(video.FrameRate);
        media_result.media_info.frame_count = getInt(video.FrameCount);
        media_result.media_info.duration = Math.round(getFloat(video.Duration));
      } else if (!isEmpty(audio)) {
        media_result.media_type = constants.MEDIA_AUDIO;
        media_result.media_info.duration = Math.round(getFloat(audio.Duration));
        media_result.media_info.sample_rate = Math.round(getFloat(audio.SamplingRate));
        media_result.media_info.bit_depth = Math.round(getFloat(audio.BitDepth));
      } else if (!isEmpty(image)) {
        media_result.media_type = constants.MEDIA_IMAGE;
        media_result.media_info.width = getInt(image.Width);
        media_result.media_info.height = getInt(image.Height);
      } else {
        media_result.success = false;
      }
    }

    resolve(media_result);
  });

  return await async_func;
};

const getVideoDimension = async (video_path) => {
  const result = {
    success: false,
    message: ''
  };
  try {
    const dimensions = await getDimension(video_path);
    result.success = true;
    result.width = dimensions.width;
    result.height = dimensions.height;
  } catch(error) {
    log.e(null, "getVideoDimension", error);
    result.message = error.message;
  }
  return result;
};

const getVideoDuration = async (video_path) => {
  const result = {
    success: false,
    message: ''
  };
  try {
    const duration = await getDuration.getVideoDurationInSeconds(video_path);
    result.success = true;
    result.duration = duration;
  } catch(error) {
    log.e(null, "getVideoDuration", error);
    result.message = error.message;
  }
  return result;
};

const getThumbnail = async (origin_path, resize_path, second = -1, width = -1, height = -1) => {
  let filter = '';
  let time_option = '';
  if (width > 0 && height > 0) {
    const dimension = await getVideoDimension(origin_path);
    if (!dimension.success) {
      return dimension;
    }

    const w_ratio = dimension.width / width;
    const h_ratio = dimension.height / height;
    let crop_option = '';
    if (w_ratio >= h_ratio) {
      crop_option = `crop=in_h*${width}/${height}:in_h`;
    } else {
      crop_option = `crop=in_w:in_w*${height}/${width}`;
    }
    const scale_option = `scale=${width}:${height}`;
    filter = `-filter:v "${crop_option},${scale_option}"`;
  }
  if (second > 0) {
    const time_str = secondToTimeStr(second, 'HH:MM:ss', true);
    time_option = `-ss ${time_str}`;
  }
  const command = `ffmpeg ${time_option} -i "${origin_path}" -y -vframes 1 ${filter} -an "${resize_path}"`;
  return await execute(command);
};

const secondToTimeStr = (second, format='HH:MM:ss', use_decimal_point=false) => {
  let date_str = dateFormatter(second*1000, format, true);
  if (use_decimal_point) {
    const second_str = `${second}`;
    const point_index = second_str.indexOf('.');
    if (point_index >= 0) {
      const decimal_str = second_str.substring(point_index + 1);
      if (!isEmpty(decimal_str)) {
        date_str += `.${decimal_str}`;
      }
    }
  }
  return date_str;
};

export default {
  "convert": convert,

  "removePathSEQ": removePathSEQ,

  "getMediaDirectory": getMediaDirectory,

  "getUrlPrefix": getUrlPrefix,

  "timeStrToSecond": timeStrToSecond,

  "secondToTimeStr": secondToTimeStr,

  "dateFormat": (timestamp, format='yyyy-mm-dd HH:MM:ss') => { return dateFormatter(timestamp, format); },

  "currentFormattedDate": (format='yyyy-mm-dd HH:MM:ss') => { return dateFormatter(new Date().getTime(), format); },

  "loadXmlFile": async (directory, xml_file_name) => {
    const xml_file_path = directory + xml_file_name;

    let result = {};
    let context = null;
    if ( !( await fileExists(xml_file_path) ) ) {
      log.d(null, "Util.loadXmlFile", `${xml_file_path} not exists`);
      return result;
    }

    try {
      context = await readFile(xml_file_path);
    } catch (error) {
      log.e(null, 'Util.loadXmlFile', error);
      return result;
    }
    if (context == null) {
      log.d(null, "Util.loadXmlFile", xml_file_path + ' context is empty');
      return result;
    }

    context = context.toString();
    return await loadXmlString(context);
  },

  "loadXmlString": loadXmlString,

  "writeXmlFile": async (directory, xml_file_name, context_json) => {
    const xml_file_path = directory + xml_file_name;

    const xml = XML_BUILDER.buildObject(JSON.parse(JSON.stringify(context_json)));
    await writeFile(xml_file_path, xml);
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

  "fileExists": fileExists,
  "readFile": readFile,
  "writeFile": writeFile,
  "deleteFile": deleteFile,
  "renameFile": renameFile,
  "copyFile": copyFile,
  "getFileStat": getFileStat,
  "createDirectory": createDirectory,
  "deleteDirectory": deleteDirectory,
  "getDirectoryFileList": getDirectoryFileList,

  "getDirectoryFileSize": async (directory_path) => {
    const file_list = await getDirectoryFileList(directory_path);
    let file_size = 0;
    for (let i = 0; i < file_list.length; i++) {
      const file = file_list[i];
      if (file.isFile()) {
        const file_info = await getFileStat(directory_path + "\\" + file.name);
        file_size += file_info.size;
      }
    }
    return file_size;
  },

  "hourDifference": (target_date) => {
    const time_diff = Math.abs(target_date.getTime() - Date.now());
    return Math.ceil(time_diff / (1000 * 3600));
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
    } catch (error) {
      log.e(null, 'Util.decrypt', error);
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
        log.d(null, "Util.httpRequest", err);
        reject(err);
      });

      if (post_data) {
        req.write(post_data);
      }
      req.end();
    });
  },

  "byteToMB": (byte) => {
    return Math.ceil(byte/1024/1024);
  },

  "isNumber": isNumber,
  "parseInt": getInt,
  "parseFloat": getFloat,

  "forward": async (url, method, token=null, data=null) => {
    let request_params = {
      "url": url,
      "method": method
    };
    if (token) {
      request_params.auth = {
        "bearer": token
      };
    }
    if (!isEmpty(data)) {
      request_params = _.merge(request_params, data);
    }

    const forward = request(request_params);
    try{
      return await forward;
    } catch (e) {
      let error;
      if (typeof e.error === 'string') {
        error = JSON.parse(e.error);
      } else {
        error = e.error;
      }
      throw error;
    }
  },

  "uploadByRequest": uploadByRequest,

  "execute": execute,
  "getMediaInfo": getMediaInfo,
  "getVideoDimension": getVideoDimension,
  "getVideoDuration": getVideoDuration,
  "getThumbnail": getThumbnail,

  "isTrue": (value) => {
    const str = ('' + value).toLowerCase();
    return str === 'y' || str === '1' || str === 'true';
  },
  "isNull": (value) => {
    return value === null || value === undefined;
  }
};
