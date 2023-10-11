/**
 * Copyright (c) 2023 MERCENARIES.AI PTE. LTD.
 * All rights reserved.
 */






const prepEngineBlock = async (ctx, block, engine, inputs) => {
  engine.registerToken('RUN_BUTTON', function(title) {
    return new engine.SafeString(`<button class='mt-2' @click='runBlock($el)' data-action='run' data-block='${block.name}'>${title}</button>`);
  });
}


const prepEngineRecipe = async (ctx, recipe, engine, inputs) => {

  engine.registerToken('RUN_BUTTON', function(title) {
    return new engine.SafeString(`<button class='mt-2 block' @click='runAction($el)' data-action='run' data-args='${encodeURIComponent(JSON.stringify({id: recipe.id, version: recipe.version }))}'>${title}</button>`);
  });

  engine.registerToken('INPUT', function(input, nop) {
    if (input)
    {

      const title = nop || input.title || input.name

      if (input.type === 'boolean')
      {
        return new engine.SafeString(`

        <div  class="field-row-stacked  flex items-left justify-left space-x-2">

        <label @click="$refs.switchButton_${input.name}.click(); $refs.switchButton_${input.name}.focus()" :id="$id('switch')"
            :class="{ 'text-blue-600': inputs.${input.name}.value, 'text-gray-400': ! inputs.${input.name}.value }"
            class="text-sm select-none font-semibold cursor-pointer"
            x-cloak>
            ${title}
        </label>
        <input id="switch_${input.name}" type="checkbox" name="switch" class='hidden' :checked="inputs.${input.name}.value">
        <button
            x-ref="switchButton_${input.name}"
            type="button"
            @click="inputs.${input.name}.value = ! inputs.${input.name}.value"

            :class="inputs.${input.name}.value ? 'bg-blue-600' : 'bg-neutral-200'"
            class="relative inline-flex h-6 py-0.5 ml-4 focus:outline-none rounded-full w-10"
            x-cloak>
            <span :class="inputs.${input.name}.value ? 'translate-x-[18px]' : 'translate-x-0.5'" class="w-5 h-5 duration-200 ease-in-out bg-white rounded-full "></span>
        </button>

    </div>



      `);

      }

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
      if (ui && ui.data["x-omni-dynamicInputs"])
      {
        inputs = JSON.parse(JSON.stringify(ui.data["x-omni-dynamicInputs"]))
        console.log(inputs, ui.data)
        Object.keys(inputs).forEach( (key) => {
          inputs[key].value = ui.data[key]
          if (inputs[key].value == null)
          {
            inputs[key].value = inputs[key].default ?? (inputs[key].type === 'boolean') ? false : ''
          }
          console.log(key, inputs[key].value)
          inputs[key].defaultValue = inputs[key].default
        })


        /*const engine = new ctx.app.sdkHost.MarkdownEngine();
        await prepEngineRecipe(ctx, recipe, engine, inputs)
        html = `<div class='omnitool-ui' x-data='uiData'>`
        html += await engine.render(ui.data.source, {          inputs: inputs,          recipe: recipe         } )
        html += `</div>`*/

      }
      return {inputs, meta: recipe.meta, recipe}
    }
  },
};

export default script;
