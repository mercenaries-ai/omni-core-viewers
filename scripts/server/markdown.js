/**
 * Copyright (c) 2023 MERCENARIES.AI PTE. LTD.
 * All rights reserved.
 */

const script = {
  name: 'markdown',

  formatHTML: async(ctx, markdown, text) => {
    let html = `<pre>Invalid input, code: 818</pre>`
    if (markdown) {
      const engine = new ctx.app.sdkHost.MarkdownEngine();
      html = await engine.render(markdown)
    } else if (text) {
      html = `<pre>${text}</pre>`
    }
    return { html, markdown }
  },

  exec: async function (ctx, payload) {

    console.log("+TTYU", payload)
    let text = payload.text ?? payload.data?.toString()
    let markdown = payload.markdown
    let fid = payload?.file?.fid || payload.fid
    let mimeType = payload.mimeType || payload?.file?.mimeType

    if (fid) {
      const file = await ctx.app.cdn.getByFid(fid)
      text = file.data.toString()
      mimeType = file.mimeType
    }

    if (text && mimeType?.startsWith("text/markdown")) {
      markdown = text
    }


    return await this.formatHTML(ctx, markdown, text)
  },
};

export default script;
