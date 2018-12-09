import fs from 'fs';
import xmlParser from 'fast-xml-parser';
import Iconv from 'iconv';
import xmlOptions from '@/config/xml.options';
import IndexFileInfo from '@/classes/surgbook/IndexFileInfo';
import dateFormat from 'dateformat';

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
  console.log(time_list);
  const list_length = time_list.length;

  for(let i = list_length-1; i >= 0; i--){
    sec += parseInt(time_list[i], 10) * multi;
    console.log(time_list[i] + " / " + sec);
    multi *= 60;
  }

  return sec;
};

const secondToTimeStr = (second, format='HH:MM:ss') => {
  return dateFormat(second*1000 + timezone_offset, format);
};

export default {
  "iconv": convert,

  "getMediaDirectory": getMediaDirectory,

  "getUrlPrefix": getUrlPrefix,

  "saveToFile": saveToFile,

  "timeStrToSecond": timeStrToSecond,

  "secondToTimeStr": secondToTimeStr,

  "loadXmlFile": (directory, xml_file_name) => {
    const xml_file_path = directory + xml_file_name + '.xml';

    let context = null;
    try {
      context = fs.readFileSync(xml_file_path);
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
  }
};
