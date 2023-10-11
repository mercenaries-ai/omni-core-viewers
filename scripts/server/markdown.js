/**
 * Copyright (c) 2023 MERCENARIES.AI PTE. LTD.
 * All rights reserved.
 */

const script = {
  name: 'markdown',

  exec: async function (ctx, payload) {
    console.log(payload)
    if (payload.markdown)
    {
      const engine = new ctx.app.sdkHost.MarkdownEngine();
      let html = await engine.render(payload.markdown)
      return {html}
    }
    else if (payload.fid)
    {

      let file = await ctx.app.cdn.getByFid(payload.fid)
      const engine = new ctx.app.sdkHost.MarkdownEngine();
      if (file.mimeType === "text/markdown")
      {
        let text = file.data.toString()
        let html = await engine.render(text)

        return {html}
      }
      else if (file.mimeType === "text/plain")
      {
        let text = file.data.toString()
        return {html:`<pre>${text}</pre>`, text}
      }
    }
  },
};

export default script;
