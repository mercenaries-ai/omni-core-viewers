import Handlebars, { HelperDelegate } from 'handlebars';
import Alpine from 'alpinejs';
import './style.scss';
import {OmniSDKClient} from 'omni-sdk';
import {MarkdownEngine} from 'omni-sdk';

const sdk = new OmniSDKClient("omni-core-viewers").init();

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
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
        rawText = result.html
        uiData.inputs = result.inputs
        console.log(Alpine.raw(uiData))
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

    const result = await sdk.runExtensionScript('ui',  payload)

  }
}

window.Alpine = Alpine
document.addEventListener('alpine:init', async () => {
  Alpine.data('appState', () => ({
    createContent,
    sendToChat,
    run_button,
    runAction,
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