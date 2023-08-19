import Alpine from 'alpinejs';
import './style.scss';
import { createContext } from 'vm';
import insane from './insane.min.mjs'
declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

// -------------------- Viewer Mode: If q.focusedItem is set, we hide the gallery and show the item full screen -----------------------
const args = new URLSearchParams(location.search);
const params = JSON.parse(args.get('q'));
let focusedItem = null;
focusedItem = params?.focusedItem;

const runExtensionScript = async (scriptName: string, payload: any) => {
  const response = await fetch(
    '/api/v1/mercenaries/runscript/omni-core-collectionmanager:' + scriptName,
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


const processMdx = (content) =>
{

  let button = 
  content = content.replace(`{:button/help:}`, `<button class='btn btn-primary' style='width: 40px; height: 20px; color: black; border-color: black;' type='button' onclick='window.parent.client.runScript("help");'>[HELP]</button>`)
  return content
}

const  parseContent = async ()=>
{
  let content = document.getElementById('content')
  const args = new URLSearchParams(location.search)

  const params = JSON.parse(args.get('q'))
  if (params)
  {
    let rawText = ''
    if (params.url)
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

    const renderer = new marked.Renderer();
      renderer.link = function(href, title, text) {
          const link = marked.Renderer.prototype.link.apply(this, arguments);
          return link.replace("<a","<a target='_blank'");
      };

    window.marked.setOptions({targetBlank: true, headerIds: false, mangle: false, renderer: renderer})        
    const sanitized = insane(window.marked.parse( rawText || 'No content'))
    const final = (params.mdx === true) ? processMdx(sanitized) : sanitized
    
    content.innerHTML = final        
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
document.addEventListener('alpine:init', async () => {
  Alpine.data('appState', () => ({
    copyToClipboardComponent,

  }));
});

Alpine.start();

export default {};
