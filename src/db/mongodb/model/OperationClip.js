import mongoose from 'mongoose';
import Util from '@/utils/baseutil';

const Schema = mongoose.Schema;

const getFieldInfos = () => {
  return {
    operation_seq: { type: Number, index: true, require: true, message: '수술 아이디가 없습니다.' },
    member_seq: { type: Number, index: true, require: false, message: '사용자 아이디가 없습니다.' },
    content_id: { type: String, index: true, require: false, message: '콘텐츠 아이디가 없습니다.' },
    start_time: { type: Number, default: 0, index: false, require: false, message: '시작 시간이 없습니다.' },
    end_time: { type: Number, default: 0, index: false, require: false, message: '종료 시간이 없습니다.' },
    desc: { type: String, default: '', index: false, require: false, message: '설명 문구가 없습니다.' },
    thumbnail_url: { type: String, default: '', index: false, require: false, message: '썸네일 정보가 없습니다.' },
    tag_list: { type: [String], default: [], require: false, message: '태그 목록이 없습니다.' },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  };
};

const schema_field_infos = getFieldInfos();
schema_field_infos.operation_seq.require = true;
schema_field_infos.member_seq.require = true;
schema_field_infos.content_id.require = true;
schema_field_infos.start_time.require = true;
schema_field_infos.end_time.require = true;
schema_field_infos.desc.require = true;

const operation_clip_schema = new Schema(schema_field_infos, { strict: false });

operation_clip_schema.indexes();
operation_clip_schema.index( { member_seq: 1, tag_list: 1 } );

operation_clip_schema.statics.createOperationClip = function( operation_info, clip_info ) {
  clip_info.operation_seq = operation_info.seq;
  clip_info.member_seq = operation_info.member_seq;
  clip_info.content_id = operation_info.content_id;
  const payload = Util.getPayload(clip_info, getFieldInfos());
  const model = new this(payload);
  return model.save();
};

operation_clip_schema.statics.createOperationClipByList = function( operation_info, clip_info_list ) {
  const data_list = [];
  for( let i = 0; i < clip_info_list.length; i++) {
    const clip_info = clip_info_list[i];
    clip_info.operation_seq = operation_info.seq;
    clip_info.member_seq = operation_info.member_seq;
    clip_info.content_id = operation_info.content_id;
    const payload = Util.getPayload(clip_info, getFieldInfos());
    data_list.push(payload);
  }
  return this.insertMany(data_list);
};

operation_clip_schema.statics.updateOperationClip = function( clip_id, clip_info, tag_list = null ) {
  const update = {
    start_time: clip_info.start_time,
    end_time: clip_info.end_time,
    desc: clip_info.desc,
    thumbnail_url: clip_info.thumbnail_url,
    modify_date: Date.now()
  };
  if (tag_list) {
    update.tag_list = tag_list;
  }
  return this.findByIdAndUpdate( clip_id, update, {"new": true} );
};

operation_clip_schema.statics.findOneById = function( id, projection = null ) {
  return this.findById( id, projection );
};

operation_clip_schema.statics.findByOperationSeq = function( operation_seq, projection = null ) {
  return this.find( { operation_seq: operation_seq }, projection );
};

operation_clip_schema.statics.findOneByContentId = function( content_id, projection = null ) {
  return this.find( { content_id: content_id }, projection );
};

operation_clip_schema.statics.findByMemberSeq = function( member_seq, projection = null ) {
  return this.find( { member_seq: member_seq }, projection );
};

operation_clip_schema.statics.deleteById = function( id ) {
  return this.findByIdAndDelete( id );
};

operation_clip_schema.statics.deleteByOperationSeq = function( operation_seq ) {
  return this.findOneAndDelete( { operation_seq: operation_seq } );
};

const operation_clip_model = mongoose.model( 'OperationClip', operation_clip_schema );

export const OperationClipModel = operation_clip_model;
export const OperationClipField = getFieldInfos;
