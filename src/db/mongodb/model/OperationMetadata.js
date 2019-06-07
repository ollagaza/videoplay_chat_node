import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const getFieldInfos = () => {
  return {
    _id: { type: Number, index: true, require: false, message: '수술 아이디가 없습니다.' },
    member_seq: { type: Number, index: true, require: false, message: '사용자 아이디가 없습니다.' },
    content_id: { type: String, index: true, require: false, message: '콘텐츠 아이디가 없습니다.' },
    group_list: { type: [Number], default: [], require: false, message: '그룹 코드 목록이 없습니다.' },
    tag_list: { type: [String], default: [], require: false, message: '태그 목록이 없습니다.' },
    created_date: { type: Date, default: Date.now, require: false, message: '생성 일자가 없습니다.' },
    modify_date: { type: Date, default: Date.now, require: false, message: '수정 일자가 없습니다.' }
  };
};

const schema_field_infos = getFieldInfos();
schema_field_infos._id.require = true;
schema_field_infos.member_seq.require = true;
schema_field_infos.content_id.require = true;

const OperationMetadataSchema = new Schema(schema_field_infos);

OperationMetadataSchema.indexes();
OperationMetadataSchema.index( { member_seq: 1, group_list: 1 } );
OperationMetadataSchema.index( { member_seq: 1, tag_list: 1 } );

OperationMetadataSchema.statics.createVideoProject = function( payload ) {
  const model = new this(payload);
  return model.save();
};

OperationMetadataSchema.statics.updateFromEditor = function( id, payload ) {
  return this.updateOne( { _id: id }, payload );
};

OperationMetadataSchema.statics.updateStatus = function( id, status ) {
  const update = {
    status,
    modify_date: Date.now()
  };
  return this.updateOne( { _id: id }, update );
};

OperationMetadataSchema.statics.updateRequestStatus = function( id, request_status, progress = 0 ) {
  const update = {
    request_status,
    progress,
    modify_date: Date.now()
  };
  return this.findByIdAndUpdate( id, update );
};

OperationMetadataSchema.statics.updateRequestStatusByContentId = function( content_id, request_status, progress = 0, video_file_name = null, smil_file_name = null ) {
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

OperationMetadataSchema.statics.updateProgress = function( id, progress ) {
  const update = {
    progress,
    modify_date: Date.now()
  };
  return this.updateOne( { _id: id }, update );
};

OperationMetadataSchema.statics.findOneById = function( id, projection = null ) {
  return this.findById( id, projection );
};

OperationMetadataSchema.statics.findOneByContentId = function( content_id, projection = null ) {
  return this.findOne( { content_id: content_id }, projection );
};

OperationMetadataSchema.statics.findByMemberSeq = function( member_seq, projection = null ) {
  return this.find( { member_seq: member_seq }, projection );
};

OperationMetadataSchema.statics.findByOperationSeq = function( member_seq, operation_seq_list, projection = null ) {
  return this.find( { member_seq: member_seq, operation_seq_list: { "$in": operation_seq_list } }, projection );
};

OperationMetadataSchema.statics.deleteById = function( id ) {
  return this.findByIdAndDelete( id );
};

export const OperationMetadataModel = mongoose.model( 'OperationMetadata', OperationMetadataSchema );
export const OperationMetadataField = getFieldInfos;
