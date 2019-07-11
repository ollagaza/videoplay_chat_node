import mongoose from 'mongoose';
import _ from "lodash";
import Util from '@/utils/baseutil';
import StdObject from "@/classes/StdObject";
import log from "@/classes/Logger";
import service_config from '@/config/service.config';
import Constants from '@/config/constants';

const Schema = mongoose.Schema;

const getIndexFieldInfos = () => {
  return {
    unique_id: { type: String, require: true },
    creator: { type: String, require: true },
    thumbnail_url: { type: String, require: true, default: null },
    start_time: { type: Number, require: true, default: 0 },
    end_time: { type: Number, require: true, default: 0 },
    start_frame: { type: Number, require: true, default: 0 },
    end_frame: { type: Number, require: true, default: 0 },
    tags: { type: [String], require: false, default: [] },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  };
};
const index_schema_field_infos = getIndexFieldInfos();
const index_info_schema = new Schema(index_schema_field_infos, { _id : false });
const index_info_model = mongoose.model( 'IndexInfo', index_info_schema );

const getFieldInfos = () => {
  return {
    member_seq: { type: Number, index: true, require: false, message: '사용자 아이디가 없습니다.' },
    operation_seq: { type: Number, index: true, require: false, message: '수술번호가 없습니다.' },
    index_list: { type: [index_info_schema], require: false, default: [], message: '인덱스 목록이 없습니다.' },
    index_count: { type: Number, require: false, default: 0, message: '인덱스 개수가 없습니다.' },
    tags: { type: [String], require: false, default: [], message: '태그 목록이 없습니다.' },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  };
};

const schema_field_infos = getFieldInfos();
schema_field_infos.member_seq.require = true;
schema_field_infos.operation_seq.require = true;

const video_index_info_schema = new Schema(schema_field_infos);

video_index_info_schema.indexes();
video_index_info_schema.index( { operation_seq: 1, member_seq: 1 } );
video_index_info_schema.index( { member_seq: 1, tags: 1 } );

const getIndexModelList = (index_list) => {
  const index_model_list = [];
  if (!index_list) {
    return index_model_list;
  }
  const index_info_fields = getIndexFieldInfos();
  for (let i = 0; i < index_list.length; i++) {
    const index_info_payload = Util.getPayload(index_list[i].toJSON(), index_info_fields);
    index_model_list.push(new index_info_model(index_info_payload));
  }
  return index_model_list;
};

video_index_info_schema.statics.createVideoIndexInfo = function( payload, index_list = null ) {
  const index_model_list = getIndexModelList(index_list);
  payload.index_list = index_model_list;
  payload.index_count = index_model_list.length;
  const model = new this(payload);
  return model.save();
};

video_index_info_schema.statics.createVideoIndexInfoByOperation = function( operation_info, index_list = null ) {
  const fields = VideoIndexInfoField();
  fields.member_seq.require = true;
  fields.operation_seq.require = true;

  const data = {
    operation_seq: operation_info.seq,
    member_seq: operation_info.member_seq
  };

  const payload = Util.getPayload(data, fields);
  return video_index_info_model.createVideoIndexInfo(payload, index_list);
};

video_index_info_schema.statics.updateIndexListByOperation = function( operation_seq, index_list, member_seq = null ) {
  const index_model_list = getIndexModelList(index_list);
  const update = {
    index_list: index_model_list,
    index_count: index_model_list.length,
    modify_date: Date.now()
  };
  const filter = { operation_seq: operation_seq };
  if (member_seq !== null) {
    filter.member_seq = member_seq;
  }
  return this.updateOne( filter, update );
};

video_index_info_schema.statics.findOneByOperation = function( operation_seq, member_seq = null, projection = null ) {
  const filter = { operation_seq: operation_seq };
  if (member_seq !== null) {
    filter.member_seq = member_seq;
  }
  return this.findOne( filter, projection );
};

video_index_info_schema.statics.deleteByOperation = function( operation_seq, member_seq = null ) {
  const filter = { operation_seq: operation_seq };
  if (member_seq !== null) {
    filter.member_seq = member_seq;
  }
  return this.findOneAndDelete( filter );
};

