import Handlebars, { HelperDelegate } from 'handlebars';
import Alpine from 'alpinejs';
import {OmniSDKClient} from 'omni-sdk';
import {MarkdownEngine} from 'omni-sdk';

const sdk = new OmniSDKClient("omni-core-viewers").init();

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}


const prepEngineRecipe = async ( recipe, engine, inputs) => {

  engine.registerToken('RUN_BUTTON', function(title) {
    return new engine.SafeString(`<button class='mt-2' @click='runAction($el)' data-action='run' data-args='${encodeURIComponent(JSON.stringify({id: recipe.id, version: recipe.version }))}'>${title}</button>`);
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
            class="mt-2 mb-0 pb-0 font-semibold select-none cursor-pointer"
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
            <span :class="inputs.${input.name}.value ? 'translate-x-[18px]' : 'translate-x-0.5'" class="w-5 h-5 duration-200 ease-in-out bg-white rounded-full shadow-md"
            ></span>
        </button>

    </div>



      `);

      }


      return new engine.SafeString(`
      <div class="field-row-stacked" style="min-width: 200px">
        <label x-text='inputs.${input.name}.title' class='mt-2 mb-0 pb-0 font-semibold'> </label>
        <input type='text' x-model='inputs.${input.name}.value' />
        <label x-show="inputs.${input.name}.description" x-text='inputs.${input.name}.description' class='mt-2 mb-0 pb-0 font-semibold w-full text-right'> </label>
        </div>
      `);
    }
    else
    {
      return new engine.SafeString(`ERROR` + input);
    }
  });


  engine.registerToken('RECIPE', function(field, class_name) {
    if (field)
    {
      return new engine.SafeString(`<div class='${class_name}'>${field}</div>`);
    }
    else
    {
      return new engine.SafeString(`ERROR` + field);
    }
  });

}



// -------------------- Viewer Mode: If q.focusedItem is set, we hide the gallery and show the item full screen -----------------------
const opts = sdk.options
const showToolbar = !opts.hideToolbar;
const args = sdk.args






let data = Alpine.reactive({
  file: null,
  text: null,
  markdown: null,

})

const uiData = Alpine.reactive({
  inputs: null

})

const  parseContent = async ()=>
{
  const params = sdk.args
  if (params)
  {
    let rawText = ''
    if (params.file && params.file.fid)
    {

      data.file = params.file

      /*let x = await fetch('/fid/'+params.file.fid)
      rawText = await x.text()*/
      let result = await sdk.runExtensionScript('markdown', {fid: params.file.fid})
      rawText = result.html

    }
    else if (params.url)
    {
        let x = await fetch(params.url)
        rawText = await x.text()
    }
    else if (params.data)
    {
        rawText = params.data
    }
    else if (params.markdown)
    {
      let result = await sdk.runExtensionScript('markdown', {markdown: params.markdown})
      rawText = data.markdown =   result.html
    }
    else if (params.text)
    {
        rawText = params.text
        let result = await sdk.runExtensionScript('markdown', {text: params.text})
        rawText = data.text =   result.text
    }
    else if (params.recipe)
    {
        const result = await sdk.runExtensionScript('ui', {recipe: params.recipe})
        const engine = new MarkdownEngine();
        await prepEngineRecipe( result.recipe, engine, result.inputs)
        const ui:any = Object.values(result.recipe.rete.nodes).find((n:any) => n.name === 'omnitool.custom_ui_1')
        let html
        html = `<div class='omnitool-ui flex flex-col' x-data='uiData'>`
        html += await engine.render(ui.data.source, {          inputs: result.inputs,          recipe: result.recipe         } )
        html +='<div class="flex-grow"></div>'
        html += `</div>`

        rawText = html
        uiData.inputs = result.inputs

    }
    else if (params.block)
    {
        const result = await sdk.runExtensionScript('ui', {block: params.block})
        rawText = result.html
        uiData.inputs = result.inputs
        console.log(Alpine.raw(uiData))
    }

    return  rawText
  }

  return ''
}

const sendToChat = async (img) => {
  if (!img) return;


  if (Array.isArray(img)) {

    let obj = {}

    img.forEach(o => {

      let type
      if (sdk.Resource.isAudio(o))
      {
        type='audio'
      }
      else if (sdk.Resource.isImage(o))
      {
        type = 'images'
      }
      else if (sdk.Resource.isDocument(o))
      {
        type = 'documents'
      }
        obj[type] ??=[]
        obj[type].push(o)
    })


    //@ts-expect-error
    window.parent.client.sendSystemMessage(``, 'text/markdown', {
      ...obj, commands: [
        { 'id': 'run', title: '🞂 Run', args: [null, img] }]
    }, ['no-picture'])

  }
  else {

  let type

  if (sdk.Resource.isAudio(img))
  {
    type = 'audio'
  }
  else if (sdk.Resource.isImage(img))
  {
    type = 'images'
  }
  else if (sdk.Resource.isDocument(img))
  {
    type = 'documents'

  }
    let obj = {}
    obj[type] =  [{ ...img }]

    sdk.sendChatMessage(``, 'text/markdown', {
      ...obj, commands: [
        { 'id': 'run', title: '🞂 Run', args: [null, { ...img }] }]
    }, ['no-picture'])
  }
}




const blocks = {}
/*
const markdownEngine = new MarkdownEngine()



const blocks = {}

markdownEngine.registerToken('BLOCK', function(token, options) {


  const block = this[token];

  const html = []


  if (block && Object.keys(block))
  {
    blocks[token] = block
  html.push(`<div> `)
  html.push(`<div class='p-2 font-semibold text-lg'>${block.title||block.displayOperationId}</div>`)
  if (block.description)
  {
    html.push(`<p class='flex-grow p-2'>${block.description}</p>`)
  }
  html.push(`<div style='display: flex;resize: horizontal; border: 1px solid black;'> `)
  html.push(`<table x-data='blocks["${token}"]'>`)

  //html.push(`<template x-for='(input, key) in block.inputs'><tr><td>input.title||key</td><td><input type="text" placeholder="input.placeholder||input.default}" /></td></tr>`)

  html.push(`</table>
  <div class='flex-grow p-2' x-text='__result'>Output</div>`)
  html.push(`<button class='m-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow' @click="block.run()">Run</button>`)

  html.push(`</div>`)

  html.push(`</div>`)

  return html.join('')
  }
  return `<div>Block ${token} not found</div>`

});
*/
const createContent = function () {

  return  {
    html: '',
    markdown:'',
    async init()
    {
      if (this.html.length == 0)
      {

        this.html = await parseContent()
      }
    }
  }
}

const run_button = function(button)
{
}

const runAction = async function(button)
{

 const action = button.getAttribute('data-action')


  if (action && action !== 'undefined')
  {


    let args = Object.keys(uiData.inputs).reduce((acc, key) => {
      acc[key] = uiData.inputs[key].value
      return acc
    }, {})



    const payload:any = {
      action: 'run',
      script: action,
      args: args
    }
    if (sdk.args.recipe)  payload.recipe = { id: sdk.args.recipe.id, version: sdk.args.recipe.version }
    if (sdk.args.block)  payload.block = { id: sdk.args.block.name}
    this.busy = true
    const result = await sdk.runExtensionScript('ui',  payload)
    this.busy = false

  }
}

window.Alpine = Alpine
document.addEventListener('alpine:init', async () => {
  Alpine.data('appState', () => ({
    createContent,
    sendToChat,
    run_button,
    runAction,
    busy: false,
    data,
    uiData,
    showToolbar,
    blocks: blocks,
    async copyToClipboard() {
      return {
        copyText: '',
        copyNotification: false,


        async copyToClipboard() {

          await navigator.clipboard.writeText(this.markdown);
          //alert('Item copied to clipboard');
          //navigator.clipboard.writeText(this.copyText);
          this.copyNotification = true;
          let that = this;
          setTimeout(function () {
            that.copyNotification = false;
          }, 3000);
        },
      };
    }
  }
  ))

}
)




Alpine.start()




export default {}