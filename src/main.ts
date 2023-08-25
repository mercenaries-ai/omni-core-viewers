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
const recipe = params.recipe


const resolveComponents = async ()=>
{
  const keys = Object.values(recipe.rete.nodes).map((node:any)=>node.name)
  //@ts-expect-error
  return await window.parent.client.blocks.getInstances(keys);
}



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
  inputs: {},
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


const engine = new MarkdownEngine();

const setup = async function()
{

  const components = await resolveComponents()

  engine.registerToken('BUTTON', function(title, action, argsString) {
    // argsString would be like: "["foo", "bar", 42]"

    const args = JSON.parse(argsString|| "[]");
    const safeArgs = JSON.stringify(args).replace(/"/g, '&quot;');
    return new Handlebars.SafeString(`<button @click="runAction('${action}', ${safeArgs})">${title}</button>`);
  });


  engine.registerToken('INPUT', function(index, key, title) {

    const node = Object.values(recipe.rete.nodes).find((n:any)=>n.id == index) as any;

    let component = components.find(c=>c.name ===node.name)

    const inputDetail = component.inputs[key];


    if (!inputDetail) {
        return `<div>Error: Input not found.</div>`;
    }
    const uid = index+ ':' + key

    title = title || inputDetail.title

    let inputElement = '';
    data.inputs??={}
    data.inputs[uid] ??= node.data[key]
    switch (inputDetail.type) {
        case 'string':
            inputElement = `
            <div class="field-row flex flex-wrap w-full mb-2" x-data="{'uid': '${uid}'}">
              <label class="w-full font-semibold" for='in_${inputDetail.name}'>${title}</label>
              <textarea id="in_${inputDetail.name}" class="w-full" type="text" placeholder="${inputDetail.placeholder}" x-model="data.inputs[uid]" ></textarea>
              <span class='w-full flex items-start'>
                <span class='flex-grow'></span>
                <small>${inputDetail.description}</small>
              </span>
            </div>`;
            break;
        // Add other types as needed
        default:
            inputElement = `<div>Unsupported input type: ${inputDetail.type}</div>`;
            break;
    }

    return new Handlebars.SafeString(`
        ${inputElement}
    </div>
    `);
  });

  // Sample markdown content






}

//



const createContent =  function () {

  return  {
    html: '',
    async init()
    {
      if (this.html.length == 0)
      {

        await setup()
        //this.html = await engine.render(await parseContent())
        this.html = await engine.render(recipe.meta.help)
        // markdownEngine.render(await parseContent())
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

  }
  ))

}
)




Alpine.start()




export default {}