const addVideoIndex = async (operation_info, second) => {
  const operation_seq = operation_info.seq;
  const media_info = operation_info.media_info;
  const fps = media_info.fps;
  const target_frame = Math.round(second * fps);

  const video_index_info = await video_index_info_model.findOneByOperation(operation_seq);
  let index_info_list = video_index_info.index_list;
  const total_count = index_info_list.length;
  let copy_index_info = null;

  for (let i = 0; i < total_count; i++) {
    const index_info = index_info_list[i];
    const start_frame = index_info.start_frame;
    const end_frame = index_info.end_frame;

    log.d(null, start_frame, end_frame, target_frame);

    if (start_frame === target_frame) {
      throw new StdObject(-1, '동일한 인덱스 존재합니다.', 400);
    } else if(i === 0 && target_frame < start_frame){
      copy_index_info = index_info;
      break;
    } else if (target_frame > start_frame && target_frame <= end_frame) {
      copy_index_info = index_info;
      break;
    }
  }

  let end_time = 0;
  let end_frame = 0;
  if (null === copy_index_info) {
    end_frame = media_info.total_frame;
    end_time = media_info.total_time;
    if (total_count > 0) {
      copy_index_info = index_info_list[total_count - 1];
    }
  }
  else {
    end_frame = copy_index_info.end_frame;
    end_time = copy_index_info.end_time;
  }
  if (copy_index_info) {
    copy_index_info.end_frame = target_frame - 1;
    copy_index_info.end_time = second;
  }

  const index_file_name = `index_original_${target_frame}_${Date.now()}.jpg`;
  const thumbnail_file_name = `index_thumbnail_${target_frame}_${Date.now()}.jpg`;

  const original_url = operation_info.url_prefix + 'Thumb/' + index_file_name;
  const add_index = {};
  add_index.thumbnail_url = operation_info.url_prefix + 'Thumb/' + thumbnail_file_name;
  add_index.original_url = original_url;
  add_index.creator = 'user';
  add_index.unique_id = "user/" + index_file_name;
  add_index.start_time = second;
  add_index.start_frame = target_frame;
  add_index.end_time = end_time;
  add_index.end_frame = end_frame;

  index_info_list.push(add_index);
  index_info_list = _.sortBy(index_info_list, index_info => index_info.start_frame);

  const media_directory = operation_info.media_directory;
  const origin_video_path = operation_info.media_info.origin_video_path;
  const save_directory = media_directory + 'Thumb';
  if ( !( await Util.fileExists(save_directory) ) ) {
    await Util.createDirectory(save_directory);
  }

  const original_index_image_path = save_directory + Constants.SEP + index_file_name;
  let execute_result = await Util.getThumbnail(origin_video_path, original_index_image_path, second);
  if (!execute_result.success) {
    log.e(null, `IndexModel.addIndex execute error [${execute_result.command}]`, execute_result);
    throw new StdObject(-1, '인덱스 추출 실패', 400);
  }
  if ( !( await Util.fileExists(original_index_image_path) ) ) {
    log.e(null, `IndexModel.addIndex file not exists [${execute_result.command}]`, execute_result);
    throw new StdObject(-1, '인덱스 파일 저장 실패', 400);
  }

  try {
    const thumb_width = Util.parseInt(service_config.get('thumb_width'), 212);
    const thumb_height = Util.parseInt(service_config.get('thumb_height'), 160);
    const thumb_index_image_path = save_directory + Constants.SEP + thumbnail_file_name;
    execute_result = await Util.getThumbnail(origin_video_path, thumb_index_image_path, second, thumb_width, thumb_height);

    if (!execute_result.success) {
      log.e(null, `IndexModel.addIndex thumb execute error [${execute_result.command}]`, execute_result);
    } else if ( !( await Util.fileExists(original_index_image_path) ) ) {
      log.e(null, `IndexModel.addIndex thumb file not exists [${execute_result.command}]`, execute_result);
    }
  } catch (error) {
    add_index.thumbnail_url = add_index.original_url;
  }

  await video_index_info_model.updateIndexListByOperation(operation_seq, index_info_list);

  return {add_index_info: add_index, total_index_count: index_info_list.length};
};

const video_index_info_model = mongoose.model( 'VideoIndexInfo', video_index_info_schema );

export const VideoIndexInfoModel = video_index_info_model;
export const VideoIndexInfoField = getFieldInfos;
export const AddVideoIndex = addVideoIndex;
