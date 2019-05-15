import mongoose from 'mongoose';
import { autoIncrement } from 'mongoose-plugin-autoinc';

const Schema = mongoose.Schema;


const getFieldInfos = () => {
  return {
    member_seq: { type: Number, index: true, require: false, message: '사용자 아이디가 없습니다.' },
    content_id: { type: String, index: true, require: false, message: '콘텐츠 아이디가 없습니다.' },
    operation_seq_list: { type: [Number], default: [], require: false, message: '사용한 수술 목록이 없습니다.' },
    project_name: { type: String, require: false, message: '프로젝트 제목이 없습니다.' },
    project_path: { type: String, require: false, message: '프로젝트 저장 경로가 없습니다.' },
    video_file_name: { type: String, require: false, message: '비디오 파일 이름이 없습니다.' },
    smil_file_name: { type: String, require: false, message: 'HLS 스트리밍 설정 파일 이름이 없습니다.' },
    total_time: { type: Number, default: 0, require: false, message: '총 재생 시간이 없습니다.' },
    total_size: { type: Number, default: 0, require: false, message: '총 파일 크기가 없습니다.' },
    group_list: { type: [Number], default: [], require: false, message: '그룹 코드 목록이 없습니다.' },
    status: { type: String, default: 'Y', require: false, message: '프로젝트 상태값이 없습니다.' },
    request_status: { type: String, default: 'N', require: false, message: '동영상 제작 요청 상태값이 없습니다.' },
    progress: { type: Number, default: 0, require: false, message: '동영상 제작 진행률이 없습니다.' },
    sequence_list: { type: Array, default: [], require: false, message: '시퀀스 목록이 없습니다.' },
    is_favorite: { type: Boolean, default: false, require: false, message: '즐겨찾기 여부가 없습니다.' },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  };
};

const schema_field_infos = getFieldInfos();
schema_field_infos.member_seq.require = true;
schema_field_infos.content_id.require = true;
schema_field_infos.project_name.require = true;
schema_field_infos.status.require = true;
schema_field_infos.request_status.require = true;

const VideoProjectSchema = new Schema(schema_field_infos);

VideoProjectSchema.plugin( autoIncrement, { model: 'VideoProject', startAt: 1, incrementBy: 1 } );
VideoProjectSchema.indexes();
VideoProjectSchema.index( { member_seq: 1, operation_seq_list: 1 } );
VideoProjectSchema.index( { member_seq: 1, status: 1 } );
VideoProjectSchema.index( { member_seq: 1, group_list: 1 } );


VideoProjectSchema.statics.createVideoProject = function( payload ) {
  const model = new this(payload);
  return model.save();
};

VideoProjectSchema.statics.updateFromEditor = function( id, payload ) {
  return this.updateOne( { _id: id }, payload );
};

VideoProjectSchema.statics.updateRequestStatus = function( id, request_status, progress = 0 ) {
  const update = {
    request_status,
    progress,
    modify_date: Date.now()
  };
  return this.findByIdAndUpdate( id, update );
};

VideoProjectSchema.statics.updateRequestStatusByContentId = function( content_id, request_status, progress = 0, video_file_name = null, smil_file_name = null ) {
  const update = {
    request_status,
    progress,
    modify_date: Date.now()
  };
  if (video_file_name) {
    update.video_file_name = video_file_name;
  }
  if (smil_file_name) {
    update.smil_file_name = smil_file_name;
  }
  return this.updateOne( { content_id: content_id }, update );
};

VideoProjectSchema.statics.updateProgress = function( id, progress ) {
  const update = {
    progress,
    modify_date: Date.now()
  };
  return this.updateOne( { _id: id }, update );
};

VideoProjectSchema.statics.updateStatus = function( id_list, status ) {
  const update = {
    status,
    modify_date: Date.now()
  };
  return this.update( { _id: { $in: id_list } }, update );
};

VideoProjectSchema.statics.updateFavorite = function( id, is_favorite ) {
  const update = {
    is_favorite,
    modify_date: Date.now()
  };
  return this.updateOne( { _id: id }, update );
};

VideoProjectSchema.statics.findOneById = function( id, projection = null ) {
  return this.findById( id, projection );
};

VideoProjectSchema.statics.findOneByContentId = function( content_id, projection = null ) {
  return this.findOne( { content_id: content_id }, projection );
};

VideoProjectSchema.statics.findByMemberSeq = function( member_seq, projection = null ) {
  return this.find( { member_seq: member_seq }, projection );
};

VideoProjectSchema.statics.findByOperationSeq = function( member_seq, operation_seq_list, projection = null ) {
  return this.find( { member_seq: member_seq, operation_seq_list: { "$in": operation_seq_list } }, projection );
};

VideoProjectSchema.statics.deleteById = function( id ) {
  return this.findByIdAndDelete( id );
};

export const VideoProjectModel = mongoose.model( 'VideoProject', VideoProjectSchema );
export const VideoProjectField = getFieldInfos;
