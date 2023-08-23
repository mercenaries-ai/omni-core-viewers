import Handlebars, { HelperDelegate } from 'handlebars';
import {marked} from 'marked';
import insane from './insane.min.mjs'


const mdRenderer = new marked.Renderer();
mdRenderer.link = function(href, title, text) {
        const link = marked.Renderer.prototype.link.apply(this, arguments);
        return link.replace("<a","<a target='_blank'");
    };

class MarkdownEngine {
    handlebars: typeof Handlebars
    private asyncResolvers: { [directive: string]: (token: string) => Promise<any> } = {};


    constructor() {
        // Initialize Handlebars
        this.handlebars = Handlebars.create();
    }

    registerAsyncResolver(directive: string, resolverFunction: (token: string) => Promise<any>) {
        this.asyncResolvers[directive] = resolverFunction;
    }

    get directiveRegex(): RegExp {
        const directives = Object.keys(this.asyncResolvers).join('|');
        return new RegExp(`{{(${directives}) "(.+?)"}}`, 'g');
    }


    /**
     * Register a custom token and its resolver.
     * @param tokenName - The name of the token (e.g. "BUTTON")
     * @param resolver - The function that resolves the token to HTML
     */
    registerToken(tokenName: string, resolver: HelperDelegate) {
        this.handlebars.registerHelper(tokenName, resolver);
    }

    async getAsyncDataForDirective(directive: string, token: string): Promise<any> {
        const resolver = await this.asyncResolvers[directive];
        if (!resolver) {
            throw new Error(`No resolver registered for directive: ${directive}`);
        }
        return await resolver(token);
    }

    async preprocessData(markdownContent: string): Promise<{ content: string, data: any }> {
        let processedContent = markdownContent;
        let data: any = {};

        let match;
        for (const match of markdownContent.matchAll(this.directiveRegex)) {
            const directive = match[1];
            const token = match[2];


            // Fetch data for the directive & token asynchronously
            const tokenData = await this.getAsyncDataForDirective(directive, token);
            data[token] = tokenData;

            // Optionally replace the token with a placeholder or keep as is.
        }

        return { content: processedContent, data };
    }





    async render(markdownContent: string): Promise<string> {

        debugger;
        const md = marked.parse(markdownContent,{renderer:mdRenderer})
        const { content, data } = await this.preprocessData(md);
        const replacedContent = this.handlebars.compile(content)(data);

        const ret  =replacedContent
        return ret
    }

}


export {MarkdownEngine}