import Handlebars, { HelperDelegate } from 'handlebars';
import Alpine from 'alpinejs';
import './style.scss';

import {MarkdownEngine} from './MarkdownEngine';


declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

// -------------------- Viewer Mode: If q.focusedItem is set, we hide the gallery and show the item full screen -----------------------
const args = new URLSearchParams(location.search);
const params = JSON.parse(args.get('q'));
const opts = JSON.parse(args.get('o')|| "{}" );
const showToolbar = !opts.hideToolbar;

class OmniResourceWrapper
{

  static isPlaceholder(obj:any)
  {
    return obj?.onclick != null
  }

  static isAudio(obj:any)
  {
    return obj && !OmniResourceWrapper.isPlaceholder(obj) && obj?.mimeType?.startsWith('audio/') || obj.mimeType == 'application/ogg'
  }

  static isImage(obj:any)
  {
    return obj && !OmniResourceWrapper.isPlaceholder(obj) &&  obj?.mimeType?.startsWith('image/')
  }

  static isDocument(obj:any)
  {
    return obj && !OmniResourceWrapper.isPlaceholder(obj) &&  (obj?.mimeType?.startsWith('text/') || obj?.mimeType?.startsWith('application/pdf'))
  }


}


const runExtensionScript = async (scriptName: string, payload: any) => {
  const response = await fetch(
    '/api/v1/mercenaries/runscript/omni-core-viewers:' + scriptName,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );
  console.log('runExtensionScript response', response);
  const data = await response.json();
  console.log(scriptName, data);
  return data;
};


let data = Alpine.reactive({
  file: null,
})
const  parseContent = async ()=>
{

  const args = new URLSearchParams(location.search)

  const params = JSON.parse(args.get('q'))
  if (params)
  {
    let rawText = ''
    if (params.file && params.file.fid)
    {
      data.file = params.file
      let x = await fetch('/fid/'+params.file.fid)
      rawText = await x.text()
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
        rawText = params.markdown
    }
    else if (params.text)
    {
        rawText = params.text
    }
/*
    const renderer = new marked.Renderer();
      renderer.link = function(href, title, text) {
          const link = marked.Renderer.prototype.link.apply(this, arguments);
          return link.replace("<a","<a target='_blank'");
      };

    marked.setOptions({headerIds: false, mangle: false, renderer: renderer})
    const sanitized = insane(marked.parse( rawText || 'No content'))
    const final = (params.mdx === true) ? processMdx(sanitized) : sanitized
*/
    return  rawText
  }

  return ''
}

const sendToChat = async (img) => {

  if (Array.isArray(img)) {

    let obj = {}

    img.forEach(o => {

      let type
      if (OmniResourceWrapper.isAudio(o))
      {
        type='audio'
      }
      else if (OmniResourceWrapper.isImage(o))
      {
        type = 'images'
      }
      else if (OmniResourceWrapper.isDocument(o))
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

  if (OmniResourceWrapper.isAudio(img))
  {
    type = 'audio'
  }
  else if (OmniResourceWrapper.isImage(img))
  {
    type = 'images'
  }
  else if (OmniResourceWrapper.isDocument(img))
  {
    type = 'documents'

  }
    let obj = {}
    obj[type] =  [{ ...img }]

    //@ts-expect-error
    window.parent.client.sendSystemMessage(``, 'text/markdown', {
      ...obj, commands: [
        { 'id': 'run', title: '🞂 Run', args: [null, { ...img }] }]
    }, ['no-picture'])
  }
}




const copyToClipboardComponent = () => {
  return {
    copyText: '',
    copyNotification: false,

    async copyToClipboard(item) {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const data = [new ClipboardItem({ [blob.type]: blob })];
      await navigator.clipboard.write(data);
      //alert('Item copied to clipboard');
      //navigator.clipboard.writeText(this.copyText);
      this.copyNotification = true;
      let that = this;
      setTimeout(function () {
        that.copyNotification = false;
      }, 3000);
    },
  };
};

window.Alpine = Alpine;

window.Alpine = Alpine;

document.addEventListener('alpine:init', async () => {
  Alpine.data('appState', () => ({
    copyToClipboardComponent,
  }));


});



const markdownEngine = new MarkdownEngine()


markdownEngine.registerAsyncResolver("BLOCK", async (token) => {
  //@ts-expect-error
  return await window.parent.client.blocks.getInstance(token)

});

markdownEngine.registerToken('BUTTON', function(text: string, action: string, options: any) {
  return new Handlebars.SafeString(`<button class='m-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow' data-action="${action}"  @click="run_button(this)">${text}</button>`)
});

markdownEngine.registerToken('START_BUTTON', function(text: string, action: string, options: any) {
  return new Handlebars.SafeString(`<button class='m-1 bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow' data-action="${action}"  @click="window.parent.client.runScript('run')">Start!</button>`)
});





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
    async init()
    {
      if (this.html.length == 0)
      {
        this.html = markdownEngine.render(await parseContent())
      }
    }
  }
}

const run_button = function(button)
{
  alert("ya")
}

window.Alpine = Alpine
document.addEventListener('alpine:init', async () => {
  Alpine.data('appState', () => ({
    copyToClipboardComponent,
    createContent,
    sendToChat,
    run_button,
    data,
    showToolbar,
    blocks: blocks
  }
  ))

}
)




Alpine.start()




export default {}