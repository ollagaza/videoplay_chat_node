import NodeFetch from 'node-fetch'
import IsUrl from 'is-url'
import Canvas from 'canvas'
import { strict as Assert } from 'assert'
import fs from 'fs'
import util from 'util'
import * as PDFjs from 'pdfjs-dist/legacy/build/pdf'
import logger from './logger'
import StdObject from '../wrapper/std-object'

const readFile = util.promisify(fs.readFile);

const log_prefix = '[PDFtoImage]'

const MAX_WIDTH = 1920
const MAX_HEIGHT = 1080
const MAX_DIMENSION = MAX_WIDTH * MAX_HEIGHT
const MAX_SCALE = 2

const NodeCanvasFactory = class {
  create = (width, height) => {
    Assert(width > 0 && height > 0, "Invalid canvas size");
    const canvas = Canvas.createCanvas(width, height);
    const context = canvas.getContext("2d");
    return {
      canvas: canvas,
      context: context,
    }
  }

  reset = (canvas_and_context, width, height) => {
    Assert(canvas_and_context.canvas, "Canvas is not specified")
    Assert(width > 0 && height > 0, "Invalid canvas size")
    canvas_and_context.canvas.width = width
    canvas_and_context.canvas.height = height
  }

  destroy = (canvas_and_context) => {
    Assert(canvas_and_context.canvas, "Canvas is not specified")

    // Zeroing the width and height cause Firefox to release graphics
    // resources immediately, which can greatly reduce memory consumption.
    canvas_and_context.canvas.width = 0
    canvas_and_context.canvas.height = 0
    canvas_and_context.canvas = null
    canvas_and_context.context = null
  }
}

module.exports.convert = async function (pdf, conversion_config = {}) {
  if (!conversion_config) conversion_config = {}
  // Get the PDF in Uint8Array form
  let pdf_data = pdf;

  if (typeof pdf === 'string') {
    pdf_data = new Uint8Array(await readFile(pdf));
  }
  else if (Buffer.isBuffer(pdf)) {
    pdf_data = new Uint8Array(pdf);
  }
  else if (!(pdf instanceof Uint8Array)) {
    throw new StdObject(3050, 'pdf 정보가 올바르지 않습니다.', 400, { pdf })
  }

  // At this point, we want to convert the pdf data into a 2D array representing
  // the images (indexed like array[page][pixel])

  const page_data_list = [];
  const loading_task = PDFjs.getDocument({ data: pdf_data, disableFontFace: true });
  const pdf_document = await loading_task.promise
  const canvasFactory = new NodeCanvasFactory();

  if (conversion_config.height <= 0 || conversion_config.width <= 0) {
    delete conversion_config.height
    delete conversion_config.width
    logger.error(log_prefix, "Negative viewport dimension given. Defaulting to 100% scale.");
  }

  // If there are page numbers supplied in the conversion config

  if (conversion_config.page_numbers) {
    for (let i = 0; i < conversion_config.page_numbers.length; i++) {
      // This just pushes a render of the page to the array
      const page_data = await docRender(pdf_document, conversion_config.page_numbers[i], canvasFactory, conversion_config);
      if (page_data && page_data.data) {
        page_data_list.push(page_data)
      }
    }
  }
  else {
    for (let i = 1; i <= pdf_document.numPages; i++) {
      const page_data = await docRender(pdf_document, i, canvasFactory, conversion_config)
      if (page_data && page_data.data) {
        page_data_list.push(page_data)
      }
    }
  }
  return page_data_list;

} // convert method

const docRender = async (pdfDocument, pageNo, canvasFactory) => {

  // Page number sanity check
  if (pageNo < 1 || pageNo > pdfDocument.numPages) {
    logger.error(log_prefix, "Invalid page number " + pageNo);
    return null
  }

  try {
    const page = await pdfDocument.getPage(pageNo);

    // Create a viewport at 100% scale
    let viewport = page.getViewport({ scale: 1 });
    let width = viewport.width
    let height = viewport.height

    let scale = 1.0
    let w_scale
    let h_scale
    if (width >= height) {
      w_scale = MAX_WIDTH / width
      h_scale = MAX_HEIGHT / height
    } else {
      w_scale = MAX_HEIGHT / width
      h_scale = MAX_WIDTH / height
    }
    scale = Math.min(w_scale, h_scale)

    if (scale > MAX_SCALE) scale = MAX_SCALE
    viewport = page.getViewport({ scale });
    width = viewport.width
    height = viewport.height

    const canvas_and_context = canvasFactory.create(
      width,
      height
    )
    const renderContext = {
      canvasContext: canvas_and_context.context,
      viewport: viewport,
      canvasFactory: canvasFactory
    }
    await page.render(renderContext).promise;
    return {
      width: width,
      height: height,
      data: new Uint8Array(canvas_and_context.canvas.toBuffer())
    };
  } catch (error) {
    return null
  }
}
