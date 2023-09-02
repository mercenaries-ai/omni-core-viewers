const script = {
  name: 'markdown',

  exec: async function (ctx, payload) {
    console.log(payload)
    if (payload.fid)
    {
      debugger;
      let file = await ctx.app.cdn.getByFid(payload.fid)
      const engine = new ctx.app.sdkHost.MarkdownEngine();
      if (file.mimeType === "text/markdown")
      {
        let text = file.data.toString()
        let html = await engine.render(text)
        console.log(text)
        console.log(html)
        return {html}
      }
    }
  },
};

export default script;
