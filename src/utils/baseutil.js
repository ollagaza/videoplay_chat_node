import xmlParser from "fast-xml-parser";
import Iconv from "iconv";

const DIRECTORY_SEPARATOR = "\\";
const regex = /\\/g;

const convert = function(from_charset, to_charset, str) {
  const iconv = new Iconv.Iconv(from_charset, to_charset);
  return iconv.convert(str);
};

const removePathSEQ = function(media_path) {
  return media_path.replace(/SEQ.*$/i, '');
}

export default {
  "iconv": convert,
  "getMediaDirectory": function(media_root, media_path) {
    const path = removePathSEQ(media_path);

    return convert('utf-8', 'euckr', media_path + path);
  },
  "getWebPath": function(media_root, media_path) {
    let path = media_root + removePathSEQ(media_path);
    path = path.replace(/\\/g, '/');
    path = path.replace(/^\/+/g, '/');

    return path;
  }
};
