




const prepEngineBlock = async (ctx, block, engine, inputs) => {
  engine.registerToken('RUN_BUTTON', function(title) {
    return new engine.SafeString(`<button class='mt-2' @click='runBlock($el)' data-action='run' data-block='${block.name}'>${title}</button>`);
  });
}


const prepEngineRecipe = async (ctx, recipe, engine, inputs) => {

  engine.registerToken('RUN_BUTTON', function(title) {
    return new engine.SafeString(`<button class='mt-2' @click='runAction($el)' data-action='run' data-args='${encodeURIComponent(JSON.stringify({id: recipe.id, version: recipe.version }))}'>${title}</button>`);
  });

  engine.registerToken('INPUT', function(input) {
    if (input)
    {
      return new engine.SafeString(`
      <div class="field-row-stacked" style="min-width: 200px">
        <label x-text='inputs.${input.name}.title' class='mt-2 mb-0 pb-0 font-semibold'> </label>
        <input type='text' x-model='inputs.${input.name}.value' />
        </div>
      `);
    }
    else
    {
      return new engine.SafeString(`ERROR` + input);
    }
  });


  engine.registerToken('RECIPE', function(field) {
    if (field)
    {
      return new engine.SafeString(`
      ${field}`)
    }
    else
    {
      return new engine.SafeString(`ERROR` + field);
    }
  });

}


const script = {
  name: 'markdown',

  exec: async function (ctx, payload) {
    console.log("RUNSCRIPT UI", payload)

    if (payload.action === 'run')
    {
      let result = {}
      if (payload.recipe)
      {
        const integration = ctx.app.integrations.get('workflow')
        const recipe = await integration.getWorkflow(payload.recipe.id, payload.recipe.version, ctx.userId, true)
        const jobService = ctx.app.services.get('jobs')
        const job = await jobService.startRecipe(recipe, ctx.sessionId, ctx.userId, payload.args, 0, 'system')

        result = await new Promise( (resolve, reject) => {
          console.log('waiting for job', job.jobId)
          ctx.app.events.once('jobs.job_finished_' + job.jobId).then( (job) => {
            resolve(job)
          })
        })
      }
      return {ok: true, result}
    }
    else if (payload.block)
    {
      const blockManager = ctx.app.blocks
      const block = await blockManager.getInstance(block.name)
      const engine = new ctx.app.sdkHost.MarkdownEngine();
      await prepEngineBlock(ctx, block, engine, inputs)


    }
    else if (payload.recipe)
    {

      const integration = ctx.app.integrations.get('workflow')
      const recipe = await integration.getWorkflow(payload.recipe.id, payload.recipe.version, ctx.userId, true)

      const ui = Object.values(recipe.rete.nodes).find(n => n.name === 'omnitool.custom_ui_1')
      let html = 'No UI Found'
      let inputs = null
      if (ui)
      {
        inputs = JSON.parse(JSON.stringify(ui.data["x-omni-dynamicInputs"]))

        Object.keys(inputs).forEach( (key) => {
          inputs[key].value = ui.data[key] || ''
        })


        const engine = new ctx.app.sdkHost.MarkdownEngine();
        await prepEngineRecipe(ctx, recipe, engine, inputs)
        html = `<div class='omnitool-ui' x-data='uiData'>`
        html += await engine.render(ui.data.source, {          inputs: inputs,          recipe: recipe         } )
        html += `</div>`

      }
      return {html, inputs, meta: recipe.meta}
    }
  },
};

export default script;
