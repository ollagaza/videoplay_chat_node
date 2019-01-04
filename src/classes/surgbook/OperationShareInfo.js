import JsonWrapper from '@/classes/JsonWrapper';

/**
 * @swagger
 * definitions:
 *  OperationShareInfo:
 *    type: "object"
 *    description: ""
 *    properties:
 *      seq:
 *        type: "integer"
 *        description: "수술 공유 고유번호"
 *      share_user_count:
 *        type: "integer"
 *        description: "공유 유저 수"
 *      view_count:
 *        type: "integer"
 *        description: "시청 횟수"
 *      comment_count:
 *        type: "integer"
 *        description: "댓글 개수"
 *      like_count:
 *        type: "integer"
 *        description: "좋아요 개수"
 *      dislike_count:
 *        type: "integer"
 *        description: "싫어요 개수"
 *      reg_date:
 *        type: "string"
 *        description: "생성 일자"
 *      modify_date:
 *        type: "string"
 *        description: "마지막 갱신 일자"
 *      share_key:
 *        type: "string"
 *        description: "공유 링크 키"
 *      auth_type:
 *        type: "integer"
 *        description: "권한 정보"
 *      stream_url:
 *        type: "string"
 *        description: "동영상 시청 url"
 *      download_url:
 *        type: "string"
 *        description: "동영상 다운로드 url"
 *
 */

export default class OperationShareInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);
    this.setKeys(['seq', 'share_user_count', 'view_count', 'comment_count', 'like_count', 'dislike_count', 'reg_date', 'modify_date', 'share_key', 'stream_url', 'download_url']);
  }
}
