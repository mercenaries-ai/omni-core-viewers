function createScript()
{
  return {
    description: "Show help on a block",
    title: "Show block",
    exec(args){

      if (args.length == 0)
      {
        return "usage: blockhelp <blockname>"
      }

      window.client.workbench.showExtension("omni-core-viewers", {page: args[0], repo: 'mercenaries-ai/omni-core-viewers'}, 'wiki.html', {displayMode: 'floating'} );
      return true;
    }
  }
}

