export default class PageHandler {
  constructor (total_count, total_page, cur_page, page_count = 10, list_count) {

    this.total_count = total_count
    this.total_page = total_page
    this.cur_page = cur_page
    this.list_count = list_count
    this.page_count = page_count
    this.point = 0

    let first_page = cur_page - Math.floor(page_count / 2)
    if (first_page < 1) {
      first_page = 1
    }

    if (total_page > page_count && first_page + page_count - 1 > total_page) {
      first_page -= first_page + page_count - 1 - total_page
    }

    let last_page = total_page
    if (last_page > total_page) {
      last_page = total_page
    }

    this.first_page = first_page
    this.last_page = last_page

    if (total_page < this.page_count) {
      this.page_count = total_page
    }
  }

  getNextPage () {
    var page = this.first_page + this.point++
    if (this.point > this.page_count || page > this.last_page) {
      page = 0
    }

    return page
  }

  getPage (offset) {
    return Math.max(Math.min(this.cur_page + offset, this.total_page), '')
  }
}
